"""
NoteGenerator — responsible for turning a transcript into structured content.

Single responsibility: given a transcript, call Gemini and return validated JSON.
Temperature=0 is non-negotiable — output must be deterministic for caching.
"""

import json
import os
import re
import time

from google import genai
from google.genai import types

from modal_pipeline.models.schemas import GeneratedContent
from modal_pipeline.prompts import build_note_generation_prompt

# Transcript character cap — keeps Gemini within context limits while retaining
# enough content for a 2-3hr lecture (roughly 80k chars ≈ 60-90 mins of speech)
_TRANSCRIPT_CHAR_CAP = 80_000

# Retry config for transient Gemini 503 / 429 errors
_MAX_RETRIES = 4
_RETRY_BACKOFF = [5, 15, 30, 60]  # seconds between attempts


def generate_notes(transcript: str) -> GeneratedContent:
    """
    Call Gemini 2.5 Flash with temperature=0 and parse the response.
    Retries up to 4 times on 503/429 (model overload / rate limit).

    Raises:
        ValueError: if Gemini output cannot be parsed into the expected schema.
        Exception: if all retries are exhausted.
    """
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    system_prompt, user_prompt = build_note_generation_prompt(
        transcript[:_TRANSCRIPT_CHAR_CAP]
    )

    last_exc: Exception = RuntimeError("No attempts made")

    for attempt in range(_MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.0,
                    response_mime_type="application/json",
                ),
            )

            raw = response.text.strip()
            raw = re.sub(r"^```(?:json)?\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)

            data = json.loads(raw)
            return GeneratedContent(**data)

        except Exception as exc:
            last_exc = exc
            err_str = str(exc).lower()
            is_retryable = "503" in err_str or "unavailable" in err_str or "429" in err_str or "quota" in err_str or "rate" in err_str

            if not is_retryable or attempt == _MAX_RETRIES - 1:
                raise

            wait = _RETRY_BACKOFF[attempt]
            print(f"Gemini attempt {attempt + 1} failed ({exc}), retrying in {wait}s…")
            time.sleep(wait)

    raise last_exc
