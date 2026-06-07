"use client";

import { Kalam } from "next/font/google";

const kalam = Kalam({ subsets: ["latin"], weight: ["300", "400", "700"] });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NoteSection {
  heading: string;
  order?: number;
  bullets?: string[];
  formulas?: string[];
  definitions?: string[];
  examples?: string[];
  exam_tips?: string[];
  code_snippets?: { language: string; code: string }[];
  real_world_examples?: string[];
}

interface NotesJson {
  summary?: string;
  key_takeaways?: string[];
  sections?: NoteSection[];
}

interface GeneratedContent {
  title: string;
  subject: string;
  topic: string;
  subtopic?: string;
  language: string;
  difficulty_level?: string;
  notes: NotesJson;
}

interface Props {
  content: GeneratedContent;
  videoTitle?: string;
  channelName?: string;
  durationSeconds?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-GB", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

// Cycle through three opacity values to simulate natural ink pressure variation
const bulletOpacities = [0.9, 1, 0.95];
// Cycle through slight bottom margins to simulate natural line variation
const bulletMargins = [4, 6, 5];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionDivider() {
  return (
    <div
      style={{
        borderTop: "1px solid #d1d5db",
        marginBottom: "18px",
        opacity: 0.6,
      }}
    />
  );
}

function SectionHeading({
  text,
  index,
}: {
  text: string;
  index: number;
}) {
  // Alternate slight positive/negative tilt for each heading
  const tiltDeg = index % 2 === 0 ? -0.4 : 0.4;
  return (
    <div style={{ marginBottom: "14px" }}>
      <span
        style={{
          color: "#1e3a5f",
          fontSize: "1.35rem",
          fontWeight: 700,
          borderBottom: "2px solid #1e3a5f",
          display: "inline-block",
          paddingBottom: "2px",
          transform: `rotate(${tiltDeg}deg)`,
          letterSpacing: "-0.01em",
        }}
      >
        {text}
      </span>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 8px 0" }}>
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "4px",
            lineHeight: 1.8,
            paddingLeft: "8px",
            marginBottom: `${bulletMargins[i % bulletMargins.length]}px`,
            opacity: bulletOpacities[i % bulletOpacities.length],
            letterSpacing: "-0.01em",
            color: "#111827",
          }}
        >
          <span style={{ color: "#4f46e5", flexShrink: 0, marginTop: "1px" }}>→</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DefinitionList({ items }: { items: string[] }) {
  return (
    <div style={{ margin: "4px 0 8px 0" }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            borderBottom: "1px dashed #93c5fd",
            marginBottom: "4px",
            paddingBottom: "3px",
            color: "#1d4ed8",
            fontStyle: "italic",
            letterSpacing: "-0.01em",
          }}
        >
          <span style={{ fontWeight: 700, fontStyle: "normal" }}>📖 Def: </span>
          {item}
        </div>
      ))}
    </div>
  );
}

function FormulaList({ items }: { items: string[] }) {
  return (
    <div style={{ margin: "4px 0 8px 0", display: "flex", flexDirection: "column", gap: "6px" }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            border: "1.5px solid #dc2626",
            borderRadius: "6px",
            padding: "6px 12px",
            background: "#fff5f5",
            color: "#dc2626",
            fontWeight: 600,
            fontSize: "1.05em",
            letterSpacing: "-0.01em",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            alignSelf: "flex-start",
          }}
        >
          <span>📐</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function ExampleList({ items }: { items: string[] }) {
  return (
    <div style={{ margin: "4px 0 8px 0" }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            color: "#9a3412",
            fontStyle: "italic",
            opacity: 0.85,
            letterSpacing: "-0.01em",
            marginBottom: "4px",
          }}
        >
          <span style={{ color: "#ea580c", fontStyle: "normal" }}>🔸 eg: </span>
          {item}
        </div>
      ))}
    </div>
  );
}

