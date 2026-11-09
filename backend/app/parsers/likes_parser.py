"""Parser for Instagram likes exports."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from bs4 import BeautifulSoup

from app.parsers.base_parser import BaseParser, ParseResult


class LikesParser(BaseParser):
    """Parse liked posts / comments / stories from Instagram exports."""

    def can_parse(self, file_path: str, content: str | bytes) -> float:
        p = self._safe_path_lower(file_path)
        if "like" not in p:
            return 0.0
        if p.endswith(".json"):
            text = self._ensure_str(content)
            try:
                data = json.loads(text)
                if isinstance(data, dict) and any("like" in k.lower() for k in data.keys()):
                    return 0.95
            except (json.JSONDecodeError, ValueError):
                return 0.0
            return 0.6
        elif p.endswith((".html", ".htm")):
            return 0.75
        return 0.0

    def parse(self, file_path: str, content: str | bytes) -> ParseResult:
        text = self._ensure_str(content)
        result = ParseResult(category="likes", source_file=file_path)

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

        if not isinstance(data, dict):
            return items

        for key, value in data.items():
            if not isinstance(value, list):
                continue
            like_type = self._determine_like_type(key)
            for entry in value:
                if not isinstance(entry, dict):
                    continue
                title = entry.get("title", "")
                if isinstance(title, str):
                    try:
                        title = title.encode("latin-1").decode("utf-8")
                    except (UnicodeDecodeError, UnicodeEncodeError):
                        pass
                ts = entry.get("timestamp") or entry.get("creation_timestamp")

                # string_list_data pattern
                sld_list = entry.get("string_list_data", [])
                if isinstance(sld_list, list):
                    for sld in sld_list:
                        if not isinstance(sld, dict):
                            continue
                        href = sld.get("href", "")
                        items.append({
                            "like_type": like_type,
                            "target_user": title or sld.get("value", ""),
                            "target_url": href,
                            "timestamp": self._ts_to_dt(sld.get("timestamp") or ts),
                            "source_file": file_path,
                        })
                else:
                    items.append({
                        "like_type": like_type,
                        "target_user": title,
                        "target_url": None,
                        "timestamp": self._ts_to_dt(ts),
                        "source_file": file_path,
                    })
        return items

    def _parse_html(self, text: str, file_path: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        soup = BeautifulSoup(text, "lxml")
        like_type = self._determine_like_type(file_path)

        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            username = a_tag.get_text(strip=True)
            items.append({
                "like_type": like_type,
                "target_user": username or self._extract_username_from_url(href),
                "target_url": href if "instagram.com" in href else None,
                "timestamp": None,
                "source_file": file_path,
            })
        return items

    def _determine_like_type(self, key_or_path: str) -> str:
        k = key_or_path.lower()
        if "comment" in k:
            return "comment"
        if "story" in k or "stories" in k:
            return "story"
        return "post"

    def _ts_to_dt(self, ts: Any) -> datetime | None:
        if ts is None:
            return None
        try:
            return datetime.fromtimestamp(int(ts), tz=timezone.utc)
        except (ValueError, TypeError, OSError):
            return None
