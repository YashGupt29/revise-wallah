/**
 * POST /api/videos/submit
 *
 * Responsibilities (single route, clear flow):
 *  1. Validate the YouTube URL
 *  2. Check cache — return instantly if already processed
 *  3. Assert user has enough minutes
 *  4. Create an async job record
 *  5. Trigger Modal pipeline (fire-and-forget)
 *  6. Return job_id to the client for Realtime polling
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeYouTubeUrl, hashUrl, isYouTubeUrl } from "@/lib/url";
import { checkCache } from "@/lib/pipeline/cache";
import { assertSufficientMinutes, deductMinutes, InsufficientMinutesError } from "@/lib/pipeline/minutes";
import { triggerPipeline } from "@/lib/pipeline/modal";
import { calculateMinutesCost } from "@/lib/jobs/types";
import { track } from "@/lib/mixpanel";

const CACHE_HIT_COST = 5;   // minutes charged on cache hit
const DEFAULT_MISS_COST = 10; // charged upfront; adjusted after duration known

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Input validation ──────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}));
  const rawUrl: string = body.url ?? "";

  if (!rawUrl || !isYouTubeUrl(rawUrl)) {
    return NextResponse.json(
      { error: "Please provide a valid YouTube URL" },
      { status: 400 }
    );
  }

  const normalizedUrl = normalizeYouTubeUrl(rawUrl);
  const urlHash = hashUrl(normalizedUrl);

  // ── Cache check ───────────────────────────────────────────────────────────
  const cached = await checkCache(urlHash);

  if (cached) {
    try {
      await assertSufficientMinutes(user.id, CACHE_HIT_COST);
    } catch (err) {
      if (err instanceof InsufficientMinutesError) {
        return NextResponse.json(
          { error: "Not enough minutes. Top up to continue.", code: "insufficient_minutes" },
          { status: 402 }
        );
      }
      throw err;
    }

    // Link to user's library
    const admin = createAdminClient();
    await admin.from("user_notes").upsert(
      { user_id: user.id, processed_video_id: cached.processed_video_id },
      { onConflict: "user_id,processed_video_id" }
    );

    const newBalance = await deductMinutes(
      user.id,
      CACHE_HIT_COST,
      "cache_hit",
      cached.processed_video_id
    );

    track("study_kit_generated", {
      cache_hit: true,
      duration_seconds: cached.duration_seconds,
      language: cached.language,
      minutes_cost: CACHE_HIT_COST,
      balance_after: newBalance,
    });

    return NextResponse.json({
      type: "cache_hit",
      processed_video_id: cached.processed_video_id,
      title: cached.title,
      minutes_remaining: newBalance,
    });
  }

  // ── Cache miss — assert minutes and create job ────────────────────────────
  try {
    await assertSufficientMinutes(user.id, DEFAULT_MISS_COST);
  } catch (err) {
    if (err instanceof InsufficientMinutesError) {
      return NextResponse.json(
        { error: "Not enough minutes. Top up to continue.", code: "insufficient_minutes" },
        { status: 402 }
      );
    }
    throw err;
  }

  // Create a stub in processed_videos so we can upsert later
  const admin = createAdminClient();
  await admin.from("processed_videos").upsert(
    { url_hash: urlHash, youtube_url: normalizedUrl, status: "pending" },
    { onConflict: "url_hash" }
  );

  const { data: job, error: jobError } = await admin
    .from("jobs")
    .insert({
      user_id: user.id,
      youtube_url: normalizedUrl,
      url_hash: urlHash,
      status: "queued",
      progress: 0,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  // ── Trigger Modal (fire-and-forget) ───────────────────────────────────────
  try {
    await triggerPipeline({ jobId: job.id, youtubeUrl: normalizedUrl, urlHash });
  } catch (err) {
    // Mark job as failed immediately if Modal trigger fails
    await admin
      .from("jobs")
      .update({ status: "failed", error_message: String(err) })
      .eq("id", job.id);

    return NextResponse.json(
      { error: "Failed to start pipeline. Try again." },
      { status: 500 }
    );
  }

  track("pipeline_started", { job_id: job.id, url_hash: urlHash });

  return NextResponse.json({ type: "job_created", job_id: job.id }, { status: 202 });
}
