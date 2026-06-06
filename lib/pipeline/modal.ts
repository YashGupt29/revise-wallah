/**
 * ModalClient — responsible for triggering Modal pipeline functions.
 *
 * Single responsibility: knows how to call Modal's REST API.
 * All business logic lives in the API route, not here.
 */

const MODAL_API_BASE = "https://api.modal.com/v1";

export async function triggerPipeline(params: {
  jobId: string;
  youtubeUrl: string;
  urlHash: string;
}): Promise<void> {
  const tokenId = process.env.MODAL_TOKEN_ID!;
  const tokenSecret = process.env.MODAL_TOKEN_SECRET!;
  const credentials = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64");

  const response = await fetch(
    `${MODAL_API_BASE}/apps/revise-wallah-pipeline/functions/run_pipeline/invoke`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        args: [],
        kwargs: {
          job_id: params.jobId,
          youtube_url: params.youtubeUrl,
          url_hash: params.urlHash,
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Modal trigger failed (${response.status}): ${body}`);
  }
}
