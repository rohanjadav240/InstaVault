"""Collection schemas."""

from datetime import datetime

from pydantic import BaseModel

from app.schemas.content import ContentItemResponse


class CollectionResponse(BaseModel):
    id: int
    name: str
    instagram_id: str | None = None
    item_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CollectionList(BaseModel):
    collections: list[CollectionResponse]
    total: int


class CollectionDetail(CollectionResponse):
    items: list[ContentItemResponse] = []
