"""Parser for Instagram comments exports."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from bs4 import BeautifulSoup

from app.parsers.base_parser import BaseParser, ParseResult


class CommentsParser(BaseParser):
    """Parse user's posted comments from Instagram exports."""

    def can_parse(self, file_path: str, content: str | bytes) -> float:
        p = self._safe_path_lower(file_path)
        if "comment" not in p:
            return 0.0
        if p.endswith(".json"):
            text = self._ensure_str(content)
            try:
                data = json.loads(text)
                if isinstance(data, dict) and any("comment" in k.lower() for k in data.keys()):
                    return 0.95
            except (json.JSONDecodeError, ValueError):
                return 0.0
            return 0.6
        elif p.endswith((".html", ".htm")):
            return 0.75
        return 0.0

    def parse(self, file_path: str, content: str | bytes) -> ParseResult:
        text = self._ensure_str(content)
        result = ParseResult(category="comments", source_file=file_path)

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
            title = entry.get("title", "")
            if isinstance(title, str):
                try:
                    title = title.encode("latin-1").decode("utf-8")
                except (UnicodeDecodeError, UnicodeEncodeError):
                    pass
            ts = entry.get("timestamp") or entry.get("creation_timestamp")

            # Extract comment text from string_list_data
            sld_list = entry.get("string_list_data", [])
            if isinstance(sld_list, list):
                for sld in sld_list:
                    if not isinstance(sld, dict):
                        continue
                    comment_text = sld.get("value", "")
                    if isinstance(comment_text, str):
                        try:
                            comment_text = comment_text.encode("latin-1").decode("utf-8")
                        except (UnicodeDecodeError, UnicodeEncodeError):
                            pass
                    href = sld.get("href", "")
                    target_user = self._extract_username_from_url(href) if href else None
                    items.append({
                        "text": comment_text,
                        "target_user": target_user or title,
                        "target_url": href or None,
                        "timestamp": self._ts_to_dt(sld.get("timestamp") or ts),
                        "source_file": file_path,
                    })
            # Also handle media_list_data pattern
            mld = entry.get("media_list_data", [])
            if isinstance(mld, list):
                for media in mld:
                    if not isinstance(media, dict):
                        continue
                    caption = media.get("title", "")
                    mmd = media.get("media_map_data", {})
                    uri = mmd.get("uri", "") if isinstance(mmd, dict) else ""
                    items.append({
                        "text": caption,
                        "target_user": title,
                        "target_url": uri or None,
                        "timestamp": self._ts_to_dt(
                            mmd.get("creation_timestamp") if isinstance(mmd, dict) else ts
                        ),
                        "source_file": file_path,
                    })
        return items

    def _parse_html(self, text: str, file_path: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        soup = BeautifulSoup(text, "lxml")

        # Look for div blocks containing comment text and links
        blocks = soup.find_all("div", recursive=True)
        for block in blocks:
            a_tag = block.find("a", href=True)
            if not a_tag:
                continue
            href = a_tag["href"]
            # Get text that isn't the link
            full_text = block.get_text(" ", strip=True)
            link_text = a_tag.get_text(strip=True)
            comment_text = full_text.replace(link_text, "").strip()
            if comment_text:
                items.append({
                    "text": comment_text,
                    "target_user": self._extract_username_from_url(href),
                    "target_url": href if "instagram.com" in href else None,
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
