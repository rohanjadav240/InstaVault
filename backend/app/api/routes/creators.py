"""Creator accounts exploration endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.routes.content import _format_item
from app.db.models import Backup, ContentItem, Creator, User
from app.schemas.content import ContentItemResponse

router = APIRouter()


class CreatorResponse(BaseModel):
    id: int
    username: str
    profile_url: str | None
    reel_count: int
    post_count: int
    total_content: int

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[CreatorResponse])
def list_creators(
    backup_id: int | None = None,
    sort_by: str = Query(default="total", pattern=r"^(total|reels|posts)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List creators sorted by total items or reels."""
    query = (
        db.query(Creator)
        .join(Backup, Creator.backup_id == Backup.id)
        .filter(Backup.user_id == current_user.id)
    )

    if backup_id:
        query = query.filter(Creator.backup_id == backup_id)

    if sort_by == "reels":
        query = query.order_by(Creator.reel_count.desc())
    elif sort_by == "posts":
        query = query.order_by(Creator.post_count.desc())
    else:
        query = query.order_by(Creator.total_content.desc())

    return query.limit(100).all()


@router.get("/{username}/content", response_model=list[ContentItemResponse])
def get_creator_content(
    username: str,
    backup_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all content associated with a creator."""
    query = db.query(ContentItem).filter(
        ContentItem.user_id == current_user.id,
        ContentItem.creator_username == username.lower(),
    )
    if backup_id:
        query = query.filter(ContentItem.backup_id == backup_id)

    items = query.order_by(ContentItem.saved_at.desc().nullslast()).all()
    return [_format_item(i) for i in items]

