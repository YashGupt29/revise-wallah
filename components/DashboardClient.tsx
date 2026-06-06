"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UrlSubmitForm from "@/components/UrlSubmitForm";
import JobStatusCard from "@/components/JobStatusCard";
import { track } from "@/lib/mixpanel";

interface Note {
  id: string;
  created_at: string;
  is_starred: boolean;
  processed_video_id: string;
  processed_videos: {
    title?: string;
    channel_name?: string;
    duration_seconds?: number;
    language?: string;
    status?: string;
  } | {
    title?: string;
    channel_name?: string;
    duration_seconds?: number;
    language?: string;
    status?: string;
  }[] | null;
}

interface Props {
  initialNotes: Note[];
}

export default function DashboardClient({ initialNotes }: Props) {
  const router = useRouter();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [notes, setNotes] = useState(initialNotes);

  function handleJobCreated(jobId: string) {
    setActiveJobId(jobId);
  }

  function handleCacheHit(videoId: string, title: string) {
    // Instantly show in library — optimistic update
    router.refresh();
  }

  function handleJobComplete(videoId: string) {
    setActiveJobId(null);
    router.refresh();
  }

  function handleJobDismiss() {
    setActiveJobId(null);
  }

  return (
    <div>
      {/* URL input */}
      <div className="mb-8 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          New Study Kit
        </p>
        <UrlSubmitForm onJobCreated={handleJobCreated} onCacheHit={handleCacheHit} />
        <p className="text-xs text-gray-400 mt-2">
          Works with any YouTube lecture — Physics Wallah, Unacademy, MIT OpenCourseWare, and more
        </p>
      </div>

      {/* Active job */}
      {activeJobId && (
        <div className="mb-6">
          <JobStatusCard jobId={activeJobId} onComplete={handleJobComplete} onDismiss={handleJobDismiss} />
        </div>
      )}

      {/* Notes grid */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">My Notes</h2>

        {notes.length === 0 && !activeJobId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🎬</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">No notes yet</h3>
            <p className="text-gray-400 text-sm max-w-xs">
              Paste a YouTube lecture URL above to generate your first study kit in under 30 seconds.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => {
              const video = Array.isArray(note.processed_videos)
                ? note.processed_videos[0]
                : note.processed_videos;
              return (
                <div
                  key={note.id}
                  onClick={() => {
                    track("note_opened", { video_id: note.processed_video_id });
                    router.push(`/dashboard/notes/${note.processed_video_id}`);
                  }}
                  className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full capitalize">
                      {video?.language ?? "—"}
                    </span>
                    {note.is_starred && <span className="text-yellow-400 text-sm">⭐</span>}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1 leading-snug">
                    {video?.title ?? "Processing..."}
                  </h3>
                  <p className="text-xs text-gray-400">{video?.channel_name}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
