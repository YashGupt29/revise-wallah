from pydantic import BaseModel
from typing import Optional


class ConceptRelationship(BaseModel):
    from_concept: str
    to_concept: str
    type: str  # prerequisite | similar | leads_to


class Concept(BaseModel):
    name: str
    description: str
    exam_tags: list[str] = []
    timestamp_approx: Optional[int] = None


class NoteSection(BaseModel):
    heading: str
    bullets: list[str] = []
    formulas: list[str] = []
    definitions: list[str] = []


class Notes(BaseModel):
    summary: str
    sections: list[NoteSection] = []


class Flashcard(BaseModel):
    question: str
    answer: str


class QuizOption(BaseModel):
    text: str


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct: int  # 0-indexed
    concept: str
    explanation: str


class GeneratedContent(BaseModel):
    title: str
    subject: str
    topic: str
    language: str  # hindi | english | hinglish
    concepts: list[Concept] = []
    concept_relationships: list[ConceptRelationship] = []
    notes: Notes
    flashcards: list[Flashcard] = []
    quiz: list[QuizQuestion] = []


class PipelineResult(BaseModel):
    youtube_url: str
    url_hash: str
    title: str
    channel_name: Optional[str]
    duration_seconds: int
    language: str
    transcript: str
    content: GeneratedContent
