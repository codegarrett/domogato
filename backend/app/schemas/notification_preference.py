from __future__ import annotations

from pydantic import BaseModel, Field


class NotificationPrefRead(BaseModel):
    event_category: str
    in_app: bool = True
    email: bool = True
    email_delivery: str = "digest"

    model_config = {"from_attributes": True}


class NotificationPrefUpdate(BaseModel):
    event_category: str
    in_app: bool = True
    email: bool = True
    email_delivery: str = Field("digest", pattern=r"^(instant|digest)$")
