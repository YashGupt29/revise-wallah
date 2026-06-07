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
  durationSeconds: number;
}

// Priority order: English variants first, then Hindi, then any available
const LANG_PRIORITY = ["en", "en-US", "en-GB", "en-IN", "hi", "hi-IN"];

function calcDuration(entries: { offset: number; duration: number }[]): number {
  if (!entries.length) return 0;
  const last = entries[entries.length - 1];
  const raw = last.offset + last.duration;
  // youtube-transcript returns values in milliseconds — convert to seconds
  return Math.round(raw > 10000 ? raw / 1000 : raw);
}

export async function fetchTranscript(youtubeUrl: string): Promise<TranscriptResult> {
  // Try preferred languages in priority order
  for (const lang of LANG_PRIORITY) {
    try {
      const entries = await YoutubeTranscript.fetchTranscript(youtubeUrl, { lang });
      if (entries && entries.length > 0) {
        const text = entries.map((e) => e.text.trim()).filter(Boolean).join(" ");
        return {
          text,
          language: lang.startsWith("hi") ? "hindi" : "english",
          durationSeconds: calcDuration(entries),
        };
      }
    } catch {
      // This language not available — try next
    }
  }

  // Final fallback: let YouTube pick (could be any language)
  const entries = await YoutubeTranscript.fetchTranscript(youtubeUrl);
  if (!entries || entries.length === 0) {
    throw new Error("No captions available for this video.");
  }

  const text = entries.map((e) => e.text.trim()).filter(Boolean).join(" ");
  return { text, language: "auto", durationSeconds: calcDuration(entries) };
}

