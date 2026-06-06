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

  // Verify the user owns this video
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
        /* Hide dashboard chrome during print */
        @media print {
          aside,
          nav,
          header,
          footer {
            display: none !important;
          }
          /* Let the main area fill the full page */
          .flex.h-screen { display: block !important; }
          main { overflow: visible !important; }
          main > div { max-width: none !important; padding: 0 !important; }

          @page { margin: 0.4in; size: A4; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        /* Also hide sidebar visually so the print preview looks clean */
        @media screen {
          aside { display: none !important; }
          main > div { max-width: none !important; padding: 0 !important; }
        }
        body { margin: 0; background: white; }
      `}</style>

      <HandwrittenNotes
        content={video.notes_json as any}
        videoTitle={video.title}
        channelName={video.channel_name}
        durationSeconds={video.duration_seconds}
      />

      {/* Auto-print after fonts are ready */}
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
