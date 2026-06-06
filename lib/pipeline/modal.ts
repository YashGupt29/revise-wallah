/**
 * ModalClient — responsible for triggering Modal pipeline functions.
 *
 * Single responsibility: knows how to call the Modal web endpoint.
 * All business logic lives in the API route, not here.
 */

const MODAL_TRIGGER_URL = "https://yashnitagartala8--revise-wallah-pipeline-trigger.modal.run";

// Modal cold starts can take 30-60s — we fire-and-forget with a generous timeout.
// The pipeline updates Supabase directly; we don't need to wait for it to finish.
const TRIGGER_TIMEOUT_MS = 60_000;

export async function triggerPipeline(params: {
  jobId: string;
  youtubeUrl: string;
  urlHash: string;
}): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRIGGER_TIMEOUT_MS);

  try {
    const response = await fetch(MODAL_TRIGGER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: params.jobId,
        youtube_url: params.youtubeUrl,
        url_hash: params.urlHash,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Modal trigger failed (${response.status}): ${body}`);
    }
  } finally {
    clearTimeout(timer);
  }
}