function ExamTipList({ items }: { items: string[] }) {
  return (
    <div style={{ margin: "4px 0 8px 0", display: "flex", flexDirection: "column", gap: "5px" }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            background: "#f0fdf4",
            borderLeft: "3px solid #16a34a",
            borderRadius: "0 4px 4px 0",
            padding: "4px 8px",
            color: "#14532d",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          <span style={{ color: "#16a34a" }}>★ </span>
          {item}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HandwrittenNotes({
  content,
  videoTitle,
  channelName,
  durationSeconds,
}: Props) {
  const { title, subject, topic, subtopic, notes } = content;
  const { summary, key_takeaways, sections } = notes ?? {};

  const today = formatDate(new Date());

  // Sort sections by order if provided
  const sortedSections = sections
    ? [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  const displayTitle = videoTitle || title;
  const subjectLine = [subject, topic, subtopic].filter(Boolean).join(" · ");

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; }
          .handwritten-outer {
            transform: none !important;
          }
          .paper {
            box-shadow: none !important;
            background-image: none !important;
            background-color: white !important;
            transform: none !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 20px 40px 40px 60px !important;
            position: static !important;
            overflow: visible !important;
            height: auto !important;
            page-break-inside: auto;
          }
          .paper > div {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Outer wrapper: slight whole-page tilt (removed in print via CSS) */}
      <div
        className={`${kalam.className} handwritten-outer`}
        style={{ transform: "rotate(-0.2deg)", transformOrigin: "top center" }}
      >
        {/* Paper */}
        <div
          id="handwritten-paper"
          className="paper"
          style={{
            backgroundColor: "#fffef0",
            backgroundImage: `
              linear-gradient(90deg, transparent 62px, #ffb3b3 62px, #ffb3b3 63px, transparent 63px)
            `,
            padding: "40px 40px 80px 80px",
            maxWidth: "860px",
            margin: "auto",
            boxShadow: "0 4px 24px rgba(0,0,0,0.10), 2px 2px 8px rgba(0,0,0,0.06)",
            position: "relative",
          }}
        >

          {/* ── Header ── */}
          <div style={{ marginBottom: "24px" }}>
            {/* Top row: subject/topic on left, date on right */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "#6b7280",
                  fontVariant: "small-caps",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                {subjectLine}
              </span>
              <span
                style={{
                  fontSize: "0.82rem",
                  color: "#9ca3af",
                  letterSpacing: "0.02em",
                  fontWeight: 500,
                }}
              >
                {today}
              </span>
            </div>

            {/* Video title */}
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "#1e3a5f",
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
                margin: "0 0 4px 0",
              }}
            >
              {displayTitle}
            </h1>

            {/* Channel + duration */}
            {(channelName || durationSeconds !== undefined) && (
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#9ca3af",
                  fontStyle: "italic",
                  margin: "0 0 16px 0",
                }}
              >
                {channelName && <span>{channelName}</span>}
                {channelName && durationSeconds !== undefined && (
                  <span style={{ margin: "0 6px" }}>·</span>
                )}
                {durationSeconds !== undefined && (
                  <span>{formatDuration(durationSeconds)}</span>
                )}
              </p>
            )}

            {/* Hand-drawn divider */}
            <div
              style={{
                borderBottom: "2.5px solid #1e3a5f",
                marginTop: "8px",
                transform: "skewX(-1deg)",
                opacity: 0.7,
              }}
            />
          </div>

          {/* ── Summary ── */}
          {summary && (
            <div
              style={{
                background: "#f0f7ff",
                borderLeft: "3px solid #6366f1",
                padding: "10px 14px",
                borderRadius: "0 6px 6px 0",
                marginBottom: "24px",
                color: "#374151",
                fontStyle: "italic",
                fontSize: "1.05rem",
                letterSpacing: "-0.01em",
                lineHeight: 1.7,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontStyle: "normal",
                  color: "#4f46e5",
                }}
              >
                Summary:{" "}
              </span>
              {summary}
            </div>
          )}

          {/* ── Key Takeaways ── */}
          {key_takeaways && key_takeaways.length > 0 && (
            <div
              style={{
                border: "1.5px solid #374151",
                borderRadius: "4px",
                padding: "12px 16px",
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  color: "#1e3a5f",
                  fontWeight: 700,
                  fontSize: "1.2rem",
                  marginBottom: "10px",
                  letterSpacing: "-0.01em",
                }}
              >
                ★ Key Takeaways
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {key_takeaways.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "6px",
                      marginBottom: `${bulletMargins[i % bulletMargins.length]}px`,
                      color: "#111827",
                      lineHeight: 1.75,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    <span style={{ color: "#4f46e5", flexShrink: 0 }}>→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Sections ── */}
          {sortedSections.map((section, idx) => (
            <div key={idx} style={{ marginBottom: "32px" }}>
              <SectionDivider />
              <SectionHeading text={section.heading} index={idx} />

              {section.bullets && section.bullets.length > 0 && (
                <BulletList items={section.bullets} />
              )}

              {section.definitions && section.definitions.length > 0 && (
                <DefinitionList items={section.definitions} />
              )}

              {section.formulas && section.formulas.length > 0 && (
                <FormulaList items={section.formulas} />
              )}

              {section.examples && section.examples.length > 0 && (
                <ExampleList items={section.examples} />
              )}

              {section.exam_tips && section.exam_tips.length > 0 && (
                <ExamTipList items={section.exam_tips} />
              )}

              {section.real_world_examples && section.real_world_examples.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontWeight: 700, color: "#0c4a6e", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                    🌍 Real-world Examples
                  </div>
                  {section.real_world_examples.map((ex, j) => (
                    <div key={j} style={{ borderLeft: "2px solid #38bdf8", paddingLeft: "10px", marginBottom: "4px", color: "#0c4a6e", fontSize: "0.95rem", lineHeight: 1.6 }}>
                      {ex}
                    </div>
                  ))}
                </div>
              )}

              {section.code_snippets && section.code_snippets.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontWeight: 700, color: "#374151", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                    💻 Code
                  </div>
                  {section.code_snippets.map((snippet, j) => (
                    <div key={j} style={{ marginBottom: "8px", border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden" }}>
                      <div style={{ background: "#f3f4f6", padding: "3px 10px", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                        {snippet.language === "cpp" ? "C++" : snippet.language.charAt(0).toUpperCase() + snippet.language.slice(1)}
                      </div>
                      <pre style={{ margin: 0, padding: "8px 12px", background: "#fafafa", fontSize: "0.75rem", fontFamily: "monospace", lineHeight: 1.6, overflowX: "auto", color: "#1f2937" }}>
                        {snippet.code}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

        </div>
      </div>

    </>
  );
}
