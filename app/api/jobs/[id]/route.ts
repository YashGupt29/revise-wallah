/**
 * GET /api/jobs/[id]
 *
 * Single responsibility: return the current status of a job.
 * Also links user_notes when the job transitions to "done".
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deductMinutes } from "@/lib/pipeline/minutes";
import { calculateMinutesCost } from "@/lib/jobs/types";
import { track } from "@/lib/mixpanel";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // When job completes: link to user library + deduct minutes (once)
  if (job.status === "done" && job.processed_video_id) {
    const admin = createAdminClient();

    // Check if already linked (idempotent)
    const { data: existing } = await admin
      .from("user_notes")
      .select("id")
      .eq("user_id", user.id)
      .eq("processed_video_id", job.processed_video_id)
      .single();

    if (!existing) {
      await admin.from("user_notes").insert({
        user_id: user.id,
        processed_video_id: job.processed_video_id,
      });

      // Fetch duration to calculate accurate cost
      const { data: video } = await admin
        .from("processed_videos")
        .select("duration_seconds, language")
        .eq("id", job.processed_video_id)
        .single();

      const cost = calculateMinutesCost(video?.duration_seconds ?? 0);
      const newBalance = await deductMinutes(user.id, cost, "processed", job.processed_video_id);

      track("study_kit_generated", {
        cache_hit: false,
        duration_seconds: video?.duration_seconds,
        language: video?.language,
        minutes_cost: cost,
        balance_after: newBalance,
      });
    }
  }

  return NextResponse.json(job);
}
