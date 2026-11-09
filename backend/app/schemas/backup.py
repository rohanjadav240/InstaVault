"""Backup schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class BackupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    processing_mode: str = Field(default="local", pattern=r"^(local|cloud)$")


class BackupResponse(BaseModel):
    id: int
    name: str
    file_name: str
    file_size: int
    processing_mode: str
    status: str
    total_files: int
    processed_files: int
    total_records: int
    errors: int
    warnings: int
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class BackupList(BaseModel):
    backups: list[BackupResponse]
    total: int


class BackupDetail(BackupResponse):
    progress_percent: float = 0.0
    error_messages: list[str] = []


class BackupProgress(BaseModel):
    backup_id: int
    status: str
    total_files: int
    processed_files: int
    total_records: int
    errors: int
    warnings: int
    progress_percent: float = 0.0
