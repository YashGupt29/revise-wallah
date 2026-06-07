import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import NotesClient from "./NotesClient";
import { type Plan } from "@/lib/plan/features";

interface Props {
  params: Promise<{ videoId: string }>;
}

export default async function NotesPage({ params }: Props) {
  const { videoId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [userNoteRes, videoRes, profileRes] = await Promise.all([
    supabase
      .from("user_notes")
      .select("id, is_starred")
      .eq("user_id", user.id)
      .eq("processed_video_id", videoId)
      .single(),
    supabase
      .from("processed_videos")
      .select(
        "id, title, channel_name, duration_seconds, language, notes_json, notes_structured, flashcards_json, quiz_json, youtube_url, short_notes_json"
      )
      .eq("id", videoId)
      .eq("status", "done")
      .single(),
    supabase.from("users").select("plan").eq("id", user.id).single(),
  ]);

  if (!userNoteRes.data) notFound();
  if (!videoRes.data) notFound();

  return (
    <NotesClient
      video={videoRes.data}
      isStarred={userNoteRes.data.is_starred ?? false}
      userPlan={(profileRes.data?.plan ?? "free") as Plan}
    />
  );
}
