"""Export generation service for cloud mode."""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
import pandas as pd

from app.core.config import settings
from app.db.models import ContentItem
from app.schemas.export import ExportRequest, ExportResponse


class ExportService:
    """Generates downloadable CSV, JSON, and XLSX files."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def generate_export(self, request: ExportRequest, user_id: int) -> ExportResponse:
        query = self.db.query(ContentItem).filter(
            ContentItem.backup_id == request.backup_id,
            ContentItem.user_id == user_id,
        )

        if request.content_types:
            query = query.filter(ContentItem.content_type.in_(request.content_types))

        if request.creator_usernames:
            query = query.filter(ContentItem.creator_username.in_(request.creator_usernames))

        if not request.include_duplicates:
            query = query.filter(ContentItem.is_duplicate.is_(False))

        items = query.all()

        records = [
            {
                "Type": item.content_type,
                "Creator": item.creator_username or "",
                "Original_URL": item.original_url or "",
                "Normalized_URL": item.normalized_url or "",
                "Shortcode": item.shortcode or "",
                "Caption": item.caption or "",
                "Hashtags": " ".join(json.loads(item.hashtags)) if item.hashtags else "",
                "Saved_At": item.saved_at.isoformat() if item.saved_at else "",
                "Is_Duplicate": "Yes" if item.is_duplicate else "No",
                "Source_File": item.source_file,
            }
            for item in items
        ]

        export_id = str(uuid.uuid4())
        settings.EXPORT_DIR.mkdir(parents=True, exist_ok=True)

        if request.format == "csv":
            filename = f"instavault_{export_id}.csv"
            out_path = settings.EXPORT_DIR / filename
            df = pd.DataFrame(records)
            df.to_csv(out_path, index=False, encoding="utf-8")
        elif request.format == "xlsx":
            filename = f"instavault_{export_id}.xlsx"
            out_path = settings.EXPORT_DIR / filename
            df = pd.DataFrame(records)
            df.to_excel(out_path, index=False)
        else:
            filename = f"instavault_{export_id}.json"
            out_path = settings.EXPORT_DIR / filename
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)

        file_size = out_path.stat().st_size

        return ExportResponse(
            id=export_id,
            file_name=filename,
            file_size=file_size,
            format=request.format,
            status="ready",
            created_at=datetime.now(timezone.utc),
            download_url=f"/api/export/{export_id}/download",
        )
