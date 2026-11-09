"""Parser for Instagram following list exports."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from bs4 import BeautifulSoup

from app.parsers.base_parser import BaseParser, ParseResult


class FollowingParser(BaseParser):
    """Parse following lists from Instagram HTML and JSON exports."""

    def can_parse(self, file_path: str, content: str | bytes) -> float:
        p = self._safe_path_lower(file_path)
        if "following" not in p:
            return 0.0
        if p.endswith(".json"):
            text = self._ensure_str(content)
            try:
                data = json.loads(text)
                if isinstance(data, dict) and any("following" in k.lower() for k in data.keys()):
                    return 0.95
                if isinstance(data, list):
                    return 0.75
            except (json.JSONDecodeError, ValueError):
                return 0.0
            return 0.6
        elif p.endswith((".html", ".htm")):
            return 0.8
        return 0.0

    def parse(self, file_path: str, content: str | bytes) -> ParseResult:
        text = self._ensure_str(content)
        result = ParseResult(category="following", source_file=file_path)

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
            for key, value in data.items():
                if isinstance(value, list):
                    entries.extend(v for v in value if isinstance(v, dict))
        elif isinstance(data, list):
            entries = [v for v in data if isinstance(v, dict)]

        for entry in entries:
            sld_list = entry.get("string_list_data", [])
            if not isinstance(sld_list, list):
                continue
            for sld in sld_list:
                if not isinstance(sld, dict):
                    continue
                username = sld.get("value", "")
                href = sld.get("href", "")
                ts = sld.get("timestamp")
                if username:
                    items.append({
                        "connection_type": "following",
                        "username": username,
                        "profile_url": href or f"https://www.instagram.com/{username}",
                        "timestamp": self._ts_to_dt(ts),
                        "source_file": file_path,
                    })
        return items

    def _parse_html(self, text: str, file_path: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        soup = BeautifulSoup(text, "lxml")
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            username = a_tag.get_text(strip=True)
            if not username:
                username = self._extract_username_from_url(href)
            if username:
                items.append({
                    "connection_type": "following",
                    "username": username,
                    "profile_url": href if "instagram.com" in href else f"https://www.instagram.com/{username}",
                    "timestamp": None,
                    "source_file": file_path,
                })
        return items

    def _ts_to_dt(self, ts: Any) -> datetime | None:
        if ts is None:
            return None
        try:
            return datetime.fromtimestamp(int(ts), tz=timezone.utc)
        except (ValueError, TypeError, OSError):
            return None
