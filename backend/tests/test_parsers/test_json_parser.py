"""Tests for Instagram JSON parser."""

import json
from app.parsers.json_parser import InstagramJSONParser


def test_parse_saved_posts_json():
    sample_data = {
        "saved_saved_media": [
            {
                "title": "creator_one",
                "string_list_data": [
                    {
                        "href": "https://www.instagram.com/reel/C_123456789/",
                        "value": "Great video #tech",
                        "timestamp": 1720000000,
                    }
                ],
            }
        ]
    }
    content = json.dumps(sample_data).encode("utf-8")
    parser = InstagramJSONParser()

    confidence = parser.can_parse("your_instagram_activity/saved/saved_posts.json", content)
    assert confidence > 0.5

    result = parser.parse("your_instagram_activity/saved/saved_posts.json", content)
    assert result.category == "saved_posts"
    assert len(result.items) == 1
    item = result.items[0]
    assert item["creator_username"] == "creator_one"
    assert "https://www.instagram.com/reel/C_123456789" in item["original_url"]
    assert item["content_type"] == "reel"


def test_parse_collections_json():
    sample_col = {
        "saved_collections": [
            {
                "title": "My Favorite Tutorials",
                "media_list_data": [
                    {
                        "href": "https://www.instagram.com/p/D_987654321/",
                        "creation_timestamp": 1720100000,
                    }
                ],
            }
        ]
    }
    content = json.dumps(sample_col).encode("utf-8")
    parser = InstagramJSONParser()

    result = parser.parse("your_instagram_activity/saved/saved_collections.json", content)
    assert result.category == "collections"
    assert len(result.items) == 1
    assert result.items[0]["name"] == "My Favorite Tutorials"
    assert len(result.items[0]["items"]) == 1
