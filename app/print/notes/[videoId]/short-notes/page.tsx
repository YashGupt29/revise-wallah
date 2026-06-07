import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import ShortNotes from "@/components/ShortNotes";

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
    .single();
  return { title: video?.title ? `Short Notes — ${video.title}` : "Short Notes" };
}

export default async function PrintShortNotesPage({ params }: Props) {
  const { videoId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
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
    .select("title, short_notes_json")
    .eq("id", videoId)
    .eq("status", "done")
    .single();

  if (!video || !video.short_notes_json) notFound();

  return (
    <>
      <style>{`
        @page { margin: 0.5in; size: A4; }
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
        .katex { font-size: 1em !important; }
      `}</style>

      <ShortNotes data={video.short_notes_json as any} />

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
