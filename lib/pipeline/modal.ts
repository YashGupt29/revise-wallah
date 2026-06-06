/**
 * ModalClient — triggers Modal pipeline with pre-fetched transcript.
 *
 * Modal only runs LLM generation — no YouTube access needed from cloud IPs.
 */

const MODAL_TRIGGER_URL = "https://yashnitagartala8--revise-wallah-pipeline-trigger.modal.run";
const TRIGGER_TIMEOUT_MS = 30_000;

export async function triggerPipeline(params: {
  jobId: string;
  youtubeUrl: string;
  urlHash: string;
  transcript: string;
  language: string;
  title: string;
  channelName: string;
  durationSeconds: number;
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
        transcript: params.transcript,
        language: params.language,
        title: params.title,
        channel_name: params.channelName,
        duration_seconds: params.durationSeconds,
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
