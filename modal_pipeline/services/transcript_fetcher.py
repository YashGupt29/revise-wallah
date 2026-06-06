"""
TranscriptFetcher — fetches transcript from YouTube's caption API.

Uses youtube-transcript-api 0.5.0 which fetches captions directly.
No audio download, no bot detection issues, much faster than Whisper.
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

    # Try Hindi, then English, then any available language
    for languages, lang_label in [
        (["hi"], "hindi"),
        (["en"], "english"),
        (None, "hinglish"),
    ]:
        try:
            if languages:
                entries = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
            else:
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                transcript = next(iter(transcript_list))
                entries = transcript.fetch()

            text = " ".join(
                e["text"].strip() for e in entries if e.get("text", "").strip()
            )
            if text:
                return text, lang_label
        except Exception:
            continue

    raise ValueError(
        "No captions available for this video. "
        "Please try a video that has subtitles/captions enabled."
    )
