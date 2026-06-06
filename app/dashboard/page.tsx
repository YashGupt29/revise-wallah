import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notes } = await supabase
    .from("user_notes")
    .select(`
      id, created_at, is_starred, processed_video_id,
      processed_videos (
        title, channel_name, duration_seconds, language, status
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return <DashboardClient initialNotes={(notes ?? []) as Parameters<typeof DashboardClient>[0]["initialNotes"]} />;
}
