"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/mixpanel";
import { ArrowLeft, Star, BookOpen, Zap, HelpCircle, ExternalLink, PenLine, Download } from "lucide-react";
import HandwrittenNotes from "@/components/HandwrittenNotes";
import clsx from "clsx";

// ── Types ────────────────────────────────────────────────────────────────────

interface NoteSection {
  heading: string;
  order?: number;
  bullets?: string[];
  formulas?: string[];
  definitions?: string[];
  examples?: string[];
  exam_tips?: string[];
}

interface NotesJson {
  summary?: string;
  key_takeaways?: string[];
  sections?: NoteSection[];
}

interface Flashcard {
  question: string;
  answer: string;
  concept?: string;
  difficulty?: string;
  exam_tags?: string[];
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  concept?: string;
  explanation?: string;
  difficulty?: string;
  marks?: number;
}

interface Video {
  id: string;
  title?: string;
  channel_name?: string;
  duration_seconds?: number;
  language?: string;
  youtube_url?: string;
  notes_json?: NotesJson | null;
  notes_structured?: string | null;
  flashcards_json?: Flashcard[] | null;
  quiz_json?: QuizQuestion[] | null;
}

interface Props {
  video: Video;
  isStarred: boolean;
}

type Tab = "notes" | "flashcards" | "quiz" | "handwritten";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds?: number) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-green-600 bg-green-50",
  medium: "text-yellow-600 bg-yellow-50",
  hard: "text-red-600 bg-red-50",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function NotesTab({ notes }: { notes: NotesJson }) {
  return (
    <div className="space-y-6">
      {notes.summary && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-2">Summary</h3>
          <p className="text-gray-800 text-sm leading-relaxed">{notes.summary}</p>
        </div>
      )}

      {notes.key_takeaways && notes.key_takeaways.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Key Takeaways</h3>
          <ul className="space-y-2">
            {notes.key_takeaways.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-purple-500 mt-0.5 shrink-0">✦</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes.sections?.map((section, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-4 text-base">{section.heading}</h3>

          {section.bullets && section.bullets.length > 0 && (
            <ul className="space-y-1.5 mb-4">
              {section.bullets.map((b, j) => (
                <li key={j} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-gray-400 shrink-0 mt-1">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {section.definitions && section.definitions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">Definitions</p>
              <div className="space-y-1">
                {section.definitions.map((d, j) => (
                  <p key={j} className="text-sm text-gray-700 bg-blue-50 rounded-lg px-3 py-2">{d}</p>
                ))}
              </div>
            </div>
          )}

          {section.formulas && section.formulas.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-2">Formulas</p>
              <div className="space-y-1">
                {section.formulas.map((f, j) => (
                  <p key={j} className="text-sm font-mono text-gray-800 bg-orange-50 rounded-lg px-3 py-2">{f}</p>
                ))}
              </div>
            </div>
          )}

          {section.examples && section.examples.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2">Examples</p>
              <div className="space-y-1">
                {section.examples.map((e, j) => (
                  <p key={j} className="text-sm text-gray-700 bg-emerald-50 rounded-lg px-3 py-2">{e}</p>
                ))}
              </div>
            </div>
          )}

          {section.exam_tips && section.exam_tips.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-2">Exam Tips</p>
              <div className="space-y-1">
                {section.exam_tips.map((t, j) => (
                  <p key={j} className="text-sm text-gray-700 bg-purple-50 rounded-lg px-3 py-2">💡 {t}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FlashcardsTab({ cards }: { cards: Flashcard[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());

  const card = cards[index];

  function next() {
    setFlipped(false);
    setReviewed((r) => new Set(r).add(index));
    setTimeout(() => setIndex((i) => Math.min(i + 1, cards.length - 1)), 150);
  }

  function prev() {
    setFlipped(false);
    setTimeout(() => setIndex((i) => Math.max(i - 1, 0)), 150);
  }

  function handleFlip() {
    setFlipped((f) => !f);
    if (!flipped) {
      track("flashcard_reviewed", { card_index: index, concept: card.concept });
    }
  }

  if (!card) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Progress */}
      <div className="w-full max-w-xl flex items-center justify-between text-xs text-gray-400">
        <span>{reviewed.size} / {cards.length} reviewed</span>
        <span className={DIFFICULTY_COLOR[card.difficulty ?? "medium"] + " px-2 py-0.5 rounded-full capitalize font-medium"}>
          {card.difficulty ?? "medium"}
        </span>
      </div>

      <div className="w-full max-w-xl">
        <div
          className="relative cursor-pointer select-none"
          style={{ perspective: "1000px" }}
          onClick={handleFlip}
        >
          <div
            className="relative transition-transform duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              minHeight: "240px",
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 bg-white border-2 border-purple-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm"
              style={{ backfaceVisibility: "hidden" }}
            >
              {card.concept && (
                <span className="text-xs text-purple-500 font-medium mb-3 uppercase tracking-wider">{card.concept}</span>
              )}
              <p className="text-gray-900 font-semibold text-lg leading-snug">{card.question}</p>
              <p className="text-xs text-gray-400 mt-6">tap to reveal answer</p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 bg-purple-600 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <p className="text-white font-medium text-base leading-relaxed">{card.answer}</p>
              {card.exam_tags && card.exam_tags.length > 0 && (
                <div className="flex gap-1 mt-4 flex-wrap justify-center">
                  {card.exam_tags.map((tag) => (
                    <span key={tag} className="text-xs text-purple-200 bg-purple-700 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={prev}
          disabled={index === 0}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-50"
        >
          ← Prev
        </button>
        <span className="text-sm text-gray-500">{index + 1} / {cards.length}</span>
        <button
          onClick={next}
          disabled={index === cards.length - 1}
          className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-purple-700"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function QuizTab({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  function select(qIdx: number, optIdx: number) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qIdx]: optIdx }));
  }

  function submit() {
    setSubmitted(true);
    const score = questions.filter((q, i) => answers[i] === q.correct).length;
    track("quiz_completed", {
      total: questions.length,
      correct: score,
      score_pct: Math.round((score / questions.length) * 100),
    });
  }

  const score = submitted
    ? questions.filter((q, i) => answers[i] === q.correct).length
    : null;

  return (
    <div className="space-y-6">
      {submitted && score !== null && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-purple-700">{score}/{questions.length}</p>
          <p className="text-gray-600 text-sm mt-1">
            {score === questions.length ? "Perfect score!" : score >= questions.length * 0.7 ? "Great job!" : "Keep practicing!"}
          </p>
        </div>
      )}

      {questions.map((q, qi) => {
        const chosen = answers[qi];
        const isCorrect = chosen === q.correct;

        return (
          <div key={qi} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4 gap-4">
              <p className="font-semibold text-gray-900 text-sm leading-snug flex-1">
                <span className="text-purple-500 mr-2">Q{qi + 1}.</span>
                {q.question}
              </p>
              <span className={clsx("text-xs px-2 py-0.5 rounded-full shrink-0 font-medium capitalize", DIFFICULTY_COLOR[q.difficulty ?? "medium"])}>
                {q.difficulty ?? "medium"}
              </span>
            </div>

            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                let cls = "border border-gray-200 text-gray-700 hover:bg-gray-50";
                if (submitted) {
                  if (oi === q.correct) cls = "border-green-400 bg-green-50 text-green-800 font-medium";
                  else if (oi === chosen && !isCorrect) cls = "border-red-300 bg-red-50 text-red-700";
                  else cls = "border-gray-100 text-gray-400";
                } else if (chosen === oi) {
                  cls = "border-purple-400 bg-purple-50 text-purple-800";
                }

                return (
                  <button
                    key={oi}
                    onClick={() => select(qi, oi)}
                    className={clsx("w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors", cls)}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {submitted && q.explanation && (
              <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                💡 {q.explanation}
              </p>
            )}
          </div>
        );
      })}

      {!submitted && (
        <button
          onClick={submit}
          disabled={Object.keys(answers).length < questions.length}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
        >
          Submit Quiz ({Object.keys(answers).length}/{questions.length} answered)
        </button>
      )}

      {submitted && (
        <button
          onClick={() => { setAnswers({}); setSubmitted(false); }}
          className="w-full py-3 border border-purple-200 text-purple-700 font-semibold rounded-xl text-sm hover:bg-purple-50 transition-colors"
        >
          Retake Quiz
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NotesClient({ video, isStarred }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("notes");
  const [starred, setStarred] = useState(isStarred);

  // notes_json stores the full GeneratedContent object; the notes sub-key holds summary/sections
  const rawJson = video.notes_json as (NotesJson & { notes?: NotesJson }) | null;
  const notes: NotesJson | null = rawJson?.notes ?? rawJson ?? null;
  const generatedContent = rawJson as any;
  const flashcards = video.flashcards_json ?? [];
  const quiz = video.quiz_json ?? [];

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "notes", label: "Notes", icon: <BookOpen className="w-4 h-4" /> },
    { id: "flashcards", label: "Flashcards", icon: <Zap className="w-4 h-4" />, count: flashcards.length },
    { id: "quiz", label: "Quiz", icon: <HelpCircle className="w-4 h-4" />, count: quiz.length },
    { id: "handwritten", label: "Handwritten", icon: <PenLine className="w-4 h-4" /> },
  ];

  function exportPdf() {
    track("export_triggered", { tab, video_id: video.id });

    if (tab === "handwritten") {
      window.open(`/print/notes/${video.id}`, "_blank");
      return;
    }

    // Notes / other tabs: visibility injection (content uses Tailwind already loaded)
    const id = "notes-print-content";
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        @page { margin: 0.5in; }
        body * { visibility: hidden !important; }
        #${id}, #${id} * {
          visibility: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #${id} {
          position: absolute; top: 0; left: 0;
          width: 100%; height: auto; min-height: auto;
        }
      }
    `;
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      setTimeout(() => document.head.removeChild(style), 500);
    }, 100);
  }

  async function toggleStar() {    const next = !starred;
    setStarred(next);
    track("note_starred", { video_id: video.id, starred: next });
    await fetch(`/api/notes/${video.id}/star`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_starred: next }),
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to library
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-xl leading-snug line-clamp-2">
              {video.title ?? "Untitled"}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {video.channel_name && (
                <span className="text-sm text-gray-500">{video.channel_name}</span>
              )}
              {video.language && (
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full capitalize">
                  {video.language}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {video.duration_seconds ? (
              <div className="text-right">
                <p className="text-xs text-gray-400 leading-none mb-0.5">Duration</p>
                <p className="text-sm font-semibold text-gray-700">{formatDuration(video.duration_seconds)}</p>
              </div>
            ) : null}
            {video.youtube_url && (
              <a
                href={video.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                title="Open on YouTube"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={toggleStar}
              className={clsx(
                "p-2 rounded-xl border transition-colors",
                starred
                  ? "border-yellow-300 bg-yellow-50 text-yellow-500"
                  : "border-gray-200 text-gray-400 hover:bg-gray-50"
              )}
              title={starred ? "Unstar" : "Star"}
            >
              <Star className="w-4 h-4" fill={starred ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              track("notes_tab_switched", { tab: t.id, video_id: video.id });
            }}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={clsx(
                "text-xs px-1.5 py-0.5 rounded-full",
                tab === t.id ? "bg-purple-100 text-purple-600" : "bg-gray-200 text-gray-500"
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Export button — only for notes + handwritten */}
      {(tab === "notes" || tab === "handwritten") && (
        <div className="flex justify-end mb-4">
          <button
            onClick={exportPdf}
            className="flex items-center gap-1.5 text-xs font-medium text-purple-700 border border-purple-200 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </button>
        </div>
      )}

      {/* Content */}
      <div id="notes-print-content">
        {tab === "notes" && notes && <NotesTab notes={notes} />}
        {tab === "notes" && !notes && (
          <div className="text-center py-20 text-gray-400">Notes not available for this video.</div>
        )}
      </div>

      {tab === "flashcards" && flashcards.length > 0 && <FlashcardsTab cards={flashcards} />}
      {tab === "flashcards" && flashcards.length === 0 && (
        <div className="text-center py-20 text-gray-400">No flashcards generated for this video.</div>
      )}

      {tab === "quiz" && quiz.length > 0 && <QuizTab questions={quiz} />}
      {tab === "quiz" && quiz.length === 0 && (
        <div className="text-center py-20 text-gray-400">No quiz questions generated for this video.</div>
      )}

      {tab === "handwritten" && generatedContent?.notes && (
        <HandwrittenNotes
          content={generatedContent}
          videoTitle={video.title}
          channelName={video.channel_name}
          durationSeconds={video.duration_seconds}
        />
      )}
      {tab === "handwritten" && !generatedContent?.notes && (
        <div className="text-center py-20 text-gray-400">Handwritten notes not available.</div>
      )}
    </div>
  );
}
