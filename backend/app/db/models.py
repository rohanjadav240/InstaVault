"""SQLAlchemy ORM models for InstaVault."""

from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(320), unique=True, index=True, nullable=False)
    username = Column(String(150), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    backups = relationship("Backup", back_populates="user", cascade="all, delete-orphan")
    content_items = relationship("ContentItem", back_populates="user", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Backup
# ---------------------------------------------------------------------------
class Backup(Base):
    __tablename__ = "backups"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    file_name = Column(String(512), nullable=False)
    file_size = Column(BigInteger, nullable=False, default=0)
    processing_mode = Column(String(20), nullable=False, default="local")  # local / cloud
    status = Column(String(20), nullable=False, default="pending")  # pending/processing/completed/failed/cancelled
    total_files = Column(Integer, default=0, nullable=False)
    processed_files = Column(Integer, default=0, nullable=False)
    total_records = Column(Integer, default=0, nullable=False)
    errors = Column(Integer, default=0, nullable=False)
    warnings = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="backups")
    files = relationship("BackupFile", back_populates="backup", cascade="all, delete-orphan")
    content_items = relationship("ContentItem", back_populates="backup", cascade="all, delete-orphan")
    collections = relationship("Collection", back_populates="backup", cascade="all, delete-orphan")
    creators = relationship("Creator", back_populates="backup", cascade="all, delete-orphan")
    social_connections = relationship("SocialConnection", back_populates="backup", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="backup", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="backup", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="backup", cascade="all, delete-orphan")
    stories = relationship("Story", back_populates="backup", cascade="all, delete-orphan")
    processing_jobs = relationship("ProcessingJob", back_populates="backup", cascade="all, delete-orphan")
    processing_errors = relationship("ProcessingError", back_populates="backup", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# BackupFile
# ---------------------------------------------------------------------------
class BackupFile(Base):
    __tablename__ = "backup_files"

    id = Column(Integer, primary_key=True, index=True)
    backup_id = Column(Integer, ForeignKey("backups.id", ondelete="CASCADE"), index=True, nullable=False)
    file_path = Column(String(1024), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(BigInteger, default=0, nullable=False)
    category = Column(String(100), nullable=True)
    confidence = Column(Float, default=0.0, nullable=False)
    processed = Column(Boolean, default=False, nullable=False)
    error_message = Column(Text, nullable=True)

    backup = relationship("Backup", back_populates="files")


# ---------------------------------------------------------------------------
# ContentItem
# ---------------------------------------------------------------------------
class ContentItem(Base):
    __tablename__ = "content_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    backup_id = Column(Integer, ForeignKey("backups.id", ondelete="CASCADE"), index=True, nullable=False)
    content_type = Column(String(20), index=True, nullable=False, default="unknown")
    original_url = Column(Text, nullable=True)
    normalized_url = Column(Text, index=True, nullable=True)
    shortcode = Column(String(50), index=True, nullable=True)
    creator_username = Column(String(150), index=True, nullable=True)
    caption = Column(Text, nullable=True)
    hashtags = Column(Text, nullable=True)  # JSON array string
    saved_at = Column(DateTime(timezone=True), nullable=True)
    media_path = Column(String(1024), nullable=True)
    source_file = Column(String(1024), nullable=False)
    metadata_json = Column(Text, nullable=True)
    is_duplicate = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user = relationship("User", back_populates="content_items")
    backup = relationship("Backup", back_populates="content_items")
    collection_items = relationship("CollectionItem", back_populates="content_item", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Collection
# ---------------------------------------------------------------------------
class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    backup_id = Column(Integer, ForeignKey("backups.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    instagram_id = Column(String(100), nullable=True)
    item_count = Column(Integer, default=0, nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    backup = relationship("Backup", back_populates="collections")
    items = relationship("CollectionItem", back_populates="collection", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# CollectionItem
# ---------------------------------------------------------------------------
class CollectionItem(Base):
    __tablename__ = "collection_items"
    __table_args__ = (
        UniqueConstraint("collection_id", "content_item_id", name="uq_collection_content"),
    )

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), index=True, nullable=False)
    content_item_id = Column(Integer, ForeignKey("content_items.id", ondelete="CASCADE"), index=True, nullable=False)
    position = Column(Integer, nullable=True)

    collection = relationship("Collection", back_populates="items")
    content_item = relationship("ContentItem", back_populates="collection_items")


# ---------------------------------------------------------------------------
# Creator
# ---------------------------------------------------------------------------
class Creator(Base):
    __tablename__ = "creators"

    id = Column(Integer, primary_key=True, index=True)
    backup_id = Column(Integer, ForeignKey("backups.id", ondelete="CASCADE"), index=True, nullable=False)
    username = Column(String(150), index=True, nullable=False)
    profile_url = Column(String(512), nullable=True)
    reel_count = Column(Integer, default=0, nullable=False)
    post_count = Column(Integer, default=0, nullable=False)
    total_content = Column(Integer, default=0, nullable=False)

    backup = relationship("Backup", back_populates="creators")

    __table_args__ = (
        Index("ix_creators_backup_username", "backup_id", "username"),
    )


# ---------------------------------------------------------------------------
# SocialConnection
# ---------------------------------------------------------------------------
class SocialConnection(Base):
    __tablename__ = "social_connections"

    id = Column(Integer, primary_key=True, index=True)
    backup_id = Column(Integer, ForeignKey("backups.id", ondelete="CASCADE"), index=True, nullable=False)
    connection_type = Column(String(20), nullable=False)  # follower / following
    username = Column(String(150), index=True, nullable=False)
    profile_url = Column(String(512), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=True)
    source_file = Column(String(1024), nullable=False)

    backup = relationship("Backup", back_populates="social_connections")


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------
class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    backup_id = Column(Integer, ForeignKey("backups.id", ondelete="CASCADE"), index=True, nullable=False)
    text = Column(Text, nullable=True)
    target_user = Column(String(150), nullable=True)
    target_url = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=True)
    source_file = Column(String(1024), nullable=False)

    backup = relationship("Backup", back_populates="comments")


# ---------------------------------------------------------------------------
# Like
# ---------------------------------------------------------------------------
class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    backup_id = Column(Integer, ForeignKey("backups.id", ondelete="CASCADE"), index=True, nullable=False)
    like_type = Column(String(30), nullable=True)  # post / comment / story
    target_user = Column(String(150), nullable=True)
    target_url = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=True)
    source_file = Column(String(1024), nullable=False)

    backup = relationship("Backup", back_populates="likes")


# ---------------------------------------------------------------------------
# Message
# ---------------------------------------------------------------------------
class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    backup_id = Column(Integer, ForeignKey("backups.id", ondelete="CASCADE"), index=True, nullable=False)
    thread_title = Column(String(512), nullable=True)
    participants = Column(Text, nullable=True)  # JSON array string
    sender_username = Column(String(150), nullable=True)
    content = Column(Text, nullable=True)
    content_type = Column(String(50), nullable=True)  # text / media / link / audio
    timestamp = Column(DateTime(timezone=True), nullable=True)
    source_file = Column(String(1024), nullable=False)
    is_encrypted = Column(Boolean, default=False, nullable=False)

    backup = relationship("Backup", back_populates="messages")


# ---------------------------------------------------------------------------
# Story
# ---------------------------------------------------------------------------
class Story(Base):
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True, index=True)
    backup_id = Column(Integer, ForeignKey("backups.id", ondelete="CASCADE"), index=True, nullable=False)
    media_path = Column(String(1024), nullable=True)
    media_type = Column(String(30), nullable=True)  # image / video
    caption = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=True)
    source_file = Column(String(1024), nullable=False)

    backup = relationship("Backup", back_populates="stories")


# ---------------------------------------------------------------------------
# ProcessingJob
# ---------------------------------------------------------------------------
class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    backup_id = Column(Integer, ForeignKey("backups.id", ondelete="CASCADE"), index=True, nullable=False)
    stage = Column(String(50), nullable=False)  # extraction/parsing/cleaning/classification/analytics
    status = Column(String(20), nullable=False, default="pending")
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)

    backup = relationship("Backup", back_populates="processing_jobs")


# ---------------------------------------------------------------------------
# ProcessingError
# ---------------------------------------------------------------------------
class ProcessingError(Base):
    __tablename__ = "processing_errors"

    id = Column(Integer, primary_key=True, index=True)
    backup_id = Column(Integer, ForeignKey("backups.id", ondelete="CASCADE"), index=True, nullable=False)
    stage = Column(String(50), nullable=False)
    file_path = Column(String(1024), nullable=True)
    error_type = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False, default="error")  # warning / error / critical
    timestamp = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    backup = relationship("Backup", back_populates="processing_errors")
