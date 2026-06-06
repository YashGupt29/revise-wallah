/**
 * GET /api/notes/[videoId]
 *
 * Single responsibility: return all note formats for a processed video.
 * Enforces ownership — user must have a user_notes record for this video.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: note } = await supabase
    .from("user_notes")
    .select("id, is_starred, annotations")
    .eq("user_id", user.id)
    .eq("processed_video_id", videoId)
    .single();

  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch processed video content
  const { data: videoRaw } = await supabase
    .from("processed_videos")
    .select(
      "id, title, channel_name, duration_seconds, language, notes_json, " +
      "notes_structured, notes_handwritten, flashcards_json, quiz_json, status"
    )
    .eq("id", videoId)
    .single();

  const video = videoRaw as {
    id: string; title: string; channel_name: string; duration_seconds: number;
    language: string; notes_json: unknown; notes_structured: string;
    notes_handwritten: string; flashcards_json: unknown[]; quiz_json: unknown[]; status: string;
  } | null;

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  return NextResponse.json({
    note_id: note.id,
    is_starred: note.is_starred,
    annotations: note.annotations,
    video: {
      id: video.id,
      title: video.title,
      channel_name: video.channel_name,
      duration_seconds: video.duration_seconds,
      language: video.language,
      status: video.status,
    },
    content: {
      structured: video.notes_structured,
      handwritten: video.notes_handwritten,
      flashcards: video.flashcards_json,
      quiz: video.quiz_json,
      raw_json: video.notes_json,
    },
  });
}
