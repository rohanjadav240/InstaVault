"""Generator for synthetic Instagram backup archives for tests and live demo."""

import io
import json
import zipfile
from pathlib import Path


def create_synthetic_instagram_backup(target_path: Path | None = None) -> bytes:
    """Creates an in-memory or on-disk synthetic Instagram export ZIP file."""
    buf = io.BytesIO()

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # 1. Saved Posts (JSON format)
        saved_posts_json = {
            "saved_saved_media": [
                {
                    "title": "tech_creator",
                    "string_list_data": [
                        {
                            "href": "https://www.instagram.com/reel/C_abc12345/?igsh=xyz",
                            "value": "Exploring modern AI agent architectures #tech #coding #ai",
                            "timestamp": 1720000000,
                        }
                    ],
                },
                {
                    "title": "design_daily",
                    "media_list_data": [
                        {
                            "uri": "https://www.instagram.com/p/D_def67890/",
                            "title": "Clean dark mode SaaS dashboard concept #design #uiux",
                            "creation_timestamp": 1720100000,
                        }
                    ],
                },
                # Duplicate entry in another collection/save
                {
                    "title": "tech_creator",
                    "string_list_data": [
                        {
                            "href": "https://www.instagram.com/reel/C_abc12345/",
                            "value": "Exploring modern AI agent architectures #tech #coding #ai",
                            "timestamp": 1720000000,
                        }
                    ],
                },
            ]
        }
        zf.writestr(
            "your_instagram_activity/saved/saved_posts.json",
            json.dumps(saved_posts_json, indent=2),
        )

        # 2. Saved Collections (JSON format)
        collections_json = {
            "saved_collections": [
                {
                    "title": "Inspiration",
                    "media_list_data": [
                        {
                            "href": "https://www.instagram.com/p/D_def67890/",
                            "creation_timestamp": 1720100000,
                        }
                    ],
                },
                {
                    "title": "Code Tutorials",
                    "media_list_data": [
                        {
                            "href": "https://www.instagram.com/reel/C_abc12345/",
                            "creation_timestamp": 1720000000,
                        }
                    ],
                },
            ]
        }
        zf.writestr(
            "your_instagram_activity/saved/saved_collections.json",
            json.dumps(collections_json, indent=2),
        )

        # 3. Followers (JSON format)
        followers_json = [
            {
                "title": "",
                "string_list_data": [
                    {
                        "href": "https://www.instagram.com/jane_dev",
                        "value": "jane_dev",
                        "timestamp": 1715000000,
                    }
                ],
            },
            {
                "title": "",
                "string_list_data": [
                    {
                        "href": "https://www.instagram.com/alex_designer",
                        "value": "alex_designer",
                        "timestamp": 1716000000,
                    }
                ],
            },
        ]
        zf.writestr(
            "connections/followers_and_following/followers_1.json",
            json.dumps(followers_json, indent=2),
        )

        # 4. Following (JSON format)
        following_json = {
            "relationships_following": [
                {
                    "title": "",
                    "string_list_data": [
                        {
                            "href": "https://www.instagram.com/tech_creator",
                            "value": "tech_creator",
                            "timestamp": 1714000000,
                        }
                    ],
                }
            ]
        }
        zf.writestr(
            "connections/followers_and_following/following.json",
            json.dumps(following_json, indent=2),
        )

        # 5. Likes (JSON format)
        likes_json = {
            "likes_media_likes": [
                {
                    "title": "photography_hub",
                    "string_list_data": [
                        {
                            "href": "https://www.instagram.com/p/E_ghi11111/",
                            "timestamp": 1719000000,
                        }
                    ],
                }
            ]
        }
        zf.writestr(
            "your_instagram_activity/likes/liked_posts.json",
            json.dumps(likes_json, indent=2),
        )

        # 6. Comments (JSON format)
        comments_json = {
            "comments_media_comments": [
                {
                    "string_list_data": [
                        {
                            "value": "Awesome tutorial! Keep it up.",
                            "timestamp": 1718000000,
                        }
                    ],
                    "title": "tech_creator",
                }
            ]
        }
        zf.writestr(
            "your_instagram_activity/comments/post_comments_1.json",
            json.dumps(comments_json, indent=2),
        )

        # 7. Messages (JSON format)
        messages_json = {
            "participants": [{"name": "Jane Dev"}, {"name": "Me"}],
            "messages": [
                {
                    "sender_name": "Jane Dev",
                    "timestamp_ms": 1719500000000,
                    "content": "Hey! Did you check out the new InstaVault release?",
                }
            ],
            "title": "Jane Dev",
        }
        zf.writestr(
            "your_instagram_activity/messages/inbox/janedev_123/message_1.json",
            json.dumps(messages_json, indent=2),
        )

        # 8. HTML Export Format sample
        sample_html = """<!DOCTYPE html>
<html>
<head><title>Saved Posts</title></head>
<body>
  <div>
    <h2>Saved</h2>
    <div>
      <a href="https://www.instagram.com/reel/Z_html99999/">Instagram Reel</a>
      <div>Amazing React performance tips #react #javascript</div>
      <time datetime="2024-06-01T12:00:00Z">June 1, 2024</time>
    </div>
  </div>
</body>
</html>"""
        zf.writestr("html_export/saved/saved_posts.html", sample_html)

    data = buf.getvalue()
    if target_path:
        target_path.write_bytes(data)

    return data
