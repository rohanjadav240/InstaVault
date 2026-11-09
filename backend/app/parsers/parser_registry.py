"""Registry that selects the best parser for a given file."""

from app.parsers.base_parser import BaseParser, ParseResult
from app.parsers.html_parser import InstagramHTMLParser
from app.parsers.json_parser import InstagramJSONParser
from app.parsers.saved_posts_parser import SavedPostsParser
from app.parsers.collections_parser import CollectionsParser
from app.parsers.followers_parser import FollowersParser
from app.parsers.following_parser import FollowingParser
from app.parsers.likes_parser import LikesParser
from app.parsers.comments_parser import CommentsParser
from app.parsers.messages_parser import MessagesParser
from app.parsers.stories_parser import StoriesParser


class ParserRegistry:
    """Finds the best parser for a given file by confidence score."""

    def __init__(self) -> None:
        self.parsers: list[BaseParser] = [
            SavedPostsParser(),
            CollectionsParser(),
            FollowersParser(),
            FollowingParser(),
            LikesParser(),
            CommentsParser(),
            MessagesParser(),
            StoriesParser(),
            InstagramHTMLParser(),   # Generic fallback
            InstagramJSONParser(),   # Generic fallback
        ]

    def find_parser(self, file_path: str, content: str | bytes) -> tuple[BaseParser | None, float]:
        """Return (best_parser, confidence) or (None, 0.0)."""
        best_parser: BaseParser | None = None
        best_confidence: float = 0.0
        for parser in self.parsers:
            try:
                confidence = parser.can_parse(file_path, content)
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_parser = parser
            except Exception:
                continue
        return (best_parser, best_confidence) if best_confidence > 0.1 else (None, 0.0)

    def parse_file(self, file_path: str, content: str | bytes) -> ParseResult | None:
        """Find the best parser and parse the file, or return None."""
        parser, confidence = self.find_parser(file_path, content)
        if parser:
            result = parser.parse(file_path, content)
            result.confidence = confidence
            return result
        return None
