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

    Tries in order:
        1. Hindi manual captions
        2. English manual captions
        3. Hindi auto-generated
        4. English auto-generated
        5. Any available transcript
    """
    from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound

    video_id = _extract_video_id(youtube_url)

    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

    # Priority order for Indian educational content
    language = "hinglish"
    transcript = None

    try:
        transcript = transcript_list.find_manually_created_transcript(["hi", "en"])
        language = "hindi" if transcript.language_code == "hi" else "english"
    except NoTranscriptFound:
        pass

    if not transcript:
        try:
            transcript = transcript_list.find_generated_transcript(["hi", "en"])
            language = "hindi" if transcript.language_code == "hi" else "english"
        except NoTranscriptFound:
            pass

    if not transcript:
        # Last resort — take whatever is available
        transcript = next(iter(transcript_list))
        language = "hinglish"

    entries = transcript.fetch()
    text = " ".join(entry["text"].strip() for entry in entries if entry["text"].strip())

    return text, language
