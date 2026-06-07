"""Tests for SSRF-safe HTTP request service."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.agent.http_request_service import (
    _is_blocked_ip,
    _validate_url,
    http_request,
)


def test_blocked_private_ips():
    assert _is_blocked_ip("127.0.0.1") is True
    assert _is_blocked_ip("10.0.0.1") is True
    assert _is_blocked_ip("192.168.1.1") is True
    assert _is_blocked_ip("169.254.169.254") is True


def test_public_ip_not_blocked():
    assert _is_blocked_ip("8.8.8.8") is False


def test_validate_url_blocks_localhost():
    with pytest.raises(ValueError, match="blocked"):
        _validate_url("https://localhost/api", [])


def test_validate_url_allowed_hosts_enforced():
    with pytest.raises(ValueError, match="not in allowed_hosts"):
        _validate_url("https://evil.example.com/data", ["api.example.com"])


@patch("app.services.agent.http_request_service._resolve_host_ips", return_value=["8.8.8.8"])
def test_validate_url_passes_for_public_host(_mock_resolve):
    _validate_url("https://api.example.com/data", ["api.example.com"])


@pytest.mark.asyncio
@patch("app.services.agent.http_request_service._validate_url")
async def test_http_request_returns_error_on_validation_failure(mock_validate):
    mock_validate.side_effect = ValueError("blocked host")
    result = await http_request(method="GET", url="https://bad.example.com/")
    assert result == {"error": "blocked host"}


@pytest.mark.asyncio
@patch("app.services.agent.http_request_service.httpx.AsyncClient")
@patch("app.services.agent.http_request_service._validate_url")
async def test_http_request_success(mock_validate, mock_client_cls):
    mock_validate.return_value = None
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b'{"ok": true}'
    mock_response.headers = {"content-type": "application/json"}

    mock_client = AsyncMock()
    mock_client.request = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client_cls.return_value = mock_client

    result = await http_request(method="GET", url="https://api.example.com/data")
    assert result["status_code"] == 200
    assert result["body"] == {"ok": True}
    assert result["truncated"] is False
