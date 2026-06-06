"""
Modal app — entry point for the Revise Wallah pipeline.

Architecture:
  trigger()        — web endpoint, receives transcript from Next.js, spawns run_pipeline
  run_pipeline()   — orchestrator: LLM generation + Supabase storage

Transcript is fetched by Next.js (not blocked by YouTube).
Modal only runs LLM generation — no YouTube access needed.
"""

import modal
from pydantic import BaseModel

from modal_pipeline.utils.supabase_client import get_supabase
from modal_pipeline.services.generator import generate_notes, generate_short_notes
from modal_pipeline.services import parser

# ─── Modal image ─────────────────────────────────────────────────────────────

pipeline_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "google-genai>=1.0.0",
        "supabase==2.10.0",
        "pydantic==2.10.3",
        "fastapi[standard]>=0.115.0",
    )
    .add_local_python_source("modal_pipeline")
)

app = modal.App("revise-wallah-pipeline", image=pipeline_image)

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
def run_pipeline(
    job_id: str,
    youtube_url: str,
    url_hash: str,
    transcript: str,
    language: str,
    title: str,
    channel_name: str,
    duration_seconds: int,
):
    """
    LLM pipeline: transcript → structured notes stored in Supabase.
    Transcript is pre-fetched by Next.js — no YouTube access needed here.
    """
    sb = get_supabase()

    try:
        # ── Step 1: Generate notes with Gemini ───────────────────────────────
        _update_job(job_id, "processing", "generating", 30)
        content = generate_notes(transcript)

        # ── Step 1b: Generate short notes ───────────────────────────────────
        try:
            short_notes = generate_short_notes(content.model_dump())
        except Exception as e:
            print(f"Short notes generation failed (non-fatal): {e}")
            short_notes = None

        # ── Step 2: Parse into all formats ───────────────────────────────────
        _update_job(job_id, "processing", "parsing", 70)
        structured_md = parser.to_structured_markdown(content)
        handwritten_html = parser.to_handwritten_html(content)
        flashcards = parser.to_flashcards(content)
        quiz = parser.to_quiz(content)
        concepts = parser.to_concepts(content)
        relationships = parser.to_concept_relationships(content)

        # ── Step 3: Store processed video ────────────────────────────────────
        _update_job(job_id, "processing", "storing", 90)
        video_row = (
            sb.table("processed_videos")
            .upsert(
                {
                    "url_hash": url_hash,
                    "youtube_url": youtube_url,
                    "title": title,
                    "channel_name": channel_name,
                    "duration_seconds": duration_seconds,
                    "language": language,
                    "transcript": transcript,
                    "notes_json": content.model_dump(),
                    "notes_structured": structured_md,
                    "notes_handwritten": handwritten_html,
                    "flashcards_json": flashcards,
                    "quiz_json": quiz,
                    "short_notes_json": short_notes,
                    "status": "done",
                },
                on_conflict="url_hash",
            )
            .execute()
        )
        processed_video_id = video_row.data[0]["id"]

        # ── Step 4: Store graph seeds (non-blocking) ─────────────────────────
        _store_concepts(sb, processed_video_id, concepts, relationships)

        # ── Done ─────────────────────────────────────────────────────────────
        sb.table("jobs").update(
            {"status": "done", "progress": 100, "current_step": "done",
             "processed_video_id": processed_video_id}
        ).eq("id", job_id).execute()

    except Exception as exc:
        _update_job(job_id, "failed", "failed", 0, error=str(exc))
        sb.table("processed_videos").update({"status": "failed"}).eq(
            "url_hash", url_hash
        ).execute()
        raise


def _store_concepts(sb, processed_video_id: str, concepts: list[dict], relationships: list[dict]):
    """Upsert graph seed data. Non-blocking — failures don't fail the job."""
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
            sb.table("video_concepts").upsert(
                {
                    "processed_video_id": processed_video_id,
                    "concept_id": concept_id,
                    "timestamp_start": concept.get("timestamp_approx"),
                },
                on_conflict="processed_video_id,concept_id",
            ).execute()

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
        pass


# ─── Web endpoint ─────────────────────────────────────────────────────────────

class TriggerRequest(BaseModel):
    job_id: str
    youtube_url: str
    url_hash: str
    transcript: str
    language: str
    title: str
    channel_name: str
    duration_seconds: int


@app.function(secrets=[pipeline_secrets])
@modal.fastapi_endpoint(method="POST")
def trigger(req: TriggerRequest):
    """Receives transcript from Next.js and spawns run_pipeline."""
    run_pipeline.spawn(
        job_id=req.job_id,
        youtube_url=req.youtube_url,
        url_hash=req.url_hash,
        transcript=req.transcript,
        language=req.language,
        title=req.title,
        channel_name=req.channel_name,
        duration_seconds=req.duration_seconds,
    )
    return {"ok": True, "job_id": req.job_id}
