"""Parser for Instagram stories exports."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from bs4 import BeautifulSoup

from app.parsers.base_parser import BaseParser, ParseResult


class StoriesParser(BaseParser):
    """Parse story history from Instagram exports."""

    def can_parse(self, file_path: str, content: str | bytes) -> float:
        p = self._safe_path_lower(file_path)
        if "stor" not in p:  # story, stories
            return 0.0
        if p.endswith(".json"):
            text = self._ensure_str(content)
            try:
                data = json.loads(text)
                if isinstance(data, dict) and any("stor" in k.lower() for k in data.keys()):
                    return 0.9
            except (json.JSONDecodeError, ValueError):
                return 0.0
            return 0.6
        elif p.endswith((".html", ".htm")):
            return 0.7
        return 0.0

    def parse(self, file_path: str, content: str | bytes) -> ParseResult:
        text = self._ensure_str(content)
        result = ParseResult(category="stories", source_file=file_path)

        p = self._safe_path_lower(file_path)
        if p.endswith(".json"):
            result.items = self._parse_json(text, file_path)
        else:
            result.items = self._parse_html(text, file_path)
        return result

    def _parse_json(self, text: str, file_path: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        try:
            data = json.loads(text)
        except (json.JSONDecodeError, ValueError):
            return items

        entries: list[dict] = []
        if isinstance(data, dict):
            for value in data.values():
                if isinstance(value, list):
                    entries.extend(v for v in value if isinstance(v, dict))
        elif isinstance(data, list):
            entries = [v for v in data if isinstance(v, dict)]

        for entry in entries:
            uri = entry.get("uri", "")
            title = entry.get("title", "")
            if isinstance(title, str):
                try:
                    title = title.encode("latin-1").decode("utf-8")
                except (UnicodeDecodeError, UnicodeEncodeError):
                    pass
            ts = entry.get("creation_timestamp") or entry.get("timestamp")

            # Determine media type from URI extension
            media_type = self._detect_media_type(uri)

            items.append({
                "media_path": uri or None,
                "media_type": media_type,
                "caption": title or None,
                "timestamp": self._ts_to_dt(ts),
                "source_file": file_path,
            })

            # Also handle nested media_map_data
            mmd = entry.get("media_map_data", {})
            if isinstance(mmd, dict) and mmd.get("uri"):
                muri = mmd["uri"]
                items.append({
                    "media_path": muri,
                    "media_type": self._detect_media_type(muri),
                    "caption": title or None,
                    "timestamp": self._ts_to_dt(mmd.get("creation_timestamp") or ts),
                    "source_file": file_path,
                })
        return items

    def _parse_html(self, text: str, file_path: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        soup = BeautifulSoup(text, "lxml")

        # Find media elements
        for img in soup.find_all(["img", "video", "source"]):
            src = img.get("src") or img.get("data-src", "")
            if src:
                items.append({
                    "media_path": src,
                    "media_type": self._detect_media_type(src),
                    "caption": img.get("alt") or None,
                    "timestamp": None,
                    "source_file": file_path,
                })

        # Also find links that point to media
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            if any(ext in href.lower() for ext in (".jpg", ".jpeg", ".png", ".mp4", ".webm")):
                items.append({
                    "media_path": href,
                    "media_type": self._detect_media_type(href),
                    "caption": a_tag.get_text(strip=True) or None,
                    "timestamp": None,
                    "source_file": file_path,
                })
        return items

    def _detect_media_type(self, path: str) -> str:
        p = path.lower()
        if any(ext in p for ext in (".mp4", ".mov", ".avi", ".webm")):
            return "video"
        if any(ext in p for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif")):
            return "image"
        return "image"  # default

    def _ts_to_dt(self, ts: Any) -> datetime | None:
        if ts is None:
            return None
        try:
            return datetime.fromtimestamp(int(ts), tz=timezone.utc)
        except (ValueError, TypeError, OSError):
            return None
