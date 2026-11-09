"""Analytics calculation service for cloud dashboards."""

import json
from collections import Counter
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models import (
    Backup,
    Collection,
    Comment,
    ContentItem,
    Creator,
    Like,
    Message,
    SocialConnection,
    Story,
)
from app.schemas.analytics import (
    AnalyticsResponse,
    ChartData,
    ContentTypeStat,
    CreatorStat,
    DashboardStats,
    HashtagStat,
    TimelineStat,
)


class AnalyticsService:
    """Computes aggregated KPIs and chart series for a given backup."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_analytics(self, backup_id: int) -> AnalyticsResponse:
        backup = self.db.query(Backup).filter(Backup.id == backup_id).first()
        status = backup.status if backup else "unknown"

        # Content counts
        total_content = self.db.query(ContentItem).filter(ContentItem.backup_id == backup_id).count()
        total_reels = (
            self.db.query(ContentItem)
            .filter(ContentItem.backup_id == backup_id, ContentItem.content_type == "reel")
            .count()
        )
        total_posts = (
            self.db.query(ContentItem)
            .filter(ContentItem.backup_id == backup_id, ContentItem.content_type == "post")
            .count()
        )
        total_stories = (
            self.db.query(ContentItem)
            .filter(ContentItem.backup_id == backup_id, ContentItem.content_type == "story")
            .count()
        )
        total_igtv = (
            self.db.query(ContentItem)
            .filter(ContentItem.backup_id == backup_id, ContentItem.content_type == "igtv")
            .count()
        )
        total_duplicates = (
            self.db.query(ContentItem)
            .filter(ContentItem.backup_id == backup_id, ContentItem.is_duplicate.is_(True))
            .count()
        )

        total_collections = self.db.query(Collection).filter(Collection.backup_id == backup_id).count()
        total_creators = self.db.query(Creator).filter(Creator.backup_id == backup_id).count()
        total_followers = (
            self.db.query(SocialConnection)
            .filter(SocialConnection.backup_id == backup_id, SocialConnection.connection_type == "follower")
            .count()
        )
        total_following = (
            self.db.query(SocialConnection)
            .filter(SocialConnection.backup_id == backup_id, SocialConnection.connection_type == "following")
            .count()
        )
        total_comments = self.db.query(Comment).filter(Comment.backup_id == backup_id).count()
        total_likes = self.db.query(Like).filter(Like.backup_id == backup_id).count()
        total_messages = self.db.query(Message).filter(Message.backup_id == backup_id).count()

        dashboard = DashboardStats(
            total_content=total_content,
            total_reels=total_reels,
            total_posts=total_posts,
            total_stories=total_stories,
            total_igtv=total_igtv,
            total_collections=total_collections,
            total_creators=total_creators,
            total_followers=total_followers,
            total_following=total_following,
            total_comments=total_comments,
            total_likes=total_likes,
            total_messages=total_messages,
            total_duplicates=total_duplicates,
            backup_status=status,
        )

        # Content by type
        content_types = []
        if total_content > 0:
            for c_type, count in [("reel", total_reels), ("post", total_posts), ("story", total_stories), ("igtv", total_igtv)]:
                if count > 0:
                    content_types.append(
                        ContentTypeStat(
                            content_type=c_type,
                            count=count,
                            percentage=round((count / total_content) * 100, 1),
                        )
                    )

        # Top creators
        creators = (
            self.db.query(Creator)
            .filter(Creator.backup_id == backup_id)
            .order_by(Creator.total_content.desc())
            .limit(10)
            .all()
        )
        top_creators = [
            CreatorStat(
                username=c.username,
                reel_count=c.reel_count,
                post_count=c.post_count,
                total_content=c.total_content,
            )
            for c in creators
        ]

        # Top hashtags
        items_with_tags = (
            self.db.query(ContentItem.hashtags)
            .filter(ContentItem.backup_id == backup_id, ContentItem.hashtags.isnot(None))
            .all()
        )
        tag_counter: Counter = Counter()
        for (tags_json,) in items_with_tags:
            try:
                tags = json.loads(tags_json)
                if isinstance(tags, list):
                    tag_counter.update(tags)
            except Exception:
                continue

        top_hashtags = [
            HashtagStat(hashtag=tag, count=cnt)
            for tag, cnt in tag_counter.most_common(10)
        ]

        # Timeline (group by month YYYY-MM)
        items_dates = (
            self.db.query(ContentItem.saved_at)
            .filter(ContentItem.backup_id == backup_id, ContentItem.saved_at.isnot(None))
            .all()
        )
        month_counter: Counter = Counter()
        for (saved_at,) in items_dates:
            if saved_at:
                month_counter[saved_at.strftime("%Y-%m")] += 1

        timeline = [
            TimelineStat(date=m, count=cnt)
            for m, cnt in sorted(month_counter.items())[-12:]
        ]

        charts = ChartData(
            content_by_type=content_types,
            top_creators=top_creators,
            top_hashtags=top_hashtags,
            timeline=timeline,
        )

        return AnalyticsResponse(dashboard=dashboard, charts=charts)
