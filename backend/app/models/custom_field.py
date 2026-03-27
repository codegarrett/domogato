from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CustomFieldDefinition(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "custom_field_definitions"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    field_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    position: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    validation_rules: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )

    options: Mapped[list[CustomFieldOption]] = relationship(
        back_populates="field_definition",
        cascade="all, delete-orphan",
        order_by="CustomFieldOption.position",
    )


class CustomFieldOption(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "custom_field_options"

    field_definition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("custom_field_definitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    position: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )

    field_definition: Mapped[CustomFieldDefinition] = relationship(
        back_populates="options",
    )
