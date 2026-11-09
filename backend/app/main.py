"""FastAPI application entrypoint for InstaVault."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    analytics,
    auth,
    backups,
    collections,
    content,
    creators,
    export,
    search,
    social,
)
from app.core.config import settings
from app.db.database import create_tables


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="InstaVault – Instagram Backup Explorer API",
)

@app.on_event("startup")
def startup_event():
    """Application startup initialization."""
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)
    settings.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    create_tables()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(backups.router, prefix="/api/backups", tags=["Backups"])
app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(collections.router, prefix="/api/collections", tags=["Collections"])
app.include_router(creators.router, prefix="/api/creators", tags=["Creators"])
app.include_router(social.router, prefix="/api/social", tags=["Social"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(export.router, prefix="/api/export", tags=["Exports"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "mode": "hybrid",
    }
