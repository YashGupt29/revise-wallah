/**
 * TranscriptClient — fetches YouTube transcript from Next.js API layer.
 *
 * Runs on Vercel/local IPs (not blocked by YouTube).
 * Modal only receives the transcript text — no YouTube access needed from cloud.
 */

import { YoutubeTranscript } from "youtube-transcript";

export interface TranscriptResult {
  text: string;
  language: string;
}

export async function fetchTranscript(youtubeUrl: string): Promise<TranscriptResult> {
  const entries = await YoutubeTranscript.fetchTranscript(youtubeUrl);

  if (!entries || entries.length === 0) {
    throw new Error("No captions available for this video.");
  }

  const text = entries
    .map((e) => e.text.trim())
    .filter(Boolean)
    .join(" ");

  return { text, language: "auto" };
}
