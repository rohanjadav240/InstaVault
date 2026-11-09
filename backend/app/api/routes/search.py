"""Global search endpoint across captions, creators, hashtags, and collections."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.routes.content import _format_item
from app.db.models import Collection, ContentItem, User
from app.schemas.content import ContentItemResponse

router = APIRouter()


@router.get("/", response_model=list[ContentItemResponse])
def search_all(
    q: str = Query(..., min_length=1),
    backup_id: int | None = None,
    content_type: str | None = None,
    creator: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Global search across captions, usernames, hashtags, and URLs."""
    pattern = f"%{q}%"
    query = db.query(ContentItem).filter(
        ContentItem.user_id == current_user.id,
        (
            ContentItem.caption.ilike(pattern)
            | ContentItem.creator_username.ilike(pattern)
            | ContentItem.original_url.ilike(pattern)
            | ContentItem.hashtags.ilike(pattern)
        ),
    )

    if backup_id:
        query = query.filter(ContentItem.backup_id == backup_id)
    if content_type:
        query = query.filter(ContentItem.content_type == content_type)
    if creator:
        query = query.filter(ContentItem.creator_username == creator.lower())

    items = query.order_by(ContentItem.saved_at.desc().nullslast()).limit(100).all()
    return [_format_item(i) for i in items]

