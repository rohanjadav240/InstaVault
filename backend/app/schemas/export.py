"""Export schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class ExportRequest(BaseModel):
    backup_id: int
    format: str = Field(default="csv", pattern=r"^(csv|json|xlsx)$")
    content_types: list[str] = []  # empty = all
    collection_ids: list[int] = []
    creator_usernames: list[str] = []
    include_duplicates: bool = False


class ExportResponse(BaseModel):
    id: str
    file_name: str
    file_size: int = 0
    format: str
    status: str = "ready"
    created_at: datetime
    download_url: str = ""
