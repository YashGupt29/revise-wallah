"""
NoteGenerator — responsible for turning a transcript into structured content.

Single responsibility: given a transcript, call Gemini and return validated JSON.
Temperature=0 is non-negotiable — output must be deterministic for caching.
"""

import json
import os
import re

import google.generativeai as genai

from modal_pipeline.models.schemas import GeneratedContent

_SYSTEM_PROMPT = """You are an expert educational content analyser for Indian students.
You will receive a lecture transcript (may be Hindi, English, or Hinglish).
Return ONLY a valid JSON object — no markdown, no explanation, no code fences.
"""

_USER_PROMPT_TEMPLATE = """Analyse this lecture transcript and return a strict JSON object.

TRANSCRIPT:
{transcript}

Return this exact JSON structure:
{{
  "title": "string — short descriptive title",
  "subject": "string — e.g. Physics, Chemistry, Mathematics",
  "topic": "string — e.g. Mechanics, Organic Chemistry",
  "language": "hindi | english | hinglish",
  "concepts": [
    {{
      "name": "string",
      "description": "one sentence definition",
      "exam_tags": ["JEE", "NEET", "GATE", "UPSC"],
      "timestamp_approx": 120
    }}
  ],
  "concept_relationships": [
    {{
      "from_concept": "string",
      "to_concept": "string",
      "type": "prerequisite | similar | leads_to"
    }}
  ],
  "notes": {{
    "summary": "3-4 sentence overview",
    "sections": [
      {{
        "heading": "string",
        "bullets": ["string"],
        "formulas": ["string — use LaTeX notation"],
        "definitions": ["Term: definition"]
      }}
    ]
  }},
  "flashcards": [
    {{"question": "string", "answer": "string"}}
  ],
  "quiz": [
    {{
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "concept": "concept name this tests",
      "explanation": "why the correct answer is correct"
    }}
  ]
}}

Rules:
- Generate 15-25 flashcards covering key concepts
- Generate 10 quiz questions of mixed difficulty
- Extract all meaningful concepts with their relationships
- Identify exam relevance accurately (JEE/NEET/GATE/UPSC)
- sections should cover all major topics in order they appear
"""


def generate_notes(transcript: str) -> GeneratedContent:
    """
    Call Gemini 2.5 Flash with temperature=0 and parse the response.

    Raises:
        ValueError: if Gemini output cannot be parsed into the expected schema.
    """
    api_key = os.environ["GEMINI_API_KEY"]
    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=_SYSTEM_PROMPT,
    )

    response = model.generate_content(
        _USER_PROMPT_TEMPLATE.format(transcript=transcript[:80000]),  # 80k char cap
        generation_config=genai.GenerationConfig(
            temperature=0.0,       # deterministic — required for cache correctness
            response_mime_type="application/json",
        ),
    )

    raw = response.text.strip()

    # Strip accidental markdown fences if model slips up
    raw = re.sub(r"^```(?:json)?\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)

    data = json.loads(raw)
    return GeneratedContent(**data)
