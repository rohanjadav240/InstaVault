"""Tests for Instagram HTML parser."""

from app.parsers.html_parser import InstagramHTMLParser


def test_parse_html_saved_posts():
    html_content = """<!DOCTYPE html>
<html>
<head><title>Saved Posts</title></head>
<body>
  <div>
    <h2>Saved</h2>
    <div>
      <a href="https://www.instagram.com/p/B_html123/">Post Link</a>
      <div>Clean architecture with FastAPI #python #fastapi</div>
      <time datetime="2024-05-10T10:00:00Z">May 10, 2024</time>
    </div>
  </div>
</body>
</html>""".encode("utf-8")

    parser = InstagramHTMLParser()
    confidence = parser.can_parse("saved/saved_posts.html", html_content)
    assert confidence > 0.4

    result = parser.parse("saved/saved_posts.html", html_content)
    assert len(result.items) >= 1
    item = result.items[0]
    assert "https://www.instagram.com/p/B_html123" in item["original_url"]
    assert item["content_type"] == "post"
