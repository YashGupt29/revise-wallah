/**
 * ModalClient — responsible for triggering Modal pipeline functions.
 *
 * Single responsibility: knows how to call Modal's REST API.
 * All business logic lives in the API route, not here.
 */

const MODAL_TRIGGER_URL = "https://yashnitagartala8--revise-wallah-pipeline-trigger.modal.run";

export async function triggerPipeline(params: {
  jobId: string;
  youtubeUrl: string;
  urlHash: string;
}): Promise<void> {
  const response = await fetch(MODAL_TRIGGER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_id: params.jobId,
      youtube_url: params.youtubeUrl,
      url_hash: params.urlHash,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Modal trigger failed (${response.status}): ${body}`);
  }
}
