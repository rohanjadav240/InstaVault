"""Data cleaning and normalization engine."""

import html
import re
from datetime import datetime, timezone
from urllib.parse import urlparse, urlunparse


class CleaningService:
    """Provides modular normalization functions for Instagram export data."""

    @staticmethod
    def normalize_url(url: str | None) -> str | None:
        """Standardize Instagram URLs: strip tracking params, lowercase host, strip trailing slash."""
        if not url:
            return None
        cleaned = url.strip()
        if cleaned.startswith("//"):
            cleaned = "https:" + cleaned
        elif not cleaned.startswith(("http://", "https://")):
            cleaned = "https://" + cleaned

        try:
            parsed = urlparse(cleaned)
            # Remove tracking query params (?igsh=..., ?utm_...)
            scheme = "https"
            netloc = parsed.netloc.lower()
            if netloc in ("instagram.com", "m.instagram.com") or "instagram.com" not in netloc:
                netloc = "www.instagram.com"
            path = parsed.path.rstrip("/")
            return urlunparse((scheme, netloc, path, "", "", ""))
        except Exception:
            return cleaned.split("?")[0].rstrip("/")

    @staticmethod
    def extract_shortcode(url: str | None) -> str | None:
        """Extract shortcode from Instagram post/reel URL."""
        if not url:
            return None
        match = re.search(r"/(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)", url)
        return match.group(1) if match else None

    @staticmethod
    def normalize_username(username: str | None) -> str | None:
        """Clean and lowercase username, stripping @ and whitespaces."""
        if not username:
            return None
        cleaned = username.strip().lstrip("@").lower()
        # Remove any non-standard chars
        cleaned = re.sub(r"[^\w.]", "", cleaned)
        return cleaned if cleaned else None

    @staticmethod
    def normalize_timestamp(raw_value: str | int | float | None) -> datetime | None:
        """Convert various epoch timestamp formats or ISO strings to UTC datetime."""
        if raw_value is None:
            return None

        # Integer or float epoch seconds/ms
        if isinstance(raw_value, (int, float)):
            try:
                seconds = raw_value / 1000.0 if raw_value > 1e11 else float(raw_value)
                return datetime.fromtimestamp(seconds, tz=timezone.utc)
            except Exception:
                return None

        if isinstance(raw_value, str):
            val = raw_value.strip()
            # Try numeric string
            if val.isdigit():
                try:
                    num = int(val)
                    seconds = num / 1000.0 if num > 1e11 else float(num)
                    return datetime.fromtimestamp(seconds, tz=timezone.utc)
                except Exception:
                    pass

            # Try common ISO formats
            for fmt in (
                "%Y-%m-%dT%H:%M:%S%z",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d %H:%M:%S",
                "%b %d, %Y, %I:%M %p",
            ):
                try:
                    dt = datetime.strptime(val, fmt)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    return dt
                except ValueError:
                    continue

        return None

    @staticmethod
    def clean_caption(caption: str | None) -> str | None:
        """Unescape HTML entities, strip excessive whitespace."""
        if not caption:
            return None
        unescaped = html.unescape(caption)
        # Normalize repeated whitespace/newlines
        normalized = re.sub(r"[ \t]+", " ", unescaped)
        normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip()
        return normalized if normalized else None

    @staticmethod
    def extract_hashtags(text: str | None) -> list[str]:
        """Extract unique lowercase hashtags without the leading '#'."""
        if not text:
            return []
        tags = re.findall(r"#([A-Za-z0-9_\u0080-\uFFFF]+)", text)
        # Unique preserving order
        seen = set()
        unique = []
        for t in tags:
            tl = t.lower()
            if tl not in seen:
                seen.add(tl)
                unique.append(tl)
        return unique
