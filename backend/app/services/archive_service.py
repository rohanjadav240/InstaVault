"""Archive handling service: safe ZIP extraction, validation, and discovery."""

import os
import shutil
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path

from app.core.config import settings
from app.core.exceptions import ValidationError


@dataclass
class DiscoveredFile:
    relative_path: str
    absolute_path: Path
    file_type: str  # html, json, image, video, other
    file_size: int


@dataclass
class ScanReport:
    total_files: int
    total_uncompressed_bytes: int
    files: list[DiscoveredFile]
    warnings: list[str]


class ArchiveService:
    """Handles ZIP validation, zip-bomb defense, and safe extraction."""

    @staticmethod
    def validate_zip_file(zip_path: Path) -> None:
        """Validate ZIP file structure and protect against zip-bombs."""
        if not zip_path.exists():
            raise ValidationError("Archive file does not exist")

        file_size_mb = zip_path.stat().st_size / (1024 * 1024)
        if file_size_mb > settings.MAX_UPLOAD_SIZE_MB:
            raise ValidationError(
                f"ZIP file size ({file_size_mb:.1f} MB) exceeds maximum allowed ({settings.MAX_UPLOAD_SIZE_MB} MB)"
            )

        if not zipfile.is_zipfile(zip_path):
            raise ValidationError("Provided file is not a valid ZIP archive")

        total_uncompressed = 0
        total_files = 0

        with zipfile.ZipFile(zip_path, "r") as zf:
            infolist = zf.infolist()
            total_files = len(infolist)

            if total_files > settings.MAX_FILE_COUNT:
                raise ValidationError(
                    f"ZIP contains {total_files} files, exceeding limit of {settings.MAX_FILE_COUNT}"
                )

            for info in infolist:
                # Path traversal check
                filename = info.filename
                if filename.startswith("/") or ".." in filename:
                    raise ValidationError(f"Insecure path detected in ZIP: {filename}")

                total_uncompressed += info.file_size
                uncompressed_mb = total_uncompressed / (1024 * 1024)
                if uncompressed_mb > settings.MAX_EXTRACTED_SIZE_MB:
                    raise ValidationError(
                        f"Uncompressed archive ({uncompressed_mb:.1f} MB) exceeds limit ({settings.MAX_EXTRACTED_SIZE_MB} MB)"
                    )

            # Compression ratio check (zip bomb defense)
            compressed_bytes = zip_path.stat().st_size
            if compressed_bytes > 0:
                ratio = total_uncompressed / compressed_bytes
                if ratio > 100 and total_uncompressed > 50 * 1024 * 1024:
                    raise ValidationError("Suspicious compression ratio detected (potential ZIP bomb)")

    @staticmethod
    def extract_safely(zip_path: Path, target_dir: Path) -> ScanReport:
        """Extracts ZIP safely into target directory and returns file inventory."""
        ArchiveService.validate_zip_file(zip_path)
        target_dir.mkdir(parents=True, exist_ok=True)
        canonical_target = target_dir.resolve()

        discovered: list[DiscoveredFile] = []
        warnings: list[str] = []
        total_bytes = 0

        with zipfile.ZipFile(zip_path, "r") as zf:
            for member in zf.infolist():
                if member.is_dir():
                    continue

                # Defensive path resolution
                dest_path = (target_dir / member.filename).resolve()
                try:
                    dest_path.relative_to(canonical_target)
                except ValueError:
                    warnings.append(f"Skipped dangerous path: {member.filename}")
                    continue

                dest_path.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(member) as src, open(dest_path, "wb") as dst:
                    shutil.copyfileobj(src, dst)

                total_bytes += member.file_size

                # Classify type
                lower_name = member.filename.lower()
                if lower_name.endswith((".html", ".htm")):
                    ftype = "html"
                elif lower_name.endswith(".json"):
                    ftype = "json"
                elif lower_name.endswith((".jpg", ".jpeg", ".png", ".gif", ".webp")):
                    ftype = "image"
                elif lower_name.endswith((".mp4", ".mov", ".webm")):
                    ftype = "video"
                else:
                    ftype = "other"

                discovered.append(
                    DiscoveredFile(
                        relative_path=member.filename,
                        absolute_path=dest_path,
                        file_type=ftype,
                        file_size=member.file_size,
                    )
                )

        return ScanReport(
            total_files=len(discovered),
            total_uncompressed_bytes=total_bytes,
            files=discovered,
            warnings=warnings,
        )

    @staticmethod
    def cleanup_directory(path: Path) -> None:
        """Safely removes a temporary directory."""
        if path.exists() and path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
