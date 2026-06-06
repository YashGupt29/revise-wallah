"""
Parser — responsible for converting GeneratedContent into all output formats.

Single responsibility: transform the canonical JSON into
structured markdown, handwritten HTML, flashcard list, quiz list.
All formats derived from one source of truth — never touch raw transcript here.
"""

from modal_pipeline.models.schemas import GeneratedContent, Flashcard, QuizQuestion


def to_structured_markdown(content: GeneratedContent) -> str:
    """Convert GeneratedContent → structured markdown notes."""
    lines: list[str] = []

    lines.append(f"# {content.title}")
    lines.append(f"> **Subject:** {content.subject} | **Topic:** {content.topic}")
    lines.append("")
    lines.append("## Summary")
    lines.append(content.notes.summary)
    lines.append("")

    for section in content.notes.sections:
        lines.append(f"## {section.heading}")

        if section.bullets:
            for bullet in section.bullets:
                lines.append(f"- {bullet}")

        if section.formulas:
            lines.append("")
            lines.append("**Formulas:**")
            for formula in section.formulas:
                lines.append(f"$$\n{formula}\n$$")

        if section.definitions:
            lines.append("")
            lines.append("**Key Definitions:**")
            for defn in section.definitions:
                lines.append(f"- {defn}")

        lines.append("")

    return "\n".join(lines)


def to_handwritten_html(content: GeneratedContent) -> str:
    """Convert GeneratedContent → handwritten-style HTML."""
    sections_html = ""
    for section in content.notes.sections:
        bullets_html = "".join(f"<li>{b}</li>" for b in section.bullets)
        formulas_html = (
            "".join(f'<div class="formula">{f}</div>' for f in section.formulas)
            if section.formulas else ""
        )
        definitions_html = (
            "".join(f'<div class="definition">{d}</div>' for d in section.definitions)
            if section.definitions else ""
        )
        sections_html += f"""
        <div class="section">
          <h2 class="section-heading">{section.heading}</h2>
          <ul class="bullets">{bullets_html}</ul>
          {formulas_html}
          {definitions_html}
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap');
    body {{
      font-family: 'Caveat', cursive;
      background: #fefce8;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      color: #1c1917;
    }}
    h1 {{ font-size: 2rem; color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; }}
    .meta {{ color: #78716c; font-size: 1rem; margin-bottom: 24px; }}
    .summary {{ background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 12px 16px;
               border-radius: 4px; margin-bottom: 24px; }}
    .section {{ margin-bottom: 32px; }}
    .section-heading {{ font-size: 1.5rem; color: #4f46e5; margin-bottom: 8px; }}
    .bullets {{ padding-left: 20px; line-height: 2; }}
    .bullets li {{ margin-bottom: 4px; }}
    .formula {{ background: #ede9fe; border-radius: 6px; padding: 8px 12px;
                font-family: monospace; margin: 8px 0; font-size: 0.9rem; }}
    .definition {{ border-bottom: 1px dashed #a78bfa; padding: 4px 0; margin: 4px 0; }}
  </style>
</head>
<body>
  <h1>{content.title}</h1>
  <div class="meta">{content.subject} · {content.topic}</div>
  <div class="summary">{content.notes.summary}</div>
  {sections_html}
</body>
</html>"""


def to_flashcards(content: GeneratedContent) -> list[dict]:
    """Convert GeneratedContent → list of flashcard dicts."""
    return [{"question": fc.question, "answer": fc.answer} for fc in content.flashcards]


def to_quiz(content: GeneratedContent) -> list[dict]:
    """Convert GeneratedContent → list of quiz question dicts."""
    return [
        {
            "question": q.question,
            "options": q.options,
            "correct": q.correct,
            "concept": q.concept,
            "explanation": q.explanation,
        }
        for q in content.quiz
    ]


def to_concepts(content: GeneratedContent) -> list[dict]:
    """Extract concept list for graph seed storage."""
    return [
        {
            "name": c.name,
            "description": c.description,
            "exam_tags": c.exam_tags,
            "timestamp_approx": c.timestamp_approx,
        }
        for c in content.concepts
    ]


def to_concept_relationships(content: GeneratedContent) -> list[dict]:
    """Extract concept relationships for graph seed storage."""
    return [
        {
            "from_concept": r.from_concept,
            "to_concept": r.to_concept,
            "type": r.type,
        }
        for r in content.concept_relationships
    ]
