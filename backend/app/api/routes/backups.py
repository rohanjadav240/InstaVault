"""Backups management endpoints."""

import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.db.models import Backup, ProcessingJob, User
from app.schemas.backup import BackupDetail, BackupList, BackupProgress, BackupResponse
from app.services.processing_service import ProcessingService

router = APIRouter()


def _run_processing_task(backup_id: int, zip_path: Path):
    """Background task to process the uploaded archive with isolated DB session."""
    from app.db.database import SessionLocal

    db = SessionLocal()
    try:
        service = ProcessingService(db)
        service.process_backup(backup_id, zip_path)
    finally:
        db.close()


@router.post("/upload", response_model=BackupResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_backup(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload an Instagram backup ZIP archive and initiate processing."""
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a .zip archive",
        )

    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    dest_path = settings.UPLOAD_DIR / unique_filename

    # Save to disk
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = dest_path.stat().st_size

    backup = Backup(
        user_id=current_user.id,
        name=Path(file.filename).stem,
        file_name=file.filename,
        file_size=file_size,
        processing_mode="cloud",
        status="pending",
    )
    db.add(backup)
    db.commit()
    db.refresh(backup)

    # Queue background processing
    background_tasks.add_task(_run_processing_task, backup.id, dest_path)

    return backup


@router.get("/", response_model=BackupList)
def list_backups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all backups belonging to the authenticated user."""
    backups = (
        db.query(Backup)
        .filter(Backup.user_id == current_user.id)
        .order_by(Backup.created_at.desc())
        .all()
    )
    return BackupList(backups=backups, total=len(backups))


@router.get("/{backup_id}", response_model=BackupDetail)
def get_backup(
    backup_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve detailed information about a specific backup."""
    backup = (
        db.query(Backup)
        .filter(Backup.id == backup_id, Backup.user_id == current_user.id)
        .first()
    )
    if not backup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup not found")

    job = (
        db.query(ProcessingJob)
        .filter(ProcessingJob.backup_id == backup_id)
        .order_by(ProcessingJob.id.desc())
        .first()
    )
    progress_pct = 100.0 if backup.status == "completed" else 50.0 if backup.status == "processing" else 0.0

    return BackupDetail(
        id=backup.id,
        name=backup.name,
        file_name=backup.file_name,
        file_size=backup.file_size,
        processing_mode=backup.processing_mode,
        status=backup.status,
        total_files=backup.total_files,
        processed_files=backup.processed_files,
        total_records=backup.total_records,
        errors=backup.errors,
        warnings=backup.warnings,
        created_at=backup.created_at,
        completed_at=backup.completed_at,
        progress_percent=progress_pct,
        error_messages=[job.error_message] if job and job.error_message else [],
    )


@router.get("/{backup_id}/progress", response_model=BackupProgress)
def get_backup_progress(
    backup_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Poll processing progress for a backup."""
    backup = (
        db.query(Backup)
        .filter(Backup.id == backup_id, Backup.user_id == current_user.id)
        .first()
    )
    if not backup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup not found")

    progress_pct = 0.0
    if backup.total_files > 0:
        progress_pct = min(100.0, (backup.processed_files / backup.total_files) * 100.0)
    elif backup.status == "completed":
        progress_pct = 100.0

    return BackupProgress(
        backup_id=backup.id,
        status=backup.status,
        total_files=backup.total_files,
        processed_files=backup.processed_files,
        total_records=backup.total_records,
        errors=backup.errors,
        warnings=backup.warnings,
        progress_percent=round(progress_pct, 1),
    )


@router.delete("/{backup_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_backup(
    backup_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a backup and all associated extracted data."""
    backup = (
        db.query(Backup)
        .filter(Backup.id == backup_id, Backup.user_id == current_user.id)
        .first()
    )
    if not backup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup not found")

    db.delete(backup)
    db.commit()
    return None

