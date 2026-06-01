"""Strip HTML from user-authored markdown fields before persistence."""
from __future__ import annotations

import html
import re

_HTML_TAG_RE = re.compile(r"<[^>]+>")


def sanitize_markdown(text: str | None) -> str | None:
    """Remove HTML tags; decode entities. Markdown syntax is preserved."""
    if text is None:
        return None
    cleaned = _HTML_TAG_RE.sub("", text)
    return html.unescape(cleaned)
