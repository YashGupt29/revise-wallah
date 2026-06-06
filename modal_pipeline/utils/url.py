"""URL normalisation and hashing utilities."""

import hashlib
import re
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse


def normalize_youtube_url(url: str) -> str:
    """
    Normalize a YouTube URL to a canonical form so that
    different URL variants of the same video produce the same hash.

    Strips: playlist params, timestamps, tracking params, shorts alias.
    Keeps: video ID only.
    """
    parsed = urlparse(url.strip())
    params = parse_qs(parsed.query)

    # Handle youtu.be short links
    if parsed.netloc in ("youtu.be", "www.youtu.be"):
        video_id = parsed.path.lstrip("/")
        return f"https://www.youtube.com/watch?v={video_id}"

    # Handle /shorts/VIDEO_ID
    shorts_match = re.match(r"/shorts/([a-zA-Z0-9_-]+)", parsed.path)
    if shorts_match:
        video_id = shorts_match.group(1)
        return f"https://www.youtube.com/watch?v={video_id}"

    # Standard watch URL — keep only v=
    video_id = params.get("v", [None])[0]
    if video_id:
        return f"https://www.youtube.com/watch?v={video_id}"

    return url.strip()


def hash_url(normalized_url: str) -> str:
    """SHA-256 hash of a normalized URL — used as the cache key."""
    return hashlib.sha256(normalized_url.encode()).hexdigest()
