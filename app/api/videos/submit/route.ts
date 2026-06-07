/**
 * POST /api/videos/submit
 *
 * Flow:
 *  1. Validate URL
 *  2. Check cache
 *  3. Assert sufficient minutes (blocks submission if balance is 0)
 *  4. Fetch transcript + metadata (from Next.js — not blocked by YouTube)
 *  5. Create job record
 *  6. Trigger Modal with transcript (Modal only runs LLM — no YouTube access)
 *  7. Return job_id
 *
 * Note: minutes are deducted on successful completion in GET /api/jobs/[id],
 * not here. The upfront check only prevents submitting with zero balance.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeYouTubeUrl, hashUrl, isYouTubeUrl } from "@/lib/url";
import { checkCache } from "@/lib/pipeline/cache";
import { assertSufficientMinutes, InsufficientMinutesError } from "@/lib/pipeline/minutes";
import { triggerPipeline } from "@/lib/pipeline/modal";
import { fetchTranscript } from "@/lib/pipeline/transcript";
import { track } from "@/lib/mixpanel";

const CACHE_HIT_COST = 5;
const DEFAULT_MISS_COST = 15;

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

    const admin = createAdminClient();
    await admin.from("user_notes").upsert(
      { user_id: user.id, processed_video_id: cached.processed_video_id },
      { onConflict: "user_id,processed_video_id" }
    );

    const newBalance = await deductMinutes(user.id, CACHE_HIT_COST, "cache_hit", cached.processed_video_id);

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

  // ── Fetch transcript from Next.js (not blocked by YouTube) ────────────────
  let transcript: string;
  let language: string;
  let durationSeconds = 0;

  try {
    const result = await fetchTranscript(normalizedUrl);
    transcript = result.text;
    language = result.language;
    durationSeconds = result.durationSeconds;
  } catch (err) {
    return NextResponse.json(
      { error: "Could not fetch captions for this video. Please try a video with subtitles enabled." },
      { status: 422 }
    );
  }

  // ── Assert minutes ────────────────────────────────────────────────────────
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

  // ── Get video metadata via oEmbed ─────────────────────────────────────────
  let title = "";
  let channelName = "";
  try {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`
    ).then((r) => r.json());
    title = oembed.title ?? "";
    channelName = oembed.author_name ?? "";
  } catch {
    // metadata is non-critical
  }

  // ── Create job ────────────────────────────────────────────────────────────
  const admin = createAdminClient();
  const { data: processedVideo } = await admin
    .from("processed_videos")
    .upsert(
      { url_hash: urlHash, youtube_url: normalizedUrl, status: "pending" },
      { onConflict: "url_hash" }
    )
    .select("id")
    .single();

  // Pre-create user_notes so the notes page works as soon as the job completes
  if (processedVideo?.id) {
    await admin
      .from("user_notes")
      .upsert(
        { user_id: user.id, processed_video_id: processedVideo.id },
        { onConflict: "user_id,processed_video_id" }
      );
  }

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

  // ── Trigger Modal (fire-and-forget — transcript already fetched) ──────────
  // Minutes are deducted on successful completion in GET /api/jobs/[id]
  triggerPipeline({
    jobId: job.id,
    youtubeUrl: normalizedUrl,
    urlHash,
    transcript,
    language,
    title,
    channelName,
    durationSeconds,
  }).catch(async (err) => {
    await admin
      .from("jobs")
      .update({ status: "failed", error_message: String(err) })
      .eq("id", job.id);
  });

  track("pipeline_started", { job_id: job.id, url_hash: urlHash });

  return NextResponse.json({ type: "job_created", job_id: job.id }, { status: 202 });
}
