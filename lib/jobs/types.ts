/** Shared types for the async job system. */

export type JobStatus = "queued" | "processing" | "done" | "failed";

export type JobStep =
  | "extracting"
  | "transcribing"
  | "generating"
  | "parsing"
  | "storing"
  | "done"
  | "failed";

export interface Job {
  id: string;
  user_id: string;
  youtube_url: string;
  url_hash: string;
  processed_video_id: string | null;
  status: JobStatus;
  current_step: JobStep | null;
  progress: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export const STEP_LABELS: Record<JobStep, string> = {
  extracting: "Downloading audio",
  transcribing: "Transcribing lecture",
  generating: "Generating notes with AI",
  parsing: "Parsing all formats",
  storing: "Saving to your library",
  done: "Done",
  failed: "Failed",
};

/** Minutes cost = 1 minute per 5 minutes of video, minimum 5. */
export function calculateMinutesCost(durationSeconds: number): number {
  const videoMinutes = Math.ceil(durationSeconds / 60);
  return Math.max(5, Math.ceil(videoMinutes / 5));
}
