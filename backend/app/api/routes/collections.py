"""Collections API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.routes.content import _format_item
from app.db.models import Backup, Collection, CollectionItem, ContentItem, User
from app.schemas.collection import CollectionDetail, CollectionList, CollectionResponse

router = APIRouter()


@router.get("/", response_model=CollectionList)
def list_collections(
    backup_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all collections from the user's backups."""
    query = (
        db.query(Collection)
        .join(Backup, Collection.backup_id == Backup.id)
        .filter(Backup.user_id == current_user.id)
    )

    if backup_id:
        query = query.filter(Collection.backup_id == backup_id)

    collections = query.order_by(Collection.item_count.desc()).all()
    return CollectionList(collections=collections, total=len(collections))


@router.get("/{collection_id}", response_model=CollectionDetail)
def get_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve collection details along with associated items."""
    col = (
        db.query(Collection)
        .join(Backup, Collection.backup_id == Backup.id)
        .filter(Collection.id == collection_id, Backup.user_id == current_user.id)
        .first()
    )
    if not col:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    items = (
        db.query(ContentItem)
        .join(CollectionItem, ContentItem.id == CollectionItem.content_item_id)
        .filter(CollectionItem.collection_id == collection_id)
        .order_by(CollectionItem.position.asc())
        .all()
    )

    return CollectionDetail(
        id=col.id,
        name=col.name,
        instagram_id=col.instagram_id,
        item_count=col.item_count,
        created_at=col.created_at,
        items=[_format_item(i) for i in items],
    )

