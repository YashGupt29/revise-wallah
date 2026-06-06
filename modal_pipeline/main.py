"""
Modal app — entry point for the Revise Wallah pipeline.

Architecture:
  run_pipeline()       — orchestrator, called by Next.js API
  _step_extract()      — yt-dlp audio download
  _step_transcribe()   — faster-whisper transcription
  _step_generate()     — Gemini 2.5 Flash note generation
  _step_parse_store()  — parser + Supabase write

Each step updates job status in Supabase so the frontend
can show live progress via Supabase Realtime.
"""

import os
import tempfile

import modal

from pydantic import BaseModel

from modal_pipeline.utils.url import normalize_youtube_url, hash_url
from modal_pipeline.utils.supabase_client import get_supabase
from modal_pipeline.services.audio import extract_audio
from modal_pipeline.services.transcriber import transcribe
from modal_pipeline.services.generator import generate_notes
from modal_pipeline.services import parser

# ─── Modal image definition ──────────────────────────────────────────────────
# Pin all deps for reproducible builds

pipeline_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "yt-dlp==2024.12.13",
        "faster-whisper==1.1.0",
        "google-genai>=1.0.0",
        "supabase==2.10.0",
        "pydantic==2.10.3",
        "fastapi[standard]>=0.115.0",
    )
    .apt_install("ffmpeg")
    .add_local_python_source("modal_pipeline")
)

app = modal.App("revise-wallah-pipeline", image=pipeline_image)

# ─── Secrets — injected from Modal secret store, not env ─────────────────────
# Set these via: modal secret create revise-wallah-secrets KEY=value

pipeline_secrets = modal.Secret.from_name("revise-wallah-secrets")


# ─── Job status helper ────────────────────────────────────────────────────────

def _update_job(job_id: str, status: str, step: str, progress: int, error: str = None):
    """Update job record in Supabase — triggers Realtime event on frontend."""
    sb = get_supabase()
    update = {"status": status, "current_step": step, "progress": progress}
    if error:
        update["error_message"] = error
    if status == "done":
        from datetime import datetime, timezone
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
    sb.table("jobs").update(update).eq("id", job_id).execute()


# ─── Main orchestrator ────────────────────────────────────────────────────────

@app.function(
    cpu=2,
    memory=4096,
    timeout=600,
    secrets=[pipeline_secrets],
    retries=modal.Retries(max_retries=1, backoff_coefficient=1.0),
)
def run_pipeline(job_id: str, youtube_url: str, url_hash: str):
    """
    Full pipeline: YouTube URL → structured notes stored in Supabase.

    Called asynchronously by the Next.js API.
    Updates job.status at each step so the UI shows live progress.
    """
    sb = get_supabase()

    try:
        # ── Step 1: Extract audio ────────────────────────────────────────────
        _update_job(job_id, "processing", "extracting", 10)

        with tempfile.TemporaryDirectory() as tmp:
            audio_path, metadata = extract_audio(youtube_url, tmp)

            # ── Step 2: Transcribe ───────────────────────────────────────────
            _update_job(job_id, "processing", "transcribing", 35)
            transcript, language = transcribe(audio_path)

        # ── Step 3: Generate notes ───────────────────────────────────────────
        _update_job(job_id, "processing", "generating", 65)
        content = generate_notes(transcript)

        # ── Step 4: Parse into all formats ───────────────────────────────────
        _update_job(job_id, "processing", "parsing", 85)

        structured_md = parser.to_structured_markdown(content)
        handwritten_html = parser.to_handwritten_html(content)
        flashcards = parser.to_flashcards(content)
        quiz = parser.to_quiz(content)
        concepts = parser.to_concepts(content)
        relationships = parser.to_concept_relationships(content)

        # ── Step 5: Store processed video (shared cache) ─────────────────────
        _update_job(job_id, "processing", "storing", 90)

        video_row = (
            sb.table("processed_videos")
            .upsert(
                {
                    "url_hash": url_hash,
                    "youtube_url": youtube_url,
                    "title": metadata["title"],
                    "channel_name": metadata["channel_name"],
                    "duration_seconds": metadata["duration_seconds"],
                    "language": language,
                    "transcript": transcript,
                    "notes_json": content.model_dump(),
                    "notes_structured": structured_md,
                    "notes_handwritten": handwritten_html,
                    "flashcards_json": flashcards,
                    "quiz_json": quiz,
                    "status": "done",
                },
                on_conflict="url_hash",
            )
            .execute()
        )
        processed_video_id = video_row.data[0]["id"]

        # ── Step 6: Store graph seeds (concepts + relationships) ─────────────
        _store_concepts(sb, processed_video_id, concepts, relationships)

        # ── Step 7: Mark job done ─────────────────────────────────────────────
        sb.table("jobs").update(
            {"status": "done", "progress": 100, "current_step": "done",
             "processed_video_id": processed_video_id}
        ).eq("id", job_id).execute()

    except Exception as exc:
        _update_job(job_id, "failed", "failed", 0, error=str(exc))
        # Also mark the cached video as failed so retries work
        sb.table("processed_videos").update({"status": "failed"}).eq(
            "url_hash", url_hash
        ).execute()
        raise


def _store_concepts(sb, processed_video_id: str, concepts: list[dict], relationships: list[dict]):
    """
    Upsert concepts and relationships into graph seed tables.
    Non-blocking — failures here don't fail the job.
    """
    try:
        for concept in concepts:
            result = (
                sb.table("concepts")
                .upsert(
                    {
                        "name": concept["name"],
                        "description": concept["description"],
                        "exam_tags": concept["exam_tags"],
                    },
                    on_conflict="name",
                )
                .execute()
            )
            concept_id = result.data[0]["id"]

            # Link concept to this video
            sb.table("video_concepts").upsert(
                {
                    "processed_video_id": processed_video_id,
                    "concept_id": concept_id,
                    "timestamp_start": concept.get("timestamp_approx"),
                },
                on_conflict="processed_video_id,concept_id",
            ).execute()

        # Store relationships — look up concept IDs by name
        for rel in relationships:
            a = sb.table("concepts").select("id").eq("name", rel["from_concept"]).execute()
            b = sb.table("concepts").select("id").eq("name", rel["to_concept"]).execute()
            if a.data and b.data:
                sb.table("concept_relationships").upsert(
                    {
                        "concept_a_id": a.data[0]["id"],
                        "concept_b_id": b.data[0]["id"],
                        "relationship_type": rel["type"],
                    },
                    on_conflict="concept_a_id,concept_b_id,relationship_type",
                ).execute()
    except Exception:
        pass  # graph seeds are non-critical — don't fail the job


# ─── Web endpoint — called by Next.js API ────────────────────────────────────

class TriggerRequest(BaseModel):
    job_id: str
    youtube_url: str
    url_hash: str


@app.function(secrets=[pipeline_secrets])
@modal.fastapi_endpoint(method="POST")
def trigger(req: TriggerRequest):
    """
    HTTP entry point for the Next.js API.
    Spawns run_pipeline asynchronously and returns immediately.
    """
    run_pipeline.spawn(
        job_id=req.job_id,
        youtube_url=req.youtube_url,
        url_hash=req.url_hash,
    )
    return {"ok": True, "job_id": req.job_id}
