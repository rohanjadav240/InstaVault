"""Parser for Instagram JSON export files."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from app.parsers.base_parser import BaseParser, ParseResult


class InstagramJSONParser(BaseParser):
    """Generic parser for Instagram JSON data-export files.

    Instagram JSON exports use several key patterns:

    1. Top-level arrays::

        { "saved_saved_media": [ { "title": "username", "media_list_data": [...] } ] }

    2. ``string_list_data``::

        { "relationships_followers": [ { "string_list_data": [ { "value": "user", "href": "...", "timestamp": ... } ] } ] }

    3. ``media_map_data``::

        { "uri": "https://...", "creation_timestamp": 1234567890 }

    This parser can handle all known variations.
    """

    # Known top-level keys that indicate Instagram export data
    _KNOWN_KEYS: set[str] = {
        "saved_saved_media", "ig_saved_media", "saved_media", "saved_posts",
        "relationships_followers", "relationships_following",
        "relationships_follow_requests_sent",
        "likes_media_likes", "likes_comment_likes",
        "comments_media_comments",
        "messages", "inbox",
        "stories", "story_activities",
        "profile", "profile_user",
        "media", "photos_and_videos",
        "saved_collections",
    }

    def can_parse(self, file_path: str, content: str | bytes) -> float:
        path_lower = self._safe_path_lower(file_path)
        if not path_lower.endswith(".json"):
            return 0.0
        text = self._ensure_str(content)
        try:
            data = json.loads(text)
        except (json.JSONDecodeError, ValueError):
            return 0.0

        if not isinstance(data, (dict, list)):
            return 0.0

        score = 0.25  # it's valid JSON
        if isinstance(data, dict):
            keys = set(data.keys())
            if keys & self._KNOWN_KEYS:
                score += 0.5
            if any("instagram" in str(v)[:500].lower() for v in data.values() if isinstance(v, (str, list))):
                score += 0.15
        if "instagram.com" in text[:5000]:
            score += 0.1
        return min(score, 1.0)

    def parse(self, file_path: str, content: str | bytes) -> ParseResult:
        text = self._ensure_str(content)
        result = ParseResult(category=self._guess_category(file_path), source_file=file_path)

        try:
            data = json.loads(text)
        except (json.JSONDecodeError, ValueError) as exc:
            result.errors.append(f"Invalid JSON: {exc}")
            return result

        if isinstance(data, dict):
            result.items = self._parse_dict(data, file_path, result)
        elif isinstance(data, list):
            result.items = self._parse_list(data, file_path, result)

        return result

    # ------------------------------------------------------------------ #
    # Dict-level dispatch
    # ------------------------------------------------------------------ #

    def _parse_dict(self, data: dict, file_path: str, result: ParseResult) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for key, value in data.items():
            if not isinstance(value, list):
                continue
            category = self._key_to_category(key)
            if category == "collections":
                result.category = "collections"
                for entry in value:
                    if not isinstance(entry, dict):
                        continue
                    col_name = self._decode_text(entry.get("title", "Collection"))
                    col_items = []
                    media_list = entry.get("media_list_data") or entry.get("string_list_data") or []
                    for m in media_list:
                        m_href = m.get("href") or m.get("uri") or ""
                        if m_href:
                            col_items.append({"original_url": m_href, "normalized_url": self._normalize_url(m_href)})
                    items.append({"name": col_name, "items": col_items, "source_file": file_path})
                return items
            for entry in value:
                if not isinstance(entry, dict):
                    continue
                parsed = self._parse_entry(entry, file_path, category)
                items.extend(parsed)
        return items

    def _parse_list(self, data: list, file_path: str, result: ParseResult) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for entry in data:
            if isinstance(entry, dict):
                parsed = self._parse_entry(entry, file_path, result.category)
                items.extend(parsed)
        return items

    # ------------------------------------------------------------------ #
    # Entry parsing (handles all known structures)
    # ------------------------------------------------------------------ #

    def _parse_entry(self, entry: dict, file_path: str, category: str) -> list[dict[str, Any]]:
        """Parse a single entry dict, which may contain nested items."""
        items: list[dict[str, Any]] = []

        # Pattern 1: media_list_data (saved posts)
        if "media_list_data" in entry:
            title = self._decode_text(entry.get("title", ""))
            for media in entry["media_list_data"]:
                item = self._parse_media_item(media, file_path, category)
                if item:
                    if not item.get("creator_username") and title:
                        item["creator_username"] = title
                    items.append(item)
            return items

        # Pattern 2: string_list_data (followers, following, likes, or saved posts)
        if "string_list_data" in entry:
            title = self._decode_text(entry.get("title", ""))
            for sld in entry["string_list_data"]:
                href = sld.get("href", "")
                if category == "saved_posts" or any(s in href for s in ("/p/", "/reel/", "/reels/", "/tv/")):
                    norm = self._normalize_url(href)
                    val = self._decode_text(sld.get("value", ""))
                    items.append({
                        "original_url": href,
                        "normalized_url": norm,
                        "content_type": self._classify_url(norm),
                        "shortcode": self._extract_shortcode_from_url(norm),
                        "creator_username": title or self._extract_username_from_url(norm),
                        "caption": val or None,
                        "hashtags": self._extract_hashtags(val),
                        "saved_at": self._ts_to_datetime(sld.get("timestamp")),
                        "source_file": file_path,
                    })
                else:
                    item = self._parse_string_list_item(sld, file_path, category)
                    if item:
                        items.append(item)
            return items

        # Pattern 3: media_map_data (single media reference)
        if "media_map_data" in entry:
            item = self._parse_media_map(entry["media_map_data"], entry, file_path, category)
            if item:
                items.append(item)
            return items

        # Pattern 4: Direct uri / href fields
        if "uri" in entry or "href" in entry:
            item = self._parse_direct_item(entry, file_path, category)
            if item:
                items.append(item)
            return items

        # Pattern 5: title + timestamp (comments, likes)
        if "title" in entry:
            item = self._parse_titled_item(entry, file_path, category)
            if item:
                items.append(item)
            return items

        return items

    # ------------------------------------------------------------------ #
    # Item-level parsers
    # ------------------------------------------------------------------ #

    def _parse_media_item(self, media: dict, file_path: str, category: str) -> dict[str, Any] | None:
        """Parse a media item inside media_list_data."""
        if not isinstance(media, dict):
            return None

        caption = self._decode_text(media.get("title", ""))

        # media_map_data contains the URI
        mmd = media.get("media_map_data", {})
        uri = mmd.get("uri", "") if isinstance(mmd, dict) else ""
        ts_val = mmd.get("creation_timestamp") if isinstance(mmd, dict) else None

        if not uri:
            uri = media.get("uri", "")
        if ts_val is None:
            ts_val = media.get("creation_timestamp") or media.get("timestamp")

        if not uri:
            return None

        normalized = self._normalize_url(uri)
        return {
            "original_url": uri,
            "normalized_url": normalized,
            "content_type": self._classify_url(normalized),
            "shortcode": self._extract_shortcode_from_url(normalized),
            "creator_username": self._extract_username_from_url(normalized),
            "caption": caption or None,
            "hashtags": self._extract_hashtags(caption),
            "saved_at": self._ts_to_datetime(ts_val),
            "source_file": file_path,
        }

    def _parse_string_list_item(self, sld: dict, file_path: str, category: str) -> dict[str, Any] | None:
        if not isinstance(sld, dict):
            return None
        value = self._decode_text(sld.get("value", ""))
        href = sld.get("href", "")
        ts_val = sld.get("timestamp")

        return {
            "username": value,
            "value": value,
            "href": href,
            "profile_url": href if href else f"https://www.instagram.com/{value}" if value else None,
            "timestamp": self._ts_to_datetime(ts_val),
            "source_file": file_path,
            "category": category,
        }

    def _parse_media_map(self, mmd: dict, parent: dict, file_path: str, category: str) -> dict[str, Any] | None:
        if not isinstance(mmd, dict):
            return None
        uri = mmd.get("uri", "")
        if not uri:
            return None
        ts_val = mmd.get("creation_timestamp") or parent.get("timestamp")
        caption = self._decode_text(parent.get("title", ""))
        normalized = self._normalize_url(uri)
        return {
            "original_url": uri,
            "normalized_url": normalized,
            "content_type": self._classify_url(normalized),
            "shortcode": self._extract_shortcode_from_url(normalized),
            "creator_username": self._extract_username_from_url(normalized),
            "caption": caption or None,
            "hashtags": self._extract_hashtags(caption),
            "saved_at": self._ts_to_datetime(ts_val),
            "source_file": file_path,
        }

    def _parse_direct_item(self, entry: dict, file_path: str, category: str) -> dict[str, Any] | None:
        uri = entry.get("uri") or entry.get("href", "")
        if not uri:
            return None
        ts_val = entry.get("creation_timestamp") or entry.get("timestamp")
        caption = self._decode_text(entry.get("title", entry.get("value", "")))
        normalized = self._normalize_url(uri)
        return {
            "original_url": uri,
            "normalized_url": normalized,
            "content_type": self._classify_url(normalized),
            "shortcode": self._extract_shortcode_from_url(normalized),
            "creator_username": self._extract_username_from_url(normalized),
            "caption": caption or None,
            "hashtags": self._extract_hashtags(caption),
            "saved_at": self._ts_to_datetime(ts_val),
            "source_file": file_path,
        }

    def _parse_titled_item(self, entry: dict, file_path: str, category: str) -> dict[str, Any] | None:
        title = self._decode_text(entry.get("title", ""))
        ts_val = entry.get("timestamp") or entry.get("creation_timestamp")
        # Look for any nested list data
        for key in ("string_list_data", "media_list_data"):
            if key in entry:
                return None  # handled by other patterns
        return {
            "value": title,
            "caption": title or None,
            "timestamp": self._ts_to_datetime(ts_val),
            "source_file": file_path,
            "category": category,
        }

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def _decode_text(self, value: Any) -> str:
        """Decode Instagram's escaped UTF-8 byte sequences in JSON strings."""
        if not isinstance(value, str):
            return str(value) if value is not None else ""
        try:
            return value.encode("latin-1").decode("utf-8")
        except (UnicodeDecodeError, UnicodeEncodeError):
            return value

    def _ts_to_datetime(self, ts: Any) -> datetime | None:
        if ts is None:
            return None
        try:
            ts_int = int(ts)
            return datetime.fromtimestamp(ts_int, tz=timezone.utc)
        except (ValueError, TypeError, OSError):
            return None

    def _key_to_category(self, key: str) -> str:
        key_lower = key.lower()
        if "collection" in key_lower:
            return "collections"
        if "saved" in key_lower:
            return "saved_posts"
        if "follower" in key_lower:
            return "followers"
        if "following" in key_lower:
            return "following"
        if "like" in key_lower:
            return "likes"
        if "comment" in key_lower:
            return "comments"
        if "message" in key_lower or "inbox" in key_lower:
            return "messages"
        if "stor" in key_lower:
            return "stories"
        return "unknown"

    def _guess_category(self, file_path: str) -> str:
        p = self._safe_path_lower(file_path)
        if "collection" in p:
            return "collections"
        if "saved" in p:
            return "saved_posts"
        if "follower" in p:
            return "followers"
        if "following" in p:
            return "following"
        if "like" in p:
            return "likes"
        if "comment" in p:
            return "comments"
        if "message" in p or "inbox" in p:
            return "messages"
        if "stor" in p:
            return "stories"
        return "unknown"
