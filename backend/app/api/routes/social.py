"""Social interactions, relationships, and communications endpoints."""

from datetime import datetime
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.models import Backup, Comment, Like, Message, SocialConnection, Story, User

router = APIRouter()


class SocialItemResponse(BaseModel):
    id: int
    connection_type: str
    username: str
    profile_url: str | None
    timestamp: datetime | None

    model_config = {"from_attributes": True}


class CommentResponse(BaseModel):
    id: int
    text: str
    target_user: str | None
    target_url: str | None
    timestamp: datetime | None

    model_config = {"from_attributes": True}


class LikeResponse(BaseModel):
    id: int
    like_type: str
    target_user: str | None
    target_url: str | None
    timestamp: datetime | None

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: int
    thread_title: str | None
    sender_username: str | None
    content: str
    content_type: str
    timestamp: datetime | None

    model_config = {"from_attributes": True}


class StoryResponse(BaseModel):
    id: int
    media_path: str | None
    media_type: str
    caption: str | None
    timestamp: datetime | None

    model_config = {"from_attributes": True}


@router.get("/followers", response_model=list[SocialItemResponse])
def get_followers(
    backup_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(SocialConnection)
        .join(Backup, SocialConnection.backup_id == Backup.id)
        .filter(Backup.user_id == current_user.id, SocialConnection.connection_type == "follower")
    )
    if backup_id:
        query = query.filter(SocialConnection.backup_id == backup_id)
    return query.limit(200).all()


@router.get("/following", response_model=list[SocialItemResponse])
def get_following(
    backup_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(SocialConnection)
        .join(Backup, SocialConnection.backup_id == Backup.id)
        .filter(Backup.user_id == current_user.id, SocialConnection.connection_type == "following")
    )
    if backup_id:
        query = query.filter(SocialConnection.backup_id == backup_id)
    return query.limit(200).all()


@router.get("/likes", response_model=list[LikeResponse])
def get_likes(
    backup_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Like)
        .join(Backup, Like.backup_id == Backup.id)
        .filter(Backup.user_id == current_user.id)
    )
    if backup_id:
        query = query.filter(Like.backup_id == backup_id)
    return query.order_by(Like.timestamp.desc().nullslast()).limit(200).all()


@router.get("/comments", response_model=list[CommentResponse])
def get_comments(
    backup_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Comment)
        .join(Backup, Comment.backup_id == Backup.id)
        .filter(Backup.user_id == current_user.id)
    )
    if backup_id:
        query = query.filter(Comment.backup_id == backup_id)
    return query.order_by(Comment.timestamp.desc().nullslast()).limit(200).all()


@router.get("/messages", response_model=list[MessageResponse])
def get_messages(
    backup_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Message)
        .join(Backup, Message.backup_id == Backup.id)
        .filter(Backup.user_id == current_user.id)
    )
    if backup_id:
        query = query.filter(Message.backup_id == backup_id)
    return query.order_by(Message.timestamp.desc().nullslast()).limit(200).all()


@router.get("/stories", response_model=list[StoryResponse])
def get_stories(
    backup_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Story)
        .join(Backup, Story.backup_id == Backup.id)
        .filter(Backup.user_id == current_user.id)
    )
    if backup_id:
        query = query.filter(Story.backup_id == backup_id)
    return query.order_by(Story.timestamp.desc().nullslast()).limit(200).all()

