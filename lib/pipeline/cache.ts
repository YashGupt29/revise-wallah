/**
 * CacheService — responsible for checking and retrieving cached pipeline results.
 *
 * Single responsibility: given a url_hash, determine if we already have
 * processed notes and return them. Never modifies state.
 */

import { createClient } from "@/lib/supabase/server";

export interface CacheHit {
  processed_video_id: string;
  title: string;
  duration_seconds: number;
  language: string;
}

/**
 * Check if a url_hash already exists in processed_videos.
 * Returns the cached record or null.
 */
export async function checkCache(urlHash: string): Promise<CacheHit | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("processed_videos")
    .select("id, title, duration_seconds, language, status")
    .eq("url_hash", urlHash)
    .eq("status", "done")
    .single();

  if (!data) return null;

  return {
    processed_video_id: data.id,
    title: data.title,
    duration_seconds: data.duration_seconds,
    language: data.language,
  };
}
