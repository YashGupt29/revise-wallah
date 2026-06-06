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

    # Try Hindi first, then English, then anything available
    for languages in (["hi"], ["en"], None):
        try:
            if languages:
                transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
            else:
                # Fetch whatever is available
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                transcript = next(iter(transcript_list))
                transcript_data = transcript.fetch()

            text = " ".join(
                entry.get("text", "").strip()
                for entry in transcript_data
                if entry.get("text", "").strip()
            )
            if text:
                lang = "hindi" if languages == ["hi"] else "english" if languages == ["en"] else "hinglish"
                return text, lang
        except Exception:
            continue

    raise ValueError("No captions available for this video. Try a video with subtitles enabled.")
