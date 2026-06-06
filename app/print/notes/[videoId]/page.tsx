import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import HandwrittenNotes from "@/components/HandwrittenNotes";

interface Props {
  params: Promise<{ videoId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { videoId } = await params;
  const supabase = await createClient();

  const { data: video } = await supabase
    .from("processed_videos")
    .select("title")
    .eq("id", videoId)
    .eq("status", "done")
    .single();

  return {
    title: video?.title ?? "Handwritten Notes",
  };
}

export default async function PrintPage({ params }: Props) {
  const { videoId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userNote } = await supabase
    .from("user_notes")
    .select("id")
    .eq("user_id", user.id)
    .eq("processed_video_id", videoId)
    .single();

  if (!userNote) notFound();

  const { data: video } = await supabase
    .from("processed_videos")
    .select("id, title, channel_name, duration_seconds, notes_json")
    .eq("id", videoId)
    .eq("status", "done")
    .single();

  if (!video) notFound();

  return (
    <>
      <style>{`
        @page { margin: 0.4in; size: A4; }
        html, body {
          margin: 0;
          padding: 0;
          background: white;
          height: auto !important;
          overflow: visible !important;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      `}</style>

      <HandwrittenNotes
        content={video.notes_json as any}
        videoTitle={video.title}
        channelName={video.channel_name}
        durationSeconds={video.duration_seconds}
      />

      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', function() {
              document.fonts.ready.then(function() {
                setTimeout(function() { window.print(); }, 300);
              });
            });
          `,
        }}
      />
    </>
  );
}
