"""
Transcriber — responsible for converting audio to text.

Single responsibility: given an audio file path, return a transcript string.
Uses faster-whisper with large-v3 model for best Hindi/Hinglish accuracy.
Temperature=0 for deterministic output (required for cache correctness).
"""


def transcribe(audio_path: str) -> tuple[str, str]:
    """
    Transcribe an audio file.

    Returns:
        (transcript_text, detected_language)

    The model auto-detects Hindi/English/Hinglish and handles
    code-switching naturally.
    """
    from faster_whisper import WhisperModel

    model = WhisperModel(
        "large-v3",
        device="cuda",
        compute_type="float16",
    )

    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        temperature=0.0,       # deterministic — required for cache correctness
        language=None,         # auto-detect: handles Hindi, English, Hinglish
        vad_filter=True,       # skip silence segments
        vad_parameters={
            "min_silence_duration_ms": 500,
        },
    )

    transcript = " ".join(seg.text.strip() for seg in segments)
    detected_lang = info.language  # "hi", "en", etc.

    # Map to our canonical language labels
    lang_map = {"hi": "hindi", "en": "english"}
    language = lang_map.get(detected_lang, "hinglish")

    return transcript.strip(), language
