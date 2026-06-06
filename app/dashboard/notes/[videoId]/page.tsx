import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import NotesClient from "./NotesClient";

interface Props {
  params: Promise<{ videoId: string }>;
}

export default async function NotesPage({ params }: Props) {
  const { videoId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify user has access to this video
  const { data: userNote } = await supabase
    .from("user_notes")
    .select("id, is_starred")
    .eq("user_id", user.id)
    .eq("processed_video_id", videoId)
    .single();

  if (!userNote) notFound();

  const { data: video } = await supabase
    .from("processed_videos")
    .select(
      "id, title, channel_name, duration_seconds, language, notes_json, notes_structured, flashcards_json, quiz_json, youtube_url"
    )
    .eq("id", videoId)
    .eq("status", "done")
    .single();

  if (!video) notFound();

  return (
    <NotesClient
      video={video}
      isStarred={userNote.is_starred ?? false}
      userNoteId={userNote.id}
    />
  );
}
