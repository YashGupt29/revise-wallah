"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Job, STEP_LABELS, JobStep } from "@/lib/jobs/types";
import { track } from "@/lib/mixpanel";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

interface Props {
  jobId: string;
  onComplete?: (videoId: string) => void;
}

const STEPS: JobStep[] = [
  "extracting",
  "transcribing",
  "generating",
  "parsing",
  "storing",
];

export default function JobStatusCard({ jobId, onComplete }: Props) {
  const [job, setJob] = useState<Job | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then(setJob);

    // Subscribe to Supabase Realtime for live updates
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${jobId}` },
        (payload) => {
          const updated = payload.new as Job;
          setJob(updated);

          if (updated.status === "done" && updated.processed_video_id) {
            track("job_completed", { job_id: jobId, video_id: updated.processed_video_id });
            onComplete?.(updated.processed_video_id);
            router.refresh();
          }
          if (updated.status === "failed") {
            track("job_failed", { job_id: jobId, error: updated.error_message });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  if (!job) return null;

  const currentStepIndex = STEPS.indexOf(job.current_step as JobStep);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-800">
          {job.status === "failed" ? "Processing failed" : "Generating your study kit"}
        </p>
        {job.status === "done" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
        {job.status === "failed" && <XCircle className="w-5 h-5 text-red-500" />}
        {job.status === "processing" && (
          <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-700",
            job.status === "failed" ? "bg-red-400" : "bg-purple-500"
          )}
          style={{ width: `${job.progress}%` }}
        />
      </div>

      {/* Step list */}
      <div className="space-y-2">
        {STEPS.map((step, i) => {
          const isActive = step === job.current_step;
          const isDone = currentStepIndex > i || job.status === "done";
          const isFailed = job.status === "failed" && isActive;

          return (
            <div key={step} className="flex items-center gap-2.5">
              <div className={clsx(
                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                isDone && "bg-green-100",
                isActive && !isFailed && "bg-purple-100",
                isFailed && "bg-red-100",
                !isDone && !isActive && "bg-gray-100"
              )}>
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                {isActive && !isFailed && <Loader2 className="w-3 h-3 text-purple-600 animate-spin" />}
                {isFailed && <XCircle className="w-3.5 h-3.5 text-red-500" />}
              </div>
              <span className={clsx(
                "text-xs",
                isDone && "text-gray-500 line-through",
                isActive && "text-gray-900 font-medium",
                !isDone && !isActive && "text-gray-400"
              )}>
                {STEP_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>

      {job.status === "failed" && job.error_message && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {job.error_message}
        </p>
      )}
    </div>
  );
}
