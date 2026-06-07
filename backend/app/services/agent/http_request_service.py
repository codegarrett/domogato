"""SSRF-safe HTTP client for custom agent skills (internal use only)."""
from __future__ import annotations

import ipaddress
import json
import socket
from typing import Any
from urllib.parse import urlparse

import httpx
import structlog

logger = structlog.get_logger()

DEFAULT_TIMEOUT = 15.0
DEFAULT_MAX_BYTES = 65536

_BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def _is_blocked_ip(ip_str: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip_str)
    except ValueError:
        return True
    if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved:
        return True
    for net in _BLOCKED_NETWORKS:
        if addr in net:
            return True
    return False


def _resolve_host_ips(hostname: str) -> list[str]:
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise ValueError(f"Could not resolve host '{hostname}': {exc}") from exc
    return list({info[4][0] for info in infos})


def _host_allowed(hostname: str, allowed_hosts: list[str]) -> bool:
    if not allowed_hosts:
        return True
    host = hostname.lower()
    for pattern in allowed_hosts:
        p = pattern.lower()
        if host == p or host.endswith(f".{p}"):
            return True
    return False


def _validate_url(url: str, allowed_hosts: list[str]) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ("https", "http"):
        raise ValueError("URL must use http or https")
    if not parsed.hostname:
        raise ValueError("URL must include a hostname")
    if not _host_allowed(parsed.hostname, allowed_hosts):
        raise ValueError(f"Host '{parsed.hostname}' is not in allowed_hosts")
    for ip in _resolve_host_ips(parsed.hostname):
        if _is_blocked_ip(ip):
            raise ValueError(f"Host '{parsed.hostname}' resolves to blocked address {ip}")


async def http_request(
    *,
    method: str,
    url: str,
    headers: dict[str, str] | None = None,
    body: str | dict | None = None,
    timeout_seconds: float = DEFAULT_TIMEOUT,
    max_response_bytes: int = DEFAULT_MAX_BYTES,
    allowed_hosts: list[str] | None = None,
) -> dict[str, Any]:
    """Execute an outbound HTTP request with SSRF protections."""
    allowed = allowed_hosts or []
    try:
        _validate_url(url, allowed)
    except ValueError as exc:
        return {"error": str(exc)}

    req_headers = dict(headers or {})
    content: str | bytes | None = None
    if body is not None:
        if isinstance(body, dict):
            content = json.dumps(body)
            req_headers.setdefault("Content-Type", "application/json")
        else:
            content = body

    try:
        async with httpx.AsyncClient(follow_redirects=False, timeout=timeout_seconds) as client:
            response = await client.request(method.upper(), url, headers=req_headers, content=content)
    except httpx.RequestError as exc:
        await logger.awarn("agent_http_request_failed", url=url, error=str(exc))
        return {"error": f"Request failed: {exc}"}

    if 300 <= response.status_code < 400:
        return {"error": f"Redirects not allowed (status {response.status_code})"}

    raw = response.content[: max_response_bytes + 1]
    truncated = len(raw) > max_response_bytes
    if truncated:
        raw = raw[:max_response_bytes]

    text = raw.decode("utf-8", errors="replace")
    parsed_body: Any
    content_type = response.headers.get("content-type", "")
    if "json" in content_type or text.lstrip().startswith(("{", "[")):
        try:
            parsed_body = json.loads(text)
        except json.JSONDecodeError:
            parsed_body = text
    else:
        parsed_body = text

    return {
        "status_code": response.status_code,
        "headers": {
            k: v
            for k, v in response.headers.items()
            if k.lower() in ("content-type", "content-length", "date")
        },
        "body": parsed_body,
        "truncated": truncated,
    }
