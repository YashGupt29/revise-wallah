"""
AudioExtractor — responsible for downloading audio from a YouTube URL.

Single responsibility: given a URL, return a local audio file path.
Uses yt-dlp with conservative settings suitable for lecture audio.
"""

import os
import tempfile


def extract_audio(youtube_url: str, output_dir: str) -> tuple[str, dict]:
    """
    Download audio from a YouTube video.

    Returns:
        (audio_file_path, metadata) where metadata contains
        title, channel, duration_seconds.

    Raises:
        ValueError: if the URL is invalid or video is unavailable.
    """
    import yt_dlp

    output_template = os.path.join(output_dir, "%(id)s.%(ext)s")

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "128",  # 128kbps sufficient for speech
            }
        ],
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,  # never download a full playlist
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=True)

    video_id = info["id"]
    audio_path = os.path.join(output_dir, f"{video_id}.mp3")

    metadata = {
        "title": info.get("title", ""),
        "channel_name": info.get("uploader", ""),
        "duration_seconds": int(info.get("duration", 0)),
    }

    return audio_path, metadata
