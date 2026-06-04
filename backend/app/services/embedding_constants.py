"""Constants for embedding categories and embeddable file types."""
from __future__ import annotations

SYSTEM_KB = "knowledge_base"
SYSTEM_DOCUMENTS = "documents"

SYSTEM_CATEGORY_SLUGS = frozenset({SYSTEM_KB, SYSTEM_DOCUMENTS})

SYSTEM_CATEGORIES = (
    (SYSTEM_KB, "Knowledge Base", "KB pages and attachments"),
    (SYSTEM_DOCUMENTS, "Documents", "Ticket attachments and uploaded documents"),
)

CONTENT_KB_PAGE = "kb_page"
CONTENT_KB_ATTACHMENT = "kb_attachment"
CONTENT_TICKET_ATTACHMENT = "ticket_attachment"
CONTENT_EMBEDDING_DOCUMENT = "embedding_document"

KB_CONTENT_TYPES = frozenset({CONTENT_KB_PAGE, CONTENT_KB_ATTACHMENT})
DOCUMENT_CONTENT_TYPES = frozenset({
    CONTENT_TICKET_ATTACHMENT,
    CONTENT_EMBEDDING_DOCUMENT,
})

# Text-extractable MIME types eligible for embedding (subset of upload-allowed types).
EMBEDDABLE_MIME_TYPES = frozenset({
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "text/markdown",
    "application/json",
})

EMBEDDABLE_EXTENSIONS = frozenset({
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".csv", ".md", ".json",
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rs",
    ".rb", ".sh", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".sql",
})


def is_embeddable_file(content_type: str, filename: str) -> bool:
    ct = (content_type or "").lower().strip()
    if ct in EMBEDDABLE_MIME_TYPES or ct.startswith("text/"):
        return True
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in EMBEDDABLE_EXTENSIONS
