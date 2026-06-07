"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Clock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

function formatDuration(seconds?: number | null) {
  if (!seconds) return "";
  const s = seconds > 100000 ? Math.floor(seconds / 1000) : seconds;
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

interface ProcessedVideo {
  id: string;
  title: string | null;
  channel_name: string | null;
  duration_seconds: number | null;
  language: string | null;
  status: string | null;
}

interface Note {
  id: string;
  processed_video_id: string;
  is_starred: boolean;
  processed_videos: ProcessedVideo | ProcessedVideo[] | null;
}

export default function NotesGrid({ initialNotes }: { initialNotes: Note[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDelete(processedVideoId: string) {
    setDeleting(processedVideoId);
    const res = await fetch(`/api/notes/${processedVideoId}`, { method: "DELETE" });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.processed_video_id !== processedVideoId));
      router.refresh();
    }
    setDeleting(null);
    setConfirmId(null);
  }

  if (notes.length === 0) {
    return null; // Parent handles empty state
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map((note) => {
        const video = Array.isArray(note.processed_videos)
          ? note.processed_videos[0]
          : note.processed_videos;

        const isDone = !video?.status || video.status === "done";
        const duration = formatDuration(video?.duration_seconds);
        const isDeleting = deleting === note.processed_video_id;
        const isConfirming = confirmId === note.processed_video_id;

        return (
          <div key={note.id} className="relative group">
            <Link
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

            {/* Delete button — shown on hover */}
            {!isConfirming && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setConfirmId(note.processed_video_id);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                title="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Confirm delete overlay */}
            {isConfirming && (
              <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 border-red-300">
                <p className="text-sm font-semibold text-gray-800">Delete this note?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmId(null)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(note.processed_video_id)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-60"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
