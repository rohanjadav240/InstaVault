"""Tests for data cleaning service."""

from app.services.cleaning_service import CleaningService


def test_url_normalization():
    # Strips query params, trailing slashes, forces https
    raw = "http://instagram.com/reel/C_abc12345/?igsh=xyz123&utm_source=ig_web_copy_link"
    normalized = CleaningService.normalize_url(raw)
    assert normalized == "https://www.instagram.com/reel/C_abc12345"

    raw_post = "https://www.instagram.com/p/D_def67890///?foo=bar"
    assert CleaningService.normalize_url(raw_post) == "https://www.instagram.com/p/D_def67890"


def test_shortcode_extraction():
    url = "https://www.instagram.com/reel/C_abc12345/?igsh=123"
    assert CleaningService.extract_shortcode(url) == "C_abc12345"

    post_url = "https://www.instagram.com/p/D_xyz999/"
    assert CleaningService.extract_shortcode(post_url) == "D_xyz999"


def test_username_normalization():
    assert CleaningService.normalize_username("@Tech_Creator ") == "tech_creator"
    assert CleaningService.normalize_username("@@alex.design") == "alex.design"
    assert CleaningService.normalize_username(None) is None


def test_caption_cleaning():
    raw = "Check out this &amp; that &lt;script&gt;   amazing   tip!\n\n\n\nMore info."
    cleaned = CleaningService.clean_caption(raw)
    assert "&amp;" not in cleaned
    assert "Check out this & that <script> amazing tip!" in cleaned


def test_hashtag_extraction():
    caption = "Building an #AI assistant with #Python and #react! Also #ai again."
    tags = CleaningService.extract_hashtags(caption)
    assert tags == ["ai", "python", "react"]
