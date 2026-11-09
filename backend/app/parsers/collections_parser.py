"""Parser for Instagram collection exports."""

from __future__ import annotations

import json
import re
from typing import Any

from bs4 import BeautifulSoup, Tag

from app.parsers.base_parser import BaseParser, ParseResult
from app.parsers.html_parser import InstagramHTMLParser
from app.parsers.json_parser import InstagramJSONParser


class CollectionsParser(BaseParser):
    """Parse Instagram collections (groups of saved posts)."""

    _html_parser = InstagramHTMLParser()
    _json_parser = InstagramJSONParser()

    def can_parse(self, file_path: str, content: str | bytes) -> float:
        p = self._safe_path_lower(file_path)
        if "collection" not in p:
            return 0.0
        text = self._ensure_str(content)
        if p.endswith(".json"):
            return 0.98
        elif p.endswith((".html", ".htm")):
            return 0.98
        return 0.0

    def parse(self, file_path: str, content: str | bytes) -> ParseResult:
        p = self._safe_path_lower(file_path)
        text = self._ensure_str(content)

        result = ParseResult(category="collections", source_file=file_path)

        if p.endswith(".json"):
            result.items = self._parse_json_collections(text, file_path)
        else:
            result.items = self._parse_html_collections(text, file_path)
        return result

    def _parse_json_collections(self, text: str, file_path: str) -> list[dict[str, Any]]:
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
            collection_name = self._key_to_collection_name(key)
            for idx, entry in enumerate(value):
                if not isinstance(entry, dict):
                    continue
                media_list = entry.get("media_list_data", []) or entry.get("media", [])
                title = entry.get("title", collection_name)
                if isinstance(title, str):
                    try:
                        title = title.encode("latin-1").decode("utf-8")
                    except (UnicodeDecodeError, UnicodeEncodeError):
                        pass

                for media in media_list:
                    if not isinstance(media, dict):
                        continue
                    mmd = media.get("media_map_data", {})
                    uri = (
                        (mmd.get("uri") if isinstance(mmd, dict) else "")
                        or media.get("href", "")
                        or media.get("url", "")
                    )
                    ts_val = (
                        (mmd.get("creation_timestamp") if isinstance(mmd, dict) else None)
                        or media.get("timestamp")
                    )
                    caption = media.get("title", "") or media.get("value", "")
                    if isinstance(caption, str):
                        try:
                            caption = caption.encode("latin-1").decode("utf-8")
                        except (UnicodeDecodeError, UnicodeEncodeError):
                            pass

                    if uri:
                        normalized = self._normalize_url(uri)
                        items.append({
                            "collection_name": title or collection_name,
                            "original_url": uri,
                            "normalized_url": normalized,
                            "content_type": self._classify_url(normalized),
                            "shortcode": self._extract_shortcode_from_url(normalized),
                            "creator_username": self._extract_username_from_url(normalized),
                            "caption": caption or None,
                            "hashtags": self._extract_hashtags(caption) if caption else [],
                            "saved_at": self._json_parser._ts_to_datetime(ts_val),
                            "source_file": file_path,
                        })

                # If string_list_data
                if "string_list_data" in entry:
                    for sld in entry["string_list_data"]:
                        href = sld.get("href", "")
                        if href and "instagram.com" in href:
                            normalized = self._normalize_url(href)
                            items.append({
                                "collection_name": title or collection_name,
                                "original_url": href,
                                "normalized_url": normalized,
                                "content_type": self._classify_url(normalized),
                                "shortcode": self._extract_shortcode_from_url(normalized),
                                "creator_username": self._extract_username_from_url(normalized),
                                "caption": sld.get("value"),
                                "hashtags": [],
                                "saved_at": self._json_parser._ts_to_datetime(sld.get("timestamp")),
                                "source_file": file_path,
                            })
        return items

    def _parse_html_collections(self, text: str, file_path: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        soup = BeautifulSoup(text, "html.parser")

        # 1. Try modern table-based Instagram collections (e.g. Privacy + Update time)
        tables = soup.find_all("table")
        col_tables: list[tuple[Tag, str, str | None]] = []

        for table in tables:
            direct_rows = table.find_all("tr", recursive=False)
            row_dict: dict[str, str] = {}
            for r in direct_rows:
                tds = r.find_all("td", recursive=False)
                if len(tds) == 2:
                    k = tds[0].get_text(strip=True)
                    v = tds[1].get_text(strip=True)
                    row_dict[k] = v
            if "Privacy" in row_dict and "Update time" in row_dict:
                col_name = row_dict.get("Name", "Saved Collection")
                col_tables.append((table, col_name, row_dict.get("Update time")))

        if col_tables:
            for table, col_name, update_time in col_tables:
                links = table.find_all("a", href=lambda h: h and "instagram.com" in h)
                seen_urls = set()
                for a in links:
                    href = a.get("href", "")
                    normalized = self._normalize_url(href)
                    if normalized in seen_urls:
                        continue
                    seen_urls.add(normalized)

                    # Find enclosing post table
                    cur = a
                    parent_table = None
                    while cur and cur != table:
                        if cur.name == "table":
                            rows = cur.find_all("tr", recursive=False)
                            if any("URL" in r.get_text() or "Caption" in r.get_text() for r in rows):
                                parent_table = cur
                                break
                        cur = cur.parent

                    caption: str | None = None
                    username: str | None = None
                    display_name: str | None = None
                    hashtags: list[str] = []

                    if parent_table:
                        for r in parent_table.find_all("tr"):
                            tds = r.find_all("td", recursive=False)
                            if len(tds) == 2:
                                lbl = tds[0].get_text(strip=True)
                                val = tds[1].get_text(strip=True)
                                if lbl == "Caption" and not caption:
                                    caption = val
                                elif lbl == "Username" and not username:
                                    username = self._clean_username(val)
                                elif lbl == "Name" and not display_name:
                                    display_name = val

                            if "Hashtags" in r.get_text():
                                for ht_div in r.find_all("div", class_=re.compile(r"_a6-p|pam")):
                                    t = ht_div.get_text(strip=True)
                                    if t and " " not in t and t not in hashtags and t not in ("Hashtags", "Name"):
                                        hashtags.append(t)

                    if caption:
                        for h in self._extract_hashtags(caption):
                            if h not in hashtags:
                                hashtags.append(h)

                    final_creator = username or display_name or self._extract_username_from_url(normalized)

                    items.append({
                        "collection_name": col_name,
                        "original_url": href,
                        "normalized_url": normalized,
                        "content_type": self._classify_url(normalized),
                        "shortcode": self._extract_shortcode_from_url(normalized),
                        "creator_username": final_creator,
                        "caption": caption,
                        "hashtags": hashtags,
                        "saved_at": None,
                        "source_file": file_path,
                    })
            return items

        # 2. Fallback: header elements
        headers = soup.find_all(["h1", "h2", "h3", "h4"])
        if headers:
            for header in headers:
                coll_name = header.get_text(strip=True)
                sibling = header.find_next_sibling()
                while sibling and sibling.name not in ("h1", "h2", "h3", "h4"):
                    for a_tag in (sibling.find_all("a", href=re.compile(r"instagram\.com")) if hasattr(sibling, "find_all") else []):
                        href = a_tag["href"]
                        normalized = self._normalize_url(href)
                        items.append({
                            "collection_name": coll_name,
                            "original_url": href,
                            "normalized_url": normalized,
                            "content_type": self._classify_url(normalized),
                            "shortcode": self._extract_shortcode_from_url(normalized),
                            "creator_username": self._extract_username_from_url(normalized),
                            "caption": a_tag.get_text(strip=True) or None,
                            "hashtags": [],
                            "saved_at": None,
                            "source_file": file_path,
                        })
                    sibling = sibling.find_next_sibling() if sibling else None
        return items

    def _key_to_collection_name(self, key: str) -> str:
        name = key.replace("saved_", "").replace("_", " ").strip()
        return name.title() if name else "Unnamed Collection"

    def _extract_collection_name_from_path(self, file_path: str) -> str:
        parts = file_path.replace("\\", "/").split("/")
        for part in reversed(parts):
            name = part.replace(".html", "").replace(".htm", "").replace(".json", "")
            if name.lower() not in ("index", "collection", "collections"):
                return self._key_to_collection_name(name)
        return "Saved Collection"
