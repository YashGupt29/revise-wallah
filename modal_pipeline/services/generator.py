"""
NoteGenerator — responsible for turning a transcript into structured content.

Single responsibility: given a transcript, call Gemini and return validated JSON.
Temperature=0 is non-negotiable — output must be deterministic for caching.
"""

import json
import os
import re

from google import genai
from google.genai import types

from modal_pipeline.models.schemas import GeneratedContent
from modal_pipeline.prompts import build_note_generation_prompt

# Transcript character cap — keeps Gemini within context limits while retaining
# enough content for a 2-3hr lecture (roughly 80k chars ≈ 60-90 mins of speech)
_TRANSCRIPT_CHAR_CAP = 80_000


def generate_notes(transcript: str) -> GeneratedContent:
    """
    Call Gemini 2.5 Flash with temperature=0 and parse the response.

    Raises:
        ValueError: if Gemini output cannot be parsed into the expected schema.
    """
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    system_prompt, user_prompt = build_note_generation_prompt(
        transcript[:_TRANSCRIPT_CHAR_CAP]
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.0,
            response_mime_type="application/json",
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )

    raw = response.text.strip()

    # Strip accidental markdown fences if model slips up
    raw = re.sub(r"^```(?:json)?\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)

    data = json.loads(raw)
    return GeneratedContent(**data)
