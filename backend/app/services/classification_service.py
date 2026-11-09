"""Content classification service for Instagram URLs and media items."""

import re


class ClassificationService:
    """Classifies content items by URL pattern, metadata, and directory hints."""

    @staticmethod
    def classify_url(url: str | None) -> str:
        """Determines content type from URL structure."""
        if not url:
            return "unknown"

        lower = url.lower()
        if "/reel/" in lower or "/reels/" in lower:
            return "reel"
        if "/p/" in lower:
            return "post"
        if "/tv/" in lower:
            return "igtv"
        if "/stories/" in lower:
            return "story"
        if "instagram.com/" in lower and not any(
            seg in lower for seg in ("/explore/", "/direct/", "/accounts/")
        ):
            return "profile"

        return "unknown"

    @staticmethod
    def classify_by_filepath(file_path: str) -> str:
        """Infers category from source filename or folder path."""
        lower = file_path.lower()
        if "saved_posts" in lower or "saved_media" in lower:
            return "saved_posts"
        if "collection" in lower:
            return "collections"
        if "follower" in lower:
            return "followers"
        if "following" in lower:
            return "following"
        if "like" in lower:
            return "likes"
        if "comment" in lower:
            return "comments"
        if "message" in lower or "inbox" in lower:
            return "messages"
        if "stories" in lower or "story" in lower:
            return "stories"
        return "unknown"
