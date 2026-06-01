from app.utils.markdown_sanitize import sanitize_markdown


def test_sanitize_markdown_strips_tags():
    assert sanitize_markdown("<p>Hello <b>world</b></p>") == "Hello world"


def test_sanitize_markdown_preserves_markdown():
    assert sanitize_markdown("## Title\n\n**bold**") == "## Title\n\n**bold**"


def test_sanitize_markdown_none():
    assert sanitize_markdown(None) is None
