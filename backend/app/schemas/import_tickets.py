from __future__ import annotations

from pydantic import BaseModel, Field


class ImportAnalyzeRequest(BaseModel):
    content: str = Field(..., max_length=10_000_000)
    format: str = Field("csv", pattern=r"^(csv|json)$")


class ColumnMapping(BaseModel):
    source_column: str
    target_field: str | None = None


class ImportAnalyzeResponse(BaseModel):
    import_session_id: str
    format: str
    total_rows: int
    columns: list[str]
    suggested_mappings: list[ColumnMapping]
    unmapped_columns: list[str]
    sample_rows: list[dict]
    unique_values: dict[str, list[str]]


class ValueMapping(BaseModel):
    source_value: str
    target_value: str | None = None


class ImportOptions(BaseModel):
    create_labels: bool = True
    create_sprints: bool = False
    skip_resolved: bool = False


class ImportExecuteRequest(BaseModel):
    import_session_id: str
    column_mappings: list[ColumnMapping]
    value_mappings: dict[str, list[ValueMapping]] = Field(default_factory=dict)
    options: ImportOptions = Field(default_factory=ImportOptions)


class ImportRowError(BaseModel):
    row_number: int
    external_key: str | None = None
    error: str


class ImportResult(BaseModel):
    total_processed: int
    tickets_created: int
    tickets_skipped: int
    labels_created: list[str]
    sprints_created: list[str]
    parent_links_resolved: int
    errors: list[ImportRowError]
