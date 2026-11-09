"""Parser for Instagram HTML export files using BeautifulSoup."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from bs4 import BeautifulSoup, Tag

from app.parsers.base_parser import BaseParser, ParseResult


class InstagramHTMLParser(BaseParser):
    """Generic parser for Instagram HTML data-export files.

    Handles table-based layouts, card-div layouts, and generic HTML links.
    """

    _TS_PATTERNS: list[tuple[str, str]] = [
        (r"\w+ \d{1,2}, \d{4},? \d{1,2}:\d{2}:\d{2}\s*[APap][Mm]",
         "%b %d, %Y, %I:%M:%S %p"),
        (r"\w+ \d{1,2}, \d{4},? \d{1,2}:\d{2}\s*[APap][Mm]",
         "%b %d, %Y, %I:%M %p"),
        (r"\w+ \d{1,2}, \d{4}",
         "%b %d, %Y"),
        (r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}",
         "%Y-%m-%dT%H:%M:%S"),
        (r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}",
         "%Y-%m-%d %H:%M:%S"),
    ]

    def can_parse(self, file_path: str, content: str | bytes) -> float:
        path_lower = self._safe_path_lower(file_path)
        if not path_lower.endswith((".html", ".htm")):
            return 0.0
        text = self._ensure_str(content)
        score = 0.3
        if "instagram.com" in text:
            score += 0.3
        if "_a6-g" in text or "_a6-p" in text or "_3-95" in text or "table" in text:
            score += 0.2
        return min(score, 1.0)

    def parse(self, file_path: str, content: str | bytes) -> ParseResult:
        text = self._ensure_str(content)
        result = ParseResult(category=self._guess_category(file_path), source_file=file_path)
        soup = BeautifulSoup(text, "html.parser")

        # 1. First priority: if page has tables, use table-walking parser
        items = self._parse_table_walker(soup, file_path)
        if not items:
            items = self._parse_card_divs(soup, file_path)
        if not items:
            items = self._parse_generic_links(soup, file_path)

        result.items = items
        return result

    def _parse_table_walker(self, soup: BeautifulSoup, file_path: str) -> list[dict[str, Any]]:
        """Walk Instagram link elements and extract metadata from enclosing table containers."""
        items: list[dict[str, Any]] = []
        links = soup.find_all("a", href=lambda h: h and "instagram.com" in h)
        if not links:
            return items

        seen_urls: set[str] = set()

        for a in links:
            href = a.get("href", "")
            normalized = self._normalize_url(href)
            if normalized in seen_urls:
                continue
            seen_urls.add(normalized)

            # Find parent table
            cur = a
            parent_table = None
            while cur and cur.name != "body":
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
            saved_at = None

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
                        elif lbl in ("Time", "Date", "Saved on") and not saved_at:
                            saved_at = self._extract_timestamp_from_text(val)

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
                "original_url": href,
                "normalized_url": normalized,
                "content_type": self._classify_url(normalized),
                "shortcode": self._extract_shortcode_from_url(normalized),
                "creator_username": final_creator,
                "caption": caption,
                "hashtags": hashtags,
                "saved_at": saved_at,
                "source_file": file_path,
            })
        return items

    def _parse_card_divs(self, soup: BeautifulSoup, file_path: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        cards = soup.find_all("div", class_=re.compile(r"_a6-g|_3-95|pam|_2pin"))
        for card in cards:
            links = card.find_all("a", href=True)
            ig_url = next((l["href"] for l in links if "instagram.com" in l["href"]), None)
            if not ig_url:
                continue

            normalized = self._normalize_url(ig_url)
            caption = self._extract_caption_from_card(card, ig_url)
            items.append({
                "original_url": ig_url,
                "normalized_url": normalized,
                "content_type": self._classify_url(normalized),
                "shortcode": self._extract_shortcode_from_url(normalized),
                "creator_username": self._extract_username_from_url(normalized),
                "caption": caption,
                "hashtags": self._extract_hashtags(caption) if caption else [],
                "saved_at": self._extract_timestamp_from_element(card),
                "source_file": file_path,
            })
        return items

    def _extract_caption_from_card(self, card: Tag, url: str) -> str | None:
        texts: list[str] = []
        for child in card.find_all(["div", "span", "p", "td"]):
            if child.find("a"):
                continue
            t = child.get_text(strip=True)
            if not t or t == url or self._looks_like_timestamp(t):
                continue
            texts.append(t)
        seen: set[str] = set()
        unique: list[str] = []
        for t in texts:
            if t not in seen:
                seen.add(t)
                unique.append(t)
        return " ".join(unique) if unique else None

    def _parse_generic_links(self, soup: BeautifulSoup, file_path: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        seen_urls: set[str] = set()
        for a_tag in soup.find_all("a", href=re.compile(r"instagram\.com")):
            href = a_tag["href"]
            normalized = self._normalize_url(href)
            if normalized in seen_urls:
                continue
            seen_urls.add(normalized)
            items.append({
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
        return items

    def _extract_timestamp_from_element(self, element: Tag) -> datetime | None:
        text = element.get_text(" ", strip=True)
        return self._extract_timestamp_from_text(text)

    def _extract_timestamp_from_text(self, text: str) -> datetime | None:
        for pattern, fmt in self._TS_PATTERNS:
            match = re.search(pattern, text)
            if match:
                try:
                    dt = datetime.strptime(match.group(0).strip(), fmt)
                    return dt.replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
        return None

    def _looks_like_timestamp(self, text: str) -> bool:
        return any(re.search(pat, text) is not None for pat, _ in self._TS_PATTERNS)
