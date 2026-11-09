"""Content item schemas."""

from datetime import datetime

from pydantic import BaseModel


class ContentItemResponse(BaseModel):
    id: int
    content_type: str
    original_url: str | None = None
    normalized_url: str | None = None
    shortcode: str | None = None
    creator_username: str | None = None
    caption: str | None = None
    hashtags: list[str] = []
    saved_at: datetime | None = None
    source_file: str
    is_duplicate: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ContentItemList(BaseModel):
    items: list[ContentItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
