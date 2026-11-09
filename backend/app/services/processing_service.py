"""Cloud processing orchestrator for FastAPI backend."""

import json
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import (
    Backup,
    BackupFile,
    Collection,
    CollectionItem,
    Comment,
    ContentItem,
    Creator,
    Like,
    Message,
    ProcessingError,
    ProcessingJob,
    SocialConnection,
    Story,
)
from app.parsers.parser_registry import ParserRegistry
from app.services.archive_service import ArchiveService
from app.services.cleaning_service import CleaningService
from app.services.classification_service import ClassificationService


class ProcessingService:
    """Manages the full lifecycle of an archive ingestion job."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.parser_registry = ParserRegistry()

    def process_backup(self, backup_id: int, zip_path: Path) -> Backup:
        """Runs the complete ingestion pipeline for a backup archive."""
        backup = self.db.query(Backup).filter(Backup.id == backup_id).first()
        if not backup:
            raise ValueError(f"Backup with ID {backup_id} not found")

        backup.status = "processing"
        self.db.commit()

        # Job record
        job = ProcessingJob(
            backup_id=backup_id,
            stage="extracting",
            status="running",
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(job)
        self.db.commit()

        temp_extract_dir = settings.TEMP_DIR / f"backup_{backup_id}"

        try:
            # 1. Extraction & Scan
            job.stage = "extracting"
            self.db.commit()

            scan_report = ArchiveService.extract_safely(zip_path, temp_extract_dir)
            backup.total_files = scan_report.total_files
            self.db.commit()

            # Record BackupFile entries
            for df in scan_report.files:
                bf = BackupFile(
                    backup_id=backup_id,
                    file_path=df.relative_path,
                    file_type=df.file_type,
                    file_size=df.file_size,
                    category=ClassificationService.classify_by_filepath(df.relative_path),
                    confidence=0.8 if df.file_type in ("html", "json") else 0.5,
                    processed=False,
                )
                self.db.add(bf)
            self.db.commit()

            # 2. Parsing files
            job.stage = "parsing"
            self.db.commit()

            raw_content_items: list[dict] = []
            raw_collections: list[dict] = []
            raw_social: list[dict] = []
            raw_comments: list[dict] = []
            raw_likes: list[dict] = []
            raw_messages: list[dict] = []
            raw_stories: list[dict] = []

            target_files = [f for f in scan_report.files if f.file_type in ("html", "json")]

            for df in target_files:
                try:
                    content_bytes = df.absolute_path.read_bytes()
                    result = self.parser_registry.parse_file(df.relative_path, content_bytes)

                    if not result:
                        continue

                    # Record errors/warnings if any
                    for err_msg in result.errors:
                        pe = ProcessingError(
                            backup_id=backup_id,
                            stage="parsing",
                            file_path=df.relative_path,
                            error_type="ParseError",
                            message=err_msg,
                            severity="error",
                        )
                        self.db.add(pe)
                        backup.errors += 1

                    for warn_msg in result.warnings:
                        pe = ProcessingError(
                            backup_id=backup_id,
                            stage="parsing",
                            file_path=df.relative_path,
                            error_type="ParseWarning",
                            message=warn_msg,
                            severity="warning",
                        )
                        self.db.add(pe)
                        backup.warnings += 1

                    cat = result.category
                    if cat in ("saved_posts", "links"):
                        raw_content_items.extend(result.items)
                    elif cat == "collections":
                        raw_collections.extend(result.items)
                    elif cat in ("followers", "following"):
                        raw_social.extend(result.items)
                    elif cat == "comments":
                        raw_comments.extend(result.items)
                    elif cat == "likes":
                        raw_likes.extend(result.items)
                    elif cat == "messages":
                        raw_messages.extend(result.items)
                    elif cat == "stories":
                        raw_stories.extend(result.items)

                    backup.processed_files += 1

                except Exception as ex:
                    backup.errors += 1
                    pe = ProcessingError(
                        backup_id=backup_id,
                        stage="parsing",
                        file_path=df.relative_path,
                        error_type="Exception",
                        message=str(ex),
                        severity="error",
                    )
                    self.db.add(pe)

            self.db.commit()

            # 3. Cleaning & Storing Content Items
            job.stage = "cleaning_and_storing"
            self.db.commit()

            seen_urls: set[str] = set()
            url_to_id_map: dict[str, int] = {}
            creator_stats: dict[str, dict[str, int]] = {}

            for item in raw_content_items:
                orig_url = item.get("original_url") or item.get("href") or item.get("uri")
                norm_url = CleaningService.normalize_url(orig_url)
                shortcode = CleaningService.extract_shortcode(orig_url)
                username = CleaningService.normalize_username(
                    item.get("creator_username") or item.get("title")
                )
                caption = CleaningService.clean_caption(item.get("caption") or item.get("title"))
                hashtags = item.get("hashtags") or CleaningService.extract_hashtags(caption)
                saved_at = CleaningService.normalize_timestamp(
                    item.get("saved_at") or item.get("timestamp") or item.get("creation_timestamp")
                )
                c_type = item.get("content_type") or ClassificationService.classify_url(orig_url)

                is_dup = False
                if norm_url:
                    if norm_url in seen_urls:
                        is_dup = True
                    else:
                        seen_urls.add(norm_url)

                ci = ContentItem(
                    user_id=backup.user_id,
                    backup_id=backup_id,
                    content_type=c_type,
                    original_url=orig_url,
                    normalized_url=norm_url,
                    shortcode=shortcode,
                    creator_username=username,
                    caption=caption,
                    hashtags=json.dumps(hashtags) if hashtags else None,
                    saved_at=saved_at,
                    media_path=item.get("media_path"),
                    source_file=item.get("source_file", ""),
                    is_duplicate=is_dup,
                )
                self.db.add(ci)
                self.db.flush()

                if norm_url:
                    url_to_id_map[norm_url] = ci.id

                # Aggregate creators
                if username:
                    if username not in creator_stats:
                        creator_stats[username] = {"reels": 0, "posts": 0, "total": 0}
                    if c_type == "reel":
                        creator_stats[username]["reels"] += 1
                    else:
                        creator_stats[username]["posts"] += 1
                    creator_stats[username]["total"] += 1

                backup.total_records += 1

            # 4. Collections
            for col in raw_collections:
                c_name = col.get("name") or col.get("title") or "Collection"
                c_items = col.get("items") or []
                c_obj = Collection(
                    backup_id=backup_id,
                    name=c_name,
                    instagram_id=col.get("instagram_id"),
                    item_count=len(c_items),
                )
                self.db.add(c_obj)
                self.db.flush()

                pos = 0
                for mi in c_items:
                    m_url = CleaningService.normalize_url(mi.get("original_url") or mi.get("href"))
                    if m_url and m_url in url_to_id_map:
                        col_item = CollectionItem(
                            collection_id=c_obj.id,
                            content_item_id=url_to_id_map[m_url],
                            position=pos,
                        )
                        self.db.add(col_item)
                        pos += 1

                backup.total_records += 1

            # 5. Creators
            for u_name, c_counts in creator_stats.items():
                cr = Creator(
                    backup_id=backup_id,
                    username=u_name,
                    profile_url=f"https://www.instagram.com/{u_name}/",
                    reel_count=c_counts["reels"],
                    post_count=c_counts["posts"],
                    total_content=c_counts["total"],
                )
                self.db.add(cr)

            # 6. Social Connections
            for soc in raw_social:
                u = CleaningService.normalize_username(soc.get("username") or soc.get("title"))
                if not u:
                    continue
                sc = SocialConnection(
                    backup_id=backup_id,
                    connection_type=soc.get("connection_type", "follower"),
                    username=u,
                    profile_url=soc.get("profile_url") or f"https://www.instagram.com/{u}/",
                    timestamp=CleaningService.normalize_timestamp(soc.get("timestamp")),
                    source_file=soc.get("source_file", ""),
                )
                self.db.add(sc)
                backup.total_records += 1

            # 7. Comments
            for com in raw_comments:
                cm = Comment(
                    backup_id=backup_id,
                    text=com.get("text") or com.get("title") or "",
                    target_user=CleaningService.normalize_username(com.get("target_user")),
                    target_url=com.get("target_url"),
                    timestamp=CleaningService.normalize_timestamp(com.get("timestamp")),
                    source_file=com.get("source_file", ""),
                )
                self.db.add(cm)
                backup.total_records += 1

            # 8. Likes
            for lk in raw_likes:
                lk_obj = Like(
                    backup_id=backup_id,
                    like_type=lk.get("like_type", "post"),
                    target_user=CleaningService.normalize_username(lk.get("target_user")),
                    target_url=lk.get("target_url") or lk.get("href"),
                    timestamp=CleaningService.normalize_timestamp(lk.get("timestamp")),
                    source_file=lk.get("source_file", ""),
                )
                self.db.add(lk_obj)
                backup.total_records += 1

            # 9. Messages
            for msg in raw_messages:
                parts = msg.get("participants") or []
                parts_str = json.dumps(parts) if isinstance(parts, list) else str(parts)
                ms_obj = Message(
                    backup_id=backup_id,
                    thread_title=msg.get("thread_title"),
                    participants=parts_str,
                    sender_username=CleaningService.normalize_username(msg.get("sender_username")),
                    content=msg.get("content", ""),
                    content_type=msg.get("content_type", "text"),
                    timestamp=CleaningService.normalize_timestamp(msg.get("timestamp")),
                    source_file=msg.get("source_file", ""),
                    is_encrypted=False,
                )
                self.db.add(ms_obj)
                backup.total_records += 1

            # 10. Stories
            for st in raw_stories:
                st_obj = Story(
                    backup_id=backup_id,
                    media_path=st.get("media_path") or st.get("uri"),
                    media_type=st.get("media_type", "image"),
                    caption=st.get("caption"),
                    timestamp=CleaningService.normalize_timestamp(st.get("timestamp")),
                    source_file=st.get("source_file", ""),
                )
                self.db.add(st_obj)
                backup.total_records += 1

            backup.status = "completed"
            backup.completed_at = datetime.now(timezone.utc)
            job.stage = "complete"
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            self.db.commit()

        except Exception as e:
            backup.status = "failed"
            job.status = "failed"
            job.error_message = str(e)
            self.db.commit()
            raise e
        finally:
            # Clean up extracted temp directory
            ArchiveService.cleanup_directory(temp_extract_dir)

        return backup
