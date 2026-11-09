"""Export data endpoints."""

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.db.models import Backup, User
from app.schemas.export import ExportRequest, ExportResponse
from app.services.export_service import ExportService

router = APIRouter()


@router.post("/", response_model=ExportResponse)
def create_export(
    export_in: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate export in CSV, JSON, or XLSX format."""
    backup = (
        db.query(Backup)
        .filter(Backup.id == export_in.backup_id, Backup.user_id == current_user.id)
        .first()
    )
    if not backup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup not found")

    service = ExportService(db)
    return service.generate_export(export_in, current_user.id)


@router.get("/{export_id}/download")
def download_export(
    export_id: str,
    current_user: User = Depends(get_current_user),
):
    """Download the generated export file."""
    # Find matching file by export_id prefix
    files = list(settings.EXPORT_DIR.glob(f"instavault_{export_id}.*"))
    if not files:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export file not found")

    file_path = files[0]
    return FileResponse(
        path=file_path,
        filename=file_path.name,
        media_type="application/octet-stream",
    )

