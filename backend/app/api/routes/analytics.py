"""Analytics API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.models import Backup, User
from app.schemas.analytics import AnalyticsResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/{backup_id}", response_model=AnalyticsResponse)
def get_analytics(
    backup_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve complete analytics and chart distributions for a backup."""
    backup = (
        db.query(Backup)
        .filter(Backup.id == backup_id, Backup.user_id == current_user.id)
        .first()
    )
    if not backup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup not found")

    service = AnalyticsService(db)
    return service.get_analytics(backup_id)

