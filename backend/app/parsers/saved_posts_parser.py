"""Specialized parser for saved posts / saved reels."""

from __future__ import annotations

import json
from typing import Any

from app.parsers.base_parser import BaseParser, ParseResult
from app.parsers.html_parser import InstagramHTMLParser
from app.parsers.json_parser import InstagramJSONParser


class SavedPostsParser(BaseParser):
    """Parse Instagram saved-posts / saved-media exports (HTML or JSON)."""

    _html_parser = InstagramHTMLParser()
    _json_parser = InstagramJSONParser()

    _JSON_KEYS = {"saved_saved_media", "ig_saved_media", "saved_media", "saved_posts"}

    def can_parse(self, file_path: str, content: str | bytes) -> float:
        p = self._safe_path_lower(file_path)
        if "collection" in p:
            return 0.0
        is_saved_path = any(kw in p for kw in ("saved", "your_saved", "saved_posts"))
        if not is_saved_path:
            return 0.0

        text = self._ensure_str(content)

        if p.endswith(".json"):
            try:
                data = json.loads(text)
                if isinstance(data, dict) and set(data.keys()) & self._JSON_KEYS:
                    return 0.95
            except (json.JSONDecodeError, ValueError):
                pass
            if is_saved_path:
                return 0.6
        elif p.endswith((".html", ".htm")):
            if "instagram.com" in text:
                return 0.85
            return 0.5
        return 0.0

    def parse(self, file_path: str, content: str | bytes) -> ParseResult:
        p = self._safe_path_lower(file_path)
        if p.endswith(".json"):
            result = self._json_parser.parse(file_path, content)
        else:
            result = self._html_parser.parse(file_path, content)
        result.category = "saved_posts"
        # Ensure every item has content_type properly classified
        for item in result.items:
            if item.get("content_type") == "unknown" and item.get("normalized_url"):
                item["content_type"] = self._classify_url(item["normalized_url"])
        return result
