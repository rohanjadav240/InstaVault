"""Parser for Instagram DM / messages exports."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from bs4 import BeautifulSoup

from app.parsers.base_parser import BaseParser, ParseResult


class MessagesParser(BaseParser):
    """Parse direct message threads from Instagram exports (HTML + JSON)."""

    def can_parse(self, file_path: str, content: str | bytes) -> float:
        p = self._safe_path_lower(file_path)
        if not any(kw in p for kw in ("message", "inbox", "direct")):
            return 0.0
        if p.endswith(".json"):
            text = self._ensure_str(content)
            try:
                data = json.loads(text)
                if isinstance(data, dict):
                    if any(k in data for k in ("messages", "participants", "thread_path")):
                        return 0.95
                    if any("message" in k.lower() or "inbox" in k.lower() for k in data.keys()):
                        return 0.85
            except (json.JSONDecodeError, ValueError):
                return 0.0
            return 0.6
        elif p.endswith((".html", ".htm")):
            return 0.7
        return 0.0

    def parse(self, file_path: str, content: str | bytes) -> ParseResult:
        text = self._ensure_str(content)
        result = ParseResult(category="messages", source_file=file_path)

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

        # Single-thread format: { "participants": [...], "messages": [...], "title": "..." }
        if "messages" in data and isinstance(data["messages"], list):
            thread_title = self._decode(data.get("title", ""))
            participants = self._extract_participants(data.get("participants", []))
            is_encrypted = data.get("is_still_participant") is not None  # heuristic
            for msg in data["messages"]:
                if not isinstance(msg, dict):
                    continue
                items.append(self._parse_message_entry(msg, thread_title, participants, file_path, is_encrypted))
            return items

        # Multi-thread or keyed format
        for key, value in data.items():
            if not isinstance(value, list):
                continue
            for entry in value:
                if not isinstance(entry, dict):
                    continue
                if "messages" in entry:
                    thread_title = self._decode(entry.get("title", ""))
                    participants = self._extract_participants(entry.get("participants", []))
                    for msg in entry["messages"]:
                        if isinstance(msg, dict):
                            items.append(self._parse_message_entry(msg, thread_title, participants, file_path, False))
                else:
                    # Flat message entry
                    items.append(self._parse_message_entry(entry, key, [], file_path, False))
        return items

    def _parse_message_entry(
        self, msg: dict, thread_title: str, participants: list[str], file_path: str, is_encrypted: bool
    ) -> dict[str, Any]:
        sender = self._decode(msg.get("sender_name", ""))
        content_text = self._decode(msg.get("content", ""))
        ts_ms = msg.get("timestamp_ms")
        ts = msg.get("timestamp")

        # Determine content type
        c_type = "text"
        if msg.get("photos"):
            c_type = "media"
        elif msg.get("videos"):
            c_type = "media"
        elif msg.get("audio_files"):
            c_type = "audio"
        elif msg.get("share"):
            c_type = "link"
        elif msg.get("sticker"):
            c_type = "sticker"

        timestamp = None
        if ts_ms is not None:
            try:
                timestamp = datetime.fromtimestamp(int(ts_ms) / 1000, tz=timezone.utc)
            except (ValueError, TypeError, OSError):
                pass
        if timestamp is None and ts is not None:
            try:
                timestamp = datetime.fromtimestamp(int(ts), tz=timezone.utc)
            except (ValueError, TypeError, OSError):
                pass

        return {
            "thread_title": thread_title,
            "participants": json.dumps(participants),
            "sender_username": sender,
            "content": content_text or None,
            "content_type": c_type,
            "timestamp": timestamp,
            "source_file": file_path,
            "is_encrypted": is_encrypted,
        }

    def _parse_html(self, text: str, file_path: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        soup = BeautifulSoup(text, "lxml")

        # Instagram HTML message exports have thread-structured divs
        thread_title = ""
        title_el = soup.find(["h1", "h2", "h3", "title"])
        if title_el:
            thread_title = title_el.get_text(strip=True)

        # Messages are in div blocks with user and content
        msg_blocks = soup.find_all("div", class_=lambda c: c and ("pam" in c or "_a6-g" in c or "_3-95" in c))
        if not msg_blocks:
            msg_blocks = soup.find_all("div", recursive=False)

        for block in msg_blocks:
            # Try to extract sender and content
            sub_divs = block.find_all("div", recursive=False)
            sender = ""
            content_text = ""
            for sd in sub_divs:
                t = sd.get_text(strip=True)
                if not sender:
                    sender = t
                elif not content_text:
                    content_text = t
            if sender or content_text:
                items.append({
                    "thread_title": thread_title,
                    "participants": "[]",
                    "sender_username": sender,
                    "content": content_text or None,
                    "content_type": "text",
                    "timestamp": None,
                    "source_file": file_path,
                    "is_encrypted": False,
                })
        return items

    def _extract_participants(self, parts: list) -> list[str]:
        names: list[str] = []
        for p in parts:
            if isinstance(p, dict):
                name = p.get("name", "")
                if name:
                    names.append(self._decode(name))
            elif isinstance(p, str):
                names.append(p)
        return names

    def _decode(self, value: Any) -> str:
        if not isinstance(value, str):
            return str(value) if value is not None else ""
        try:
            return value.encode("latin-1").decode("utf-8")
        except (UnicodeDecodeError, UnicodeEncodeError):
            return value
