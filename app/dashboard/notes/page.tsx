import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Star, BookOpen, Clock, Mic } from "lucide-react";

function formatDuration(seconds?: number | null) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

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
        /* Notes grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allNotes.map((note) => {
            const video = Array.isArray(note.processed_videos)
              ? note.processed_videos[0]
              : note.processed_videos;

            const isDone = !video?.status || video.status === "done";
            const duration = formatDuration(video?.duration_seconds);

            return (
              <Link
                key={note.id}
                href={`/dashboard/notes/${note.processed_video_id}`}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-purple-200 transition-all block"
              >
                {/* Top row: language badge + star */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {video?.language && (
                      <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full capitalize">
                        {video.language}
                      </span>
                    )}
                    {!isDone && (
                      <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                        Processing...
                      </span>
                    )}
                  </div>
                  {note.is_starred && (
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                  )}
                </div>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1 leading-snug">
                  {video?.title ?? "Processing..."}
                </h3>

                {/* Channel */}
                {video?.channel_name && (
                  <p className="text-xs text-gray-400 mb-3 truncate">{video.channel_name}</p>
                )}

                {/* Duration */}
                {duration && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{duration}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
