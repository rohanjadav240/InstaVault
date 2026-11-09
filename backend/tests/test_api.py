"""Integration tests for FastAPI endpoints."""

import io
from fastapi.testclient import TestClient
from app.main import app
from tests.fixtures.sample_backup import create_synthetic_instagram_backup


def test_health_check():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["app"] == "InstaVault"


def test_full_user_and_backup_lifecycle():
    with TestClient(app) as client:
        # 1. Register
        email = "tester@instavault.com"
        username = "tester_user"
        password = "SuperPassword123!"

        reg_res = client.post(
            "/api/auth/register",
            json={"email": email, "username": username, "password": password},
        )
        assert reg_res.status_code in (201, 400)  # 400 if user exists from prior run

        # 2. Login
        login_res = client.post(
            "/api/auth/login",
            data={"username": email, "password": password},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Get /me
        me_res = client.get("/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["username"] == username

        # 4. Upload synthetic backup
        zip_bytes = create_synthetic_instagram_backup()
        upload_res = client.post(
            "/api/backups/upload",
            headers=headers,
            files={"file": ("instagram_export_test.zip", io.BytesIO(zip_bytes), "application/zip")},
        )
        assert upload_res.status_code == 202
        backup_data = upload_res.json()
        backup_id = backup_data["id"]
        assert backup_id > 0

        # Process synchronously for test
        from app.db.database import SessionLocal
        from app.services.processing_service import ProcessingService
        from app.core.config import settings

        db = SessionLocal()
        try:
            # Locate saved file
            files = list(settings.UPLOAD_DIR.glob(f"*instagram_export_test.zip"))
            if files:
                svc = ProcessingService(db)
                svc.process_backup(backup_id, files[0])
        finally:
            db.close()

        # 5. Verify Backup status
        b_res = client.get(f"/api/backups/{backup_id}", headers=headers)
        assert b_res.status_code == 200
        assert b_res.json()["status"] == "completed"
        assert b_res.json()["total_records"] > 0

        # 6. Query Content Items
        content_res = client.get(f"/api/content/?backup_id={backup_id}", headers=headers)
        assert content_res.status_code == 200
        items = content_res.json()["items"]
        assert len(items) > 0

        # 7. Query Reels
        reels_res = client.get(f"/api/content/reels?backup_id={backup_id}", headers=headers)
        assert reels_res.status_code == 200
        reels = reels_res.json()["items"]
        assert any(r["content_type"] == "reel" for r in reels)

        # 8. Query Collections
        col_res = client.get(f"/api/collections/?backup_id={backup_id}", headers=headers)
        assert col_res.status_code == 200
        cols = col_res.json()["collections"]
        assert len(cols) > 0

        # 9. Query Analytics
        analytics_res = client.get(f"/api/analytics/{backup_id}", headers=headers)
        assert analytics_res.status_code == 200
        a_data = analytics_res.json()
        assert a_data["dashboard"]["total_content"] > 0

        # 10. Generate CSV Export
        exp_res = client.post(
            "/api/export/",
            headers=headers,
            json={"backup_id": backup_id, "format": "csv"},
        )
        assert exp_res.status_code == 200
        export_id = exp_res.json()["id"]

        # 11. Download Export
        dl_res = client.get(f"/api/export/{export_id}/download", headers=headers)
        assert dl_res.status_code == 200
        assert "Type,Creator" in dl_res.text
