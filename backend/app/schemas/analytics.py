"""Analytics schemas."""

from pydantic import BaseModel


class ContentTypeStat(BaseModel):
    content_type: str
    count: int
    percentage: float = 0.0


class CreatorStat(BaseModel):
    username: str
    reel_count: int = 0
    post_count: int = 0
    total_content: int = 0


class HashtagStat(BaseModel):
    hashtag: str
    count: int


class TimelineStat(BaseModel):
    date: str
    count: int


class DashboardStats(BaseModel):
    total_content: int = 0
    total_reels: int = 0
    total_posts: int = 0
    total_stories: int = 0
    total_igtv: int = 0
    total_collections: int = 0
    total_creators: int = 0
    total_followers: int = 0
    total_following: int = 0
    total_comments: int = 0
    total_likes: int = 0
    total_messages: int = 0
    total_duplicates: int = 0
    backup_status: str = ""


class ChartData(BaseModel):
    content_by_type: list[ContentTypeStat] = []
    top_creators: list[CreatorStat] = []
    top_hashtags: list[HashtagStat] = []
    timeline: list[TimelineStat] = []


class AnalyticsResponse(BaseModel):
    dashboard: DashboardStats
    charts: ChartData
