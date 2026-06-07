from pydantic import BaseModel, Field
from typing import Optional


class ConceptRelationship(BaseModel):
    from_concept: str
    to_concept: str
    type: str  # prerequisite | similar | leads_to | confuses_with | part_of | contrasts_with
    explanation: str = ""


class Concept(BaseModel):
    name: str
    description: str
    exam_tags: list[str] = []
    importance: str = "supporting"  # core | supporting | supplementary
    timestamp_approx: Optional[int] = None
    prerequisites: list[str] = []


class NoteSection(BaseModel):
    heading: str
    order: int = 0
    bullets: list[str] = []
    formulas: list[str] = []
    definitions: list[str] = []
    examples: list[str] = []
    exam_tips: list[str] = []
    code_snippets: list[dict] = []      # [{"language": "python"|"java"|"cpp", "code": "..."}]
    real_world_examples: list[str] = [] # concrete real-world scenarios, no analogies


class Notes(BaseModel):
    summary: str
    key_takeaways: list[str] = []
    sections: list[NoteSection] = []


class Flashcard(BaseModel):
    question: str
    answer: str
    concept: str = ""
    difficulty: str = "medium"  # easy | medium | hard
    exam_tags: list[str] = []


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct: int  # 0-indexed
    concept: str
    explanation: str
    difficulty: str = "medium"  # easy | medium | hard
    exam_tags: list[str] = []
    marks: int = 4


class MindMapChild(BaseModel):
    label: str
    leaf: bool = True


class MindMapBranch(BaseModel):
    label: str
    children: list[MindMapChild] = []


class MindMap(BaseModel):
    root: str
    branches: list[MindMapBranch] = []


class RevisionSchedule(BaseModel):
    first_revision: str = "same day"
    second_revision: str = "3 days"
    third_revision: str = "2 weeks"
    rationale: str = ""


class CommonMistake(BaseModel):
    mistake: str
    correction: str
    related_concept: str = ""


class GlossaryEntry(BaseModel):
    term: str
    definition: str
    example: str = ""


class ShortNoteSection(BaseModel):
    heading: str
    formulas: list[str] = []
    key_concepts: list[str] = []   # one-liner each, max 12 words
    definitions: list[str] = []    # "Term: crisp definition"
    must_remember: list[str] = []  # exam tips, mnemonics, common mistakes

class ShortNotesContent(BaseModel):
    sections: list[ShortNoteSection] = []


class GeneratedContent(BaseModel):
    title: str
    subject: str
    topic: str
    subtopic: str = ""
    language: str  # hindi | english | hinglish
    difficulty_level: str = "intermediate"  # beginner | intermediate | advanced
    concepts: list[Concept] = []
    concept_relationships: list[ConceptRelationship] = []
    notes: Notes
    flashcards: list[Flashcard] = []
    quiz: list[QuizQuestion] = []
    mind_map: Optional[MindMap] = None
    revision_schedule: Optional[RevisionSchedule] = None
    common_mistakes: list[CommonMistake] = []
    glossary: list[GlossaryEntry] = []


class PipelineResult(BaseModel):
    youtube_url: str
    url_hash: str
    title: str
    channel_name: Optional[str]
    duration_seconds: int
    language: str
    transcript: str
    content: GeneratedContent
