"use client";

import { useState } from "react";
import { isYouTubeUrl } from "@/lib/url";
import { track } from "@/lib/mixpanel";
import { Loader2, Link2, Zap } from "lucide-react";
import clsx from "clsx";

interface SubmitResult {
  type: "cache_hit" | "job_created";
  job_id?: string;
  processed_video_id?: string;
  title?: string;
  minutes_remaining?: number;
}

interface Props {
  onJobCreated: (jobId: string) => void;
  onCacheHit: (videoId: string, title: string) => void;
}

export default function UrlSubmitForm({ onJobCreated, onCacheHit }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = isYouTubeUrl(url);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);
    track("url_submitted", { url_length: url.length });

    try {
      const res = await fetch("/api/videos/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data: SubmitResult & { error?: string; code?: string } = await res.json();

      if (!res.ok) {
        if (data.code === "insufficient_minutes") {
          track("minutes_depleted", { source: "submit" });
        }
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }

      setUrl("");

      if (data.type === "cache_hit" && data.processed_video_id) {
        track("cache_hit_served", { video_id: data.processed_video_id });
        onCacheHit(data.processed_video_id, data.title ?? "");
      } else if (data.type === "job_created" && data.job_id) {
        onJobCreated(data.job_id);
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            placeholder="Paste YouTube lecture URL..."
            className={clsx(
              "w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors",
              error
                ? "border-red-300 focus:ring-red-500/20"
                : "border-gray-300 focus:ring-purple-500/20 focus:border-purple-400"
            )}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={!isValid || loading}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {loading ? "Starting..." : "Generate"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
          {error}
          {error.includes("minutes") && (
            <a href="/dashboard/upgrade" className="underline font-medium">
              Get more minutes →
            </a>
          )}
        </p>
      )}
    </form>
  );
}
