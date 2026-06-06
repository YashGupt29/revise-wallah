import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recentNotes } = await supabase
    .from("user_notes")
    .select(`
      id,
      created_at,
      is_starred,
      processed_video_id,
      processed_videos (
        title,
        channel_name,
        duration_seconds,
        language,
        status
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const isEmpty = !recentNotes || recentNotes.length === 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Notes</h1>
        <p className="text-gray-500 text-sm mt-1">Paste a YouTube URL to generate your study kit</p>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No notes yet</h2>
          <p className="text-gray-400 text-sm max-w-sm">
            Paste any YouTube lecture URL above and we&apos;ll generate structured notes,
            flashcards, and a quiz in under 30 seconds.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentNotes.map((note) => {
            const video = note.processed_videos as {
              title?: string;
              channel_name?: string;
              duration_seconds?: number;
              language?: string;
              status?: string;
            } | null;
            return (
              <div
                key={note.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                    {video?.language ?? "—"}
                  </span>
                  {note.is_starred && <span className="text-yellow-400">⭐</span>}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
                  {video?.title ?? "Processing..."}
                </h3>
                <p className="text-xs text-gray-400">{video?.channel_name}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
