import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Star, BookOpen } from "lucide-react";
import NotesGrid from "@/components/NotesGrid";

export default async function NotesLibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notes } = await supabase
    .from("user_notes")
    .select(`
      id, created_at, is_starred, processed_video_id,
      processed_videos (
        id, title, channel_name, duration_seconds, language, status
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const allNotes = notes ?? [];
  const starredCount = allNotes.filter((n) => n.is_starred).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Notes</h1>
        <p className="text-sm text-gray-500 mt-1">All your generated study kits</p>
      </div>

      {/* Stats row */}
      {allNotes.length > 0 && (
        <div className="flex gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm">
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-gray-800">{allNotes.length}</span>
            <span className="text-xs text-gray-400">study kits</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-gray-800">{starredCount}</span>
            <span className="text-xs text-gray-400">starred</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {allNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No notes yet</h3>
          <p className="text-sm text-gray-400 max-w-xs mb-5">
            Paste a YouTube lecture URL on the dashboard to generate your first study kit in under 30 seconds.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <NotesGrid initialNotes={allNotes as Parameters<typeof NotesGrid>[0]["initialNotes"]} />
      )}
    </div>
  );
}
