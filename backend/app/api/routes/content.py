"""Content items (reels, posts) querying endpoints."""

import json
import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.models import ContentItem, User
from app.schemas.content import ContentItemList, ContentItemResponse

router = APIRouter()


def _format_item(item: ContentItem) -> ContentItemResponse:
    hashtags = []
    if item.hashtags:
        try:
            hashtags = json.loads(item.hashtags)
        except Exception:
            hashtags = []

    return ContentItemResponse(
        id=item.id,
        content_type=item.content_type,
        original_url=item.original_url,
        normalized_url=item.normalized_url,
        shortcode=item.shortcode,
        creator_username=item.creator_username,
        caption=item.caption,
        hashtags=hashtags,
        saved_at=item.saved_at,
        source_file=item.source_file,
        is_duplicate=item.is_duplicate,
        created_at=item.created_at,
    )


@router.get("/", response_model=ContentItemList)
def list_content(
    backup_id: int | None = None,
    content_type: str | None = None,
    creator: str | None = None,
    search: str | None = None,
    is_duplicate: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve paginated and filtered content items."""
    query = db.query(ContentItem).filter(ContentItem.user_id == current_user.id)

    if backup_id:
        query = query.filter(ContentItem.backup_id == backup_id)
    if content_type:
        query = query.filter(ContentItem.content_type == content_type)
    if creator:
        query = query.filter(ContentItem.creator_username == creator.lower())
    if is_duplicate is not None:
        query = query.filter(ContentItem.is_duplicate == is_duplicate)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (ContentItem.caption.ilike(search_pattern))
            | (ContentItem.creator_username.ilike(search_pattern))
            | (ContentItem.original_url.ilike(search_pattern))
        )

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size
    items = query.order_by(ContentItem.saved_at.desc().nullslast()).offset(offset).limit(page_size).all()

    return ContentItemList(
        items=[_format_item(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/reels", response_model=ContentItemList)
def list_reels(
    backup_id: int | None = None,
    creator: str | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Specialized endpoint for saved Reels."""
    return list_content(
        backup_id=backup_id,
        content_type="reel",
        creator=creator,
        search=search,
        page=page,
        page_size=page_size,
        current_user=current_user,
        db=db,
    )


@router.get("/posts", response_model=ContentItemList)
def list_posts(
    backup_id: int | None = None,
    creator: str | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Specialized endpoint for saved Feed posts."""
    return list_content(
        backup_id=backup_id,
        content_type="post",
        creator=creator,
        search=search,
        page=page,
        page_size=page_size,
        current_user=current_user,
        db=db,
    )


@router.get("/{content_id}", response_model=ContentItemResponse)
def get_content_item(
    content_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve an individual content item by ID."""
    item = (
        db.query(ContentItem)
        .filter(ContentItem.id == content_id, ContentItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found")
    return _format_item(item)

