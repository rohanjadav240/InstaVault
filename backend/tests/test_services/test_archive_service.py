"""Tests for ZIP archive security, path traversal defense, and extraction."""

import io
import tempfile
import zipfile
from pathlib import Path
import pytest

from app.core.exceptions import ArchiveValidationError
from app.services.archive_service import ArchiveService
from tests.fixtures.sample_backup import create_synthetic_instagram_backup


def test_valid_archive_extraction():
    data = create_synthetic_instagram_backup()
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tf:
        tf.write(data)
        zip_path = Path(tf.name)

    target_dir = zip_path.parent / f"test_extract_{zip_path.stem}"
    try:
        report = ArchiveService.extract_safely(zip_path, target_dir)
        assert report.total_files > 0
        assert any(f.file_type == "json" for f in report.files)
        assert any(f.file_type == "html" for f in report.files)
    finally:
        zip_path.unlink(missing_ok=True)
        ArchiveService.cleanup_directory(target_dir)


def test_path_traversal_detection():
    # Construct malicious zip with ../ traversal
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("../../etc/passwd", "root:x:0:0:::")
    data = buf.getvalue()

    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tf:
        tf.write(data)
        zip_path = Path(tf.name)

    try:
        with pytest.raises(ArchiveValidationError):
            ArchiveService.validate_zip_file(zip_path)
    finally:
        zip_path.unlink(missing_ok=True)
