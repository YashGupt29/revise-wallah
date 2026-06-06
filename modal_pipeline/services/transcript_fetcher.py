"""
TranscriptFetcher — fetches transcript from YouTube's caption API.

Single responsibility: given a YouTube URL, return the transcript text.
Uses youtube-transcript-api which fetches captions directly — no audio
download, no bot detection issues, much faster than Whisper on cloud IPs.

Falls back to manual captions → auto-generated → any available language.
"""

import re


def _extract_video_id(youtube_url: str) -> str:
    patterns = [
        r"(?:v=)([a-zA-Z0-9_-]{11})",
        r"(?:youtu\.be/)([a-zA-Z0-9_-]{11})",
        r"(?:shorts/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from URL: {youtube_url}")


def fetch_transcript(youtube_url: str) -> tuple[str, str]:
    """
    Fetch transcript from YouTube captions.

    Returns:
        (transcript_text, detected_language)
    """
    from youtube_transcript_api import YouTubeTranscriptApi

    video_id = _extract_video_id(youtube_url)

    # Try preferred languages first, then fall back to any available
    try:
        transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=["hi", "en"])
        language = "hindi" if transcript_data[0].get("language_code", "en") == "hi" else "english"
    except Exception:
        try:
            transcript_data = YouTubeTranscriptApi.get_transcript(video_id)
            language = "hinglish"
        except Exception as e:
            raise ValueError(f"No captions available for this video: {e}")

    text = " ".join(entry["text"].strip() for entry in transcript_data if entry["text"].strip())
    return text, language
