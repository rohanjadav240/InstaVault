"""Base parser with shared utilities for all Instagram data parsers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any
import re


@dataclass
class ParseResult:
    """Structured result from a parser."""
    category: str
    items: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    source_file: str = ""
    confidence: float = 0.0


class BaseParser(ABC):
    """Abstract base class for all Instagram data parsers."""

    @abstractmethod
    def can_parse(self, file_path: str, content: str | bytes) -> float:
        """Return confidence score 0.0-1.0 for whether this parser handles this file."""
        pass

    @abstractmethod
    def parse(self, file_path: str, content: str | bytes) -> ParseResult:
        """Parse the file and return structured results."""
        pass

    # ----- shared helpers -----

    def _extract_shortcode_from_url(self, url: str) -> str | None:
        match = re.search(r"/(p|reel|reels|tv)/([A-Za-z0-9_-]+)", url)
        return match.group(2) if match else None

    def _classify_url(self, url: str) -> str:
        if "/reel/" in url or "/reels/" in url:
            return "reel"
        elif "/p/" in url:
            return "post"
        elif "/tv/" in url:
            return "igtv"
        elif "/stories/" in url:
            return "story"
        else:
            return "unknown"

    def _extract_username_from_url(self, url: str) -> str | None:
        match = re.search(r"instagram\.com/([A-Za-z0-9_.]+)", url)
        if match:
            username = match.group(1)
            reserved = {
                "p", "reel", "reels", "tv", "stories", "explore",
                "accounts", "direct", "about", "developer", "legal",
            }
            if username.lower() not in reserved:
                return username
        return None

    def _normalize_url(self, url: str) -> str:
        url = url.strip()
        if url.startswith("//"):
            url = "https:" + url
        url = url.split("?")[0].rstrip("/")
        return url

    def _extract_hashtags(self, text: str) -> list[str]:
        return re.findall(r"#(\w+)", text) if text else []

    def _clean_username(self, val: str) -> str:
        return val.strip().lstrip("@")

    def _guess_category(self, file_path: str) -> str:
        p = self._safe_path_lower(file_path)
        if "collection" in p:
            return "collections"
        elif "saved" in p:
            return "saved_posts"
        elif "follower" in p:
            return "followers"
        elif "following" in p:
            return "following"
        elif "like" in p:
            return "likes"
        elif "comment" in p:
            return "comments"
        elif "message" in p or "inbox" in p:
            return "messages"
        elif "storie" in p or "story" in p:
            return "stories"
        return "unknown"

    def _ensure_str(self, content: str | bytes) -> str:
        if isinstance(content, bytes):
            return content.decode("utf-8", errors="replace")
        return content

    def _safe_path_lower(self, path: str) -> str:
        return path.replace("\\", "/").lower()
