"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    APP_NAME: str = "InstaVault"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool | str = True

    # Database
    DATABASE_URL: str = "sqlite:///./instavault.db"

    # Security
    SECRET_KEY: str = "change-this-in-production-to-a-random-secret"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    ALGORITHM: str = "HS256"

    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 500
    MAX_EXTRACTED_SIZE_MB: int = 2000
    MAX_FILE_COUNT: int = 50000

    # Storage
    UPLOAD_DIR: Path = Path("./uploads")
    TEMP_DIR: Path = Path("./temp")
    EXPORT_DIR: Path = Path("./exports")

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Retention
    BACKUP_RETENTION_DAYS: int = 90

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
