import crypto from "crypto";

const STRIP_PARAMS = new Set([
  "t", "start", "end",        // timestamps
  "list", "index",             // playlist
  "si", "pp", "feature",      // tracking
]);

/**
 * Normalize a YouTube URL to a canonical form so that
 * different variants of the same video produce the same hash.
 */
export function normalizeYouTubeUrl(raw: string): string {
  const url = new URL(raw.trim());

  // youtu.be/VIDEO_ID
  if (url.hostname === "youtu.be") {
    const videoId = url.pathname.slice(1);
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  // /shorts/VIDEO_ID
  const shortsMatch = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) {
    return `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
  }

  // Standard watch URL — keep only v=
  const videoId = url.searchParams.get("v");
  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  return raw.trim();
}

/** SHA-256 of a normalized URL — used as the DB cache key. */
export function hashUrl(normalizedUrl: string): string {
  return crypto.createHash("sha256").update(normalizedUrl).digest("hex");
}

/** Returns true if the string looks like a YouTube URL. */
export function isYouTubeUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return (
      url.hostname === "youtu.be" ||
      url.hostname === "www.youtube.com" ||
      url.hostname === "youtube.com"
    );
  } catch {
    return false;
  }
}
