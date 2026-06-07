/**
 * GET /api/notes/[videoId]/short-notes
 *
 * Lazy short-notes generation.
 * - If short_notes_json already exists in DB → return it immediately (no AI call).
 * - If null → call Gemini, save to DB, then return. First open only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SHORT_NOTES_SYSTEM = `You are ReviseAI. Generate an ultra-concise, domain-aware cheat sheet from structured lecture notes.
Output ONLY valid JSON. No markdown fences, no explanation.`;

const SHORT_NOTES_USER = `Given this lecture notes JSON, generate a SHORT NOTES cheat sheet for last-minute revision.

STEP 1 — Detect the domain from the content:
  - MATH / PHYSICS / CHEMISTRY → formulas are mandatory; derive and include every formula mentioned
  - CODING / CS / DSA / PROGRAMMING → code_snippets are mandatory; include the core algorithm/pattern in Python, Java, and C++
  - BIOLOGY / MEDICINE → include classifications, processes, must_remember for mnemonics
  - HISTORY / ECONOMICS / POLITY → include key_events (date: event format), cause_effect, key_concepts
  - CONCEPTUAL / EXPLANATION (any domain) → include a real_world_examples field with 2-3 concrete real-world examples (no analogies — actual scenarios)
  - GENERAL → use key_concepts + definitions + must_remember

STEP 2 — Build sections using only the fields relevant to the detected domain per section.

Field rules:
- formulas: raw formula string only. e.g. "F = ma", "σ(z) = 1/(1 + e^(-z))"
- key_concepts: ≤12 words each — crisp factual statement
- definitions: "Term: definition" format, ≤15 words total
- must_remember: ≤12 words — exam tip, common mistake, or mnemonic
- code_snippets: array of { language: "python"|"java"|"cpp", code: "..." } — complete runnable snippet, not pseudocode
- real_world_examples: ≤20 words each — concrete scenario, no analogies (e.g. "GPS uses Dijkstra's algorithm to find shortest driving route")
- key_events: "Year/Date: event" format, ≤15 words

Limits:
- Maximum 6 sections
- Maximum 5 items per field per section
- 1-2 printed A4 pages worth of content (40-60 total items)
- Skip fields that have nothing relevant

Return ONLY JSON matching this schema:
{
  "domain": "math|physics|chemistry|coding|biology|history|economics|conceptual|general",
  "sections": [
    {
      "heading": "section name",
      "formulas": [],
      "key_concepts": [],
      "definitions": [],
      "must_remember": [],
      "code_snippets": [{ "language": "python", "code": "..." }, { "language": "java", "code": "..." }, { "language": "cpp", "code": "..." }],
      "real_world_examples": [],
      "key_events": []
    }
  ]
}

Notes JSON:
`;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: note } = await supabase
    .from("user_notes")
    .select("id")
    .eq("user_id", user.id)
    .eq("processed_video_id", videoId)
    .single();

  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch video — get both short_notes_json and notes_json in one query
  const { data: video } = await supabase
    .from("processed_videos")
    .select("short_notes_json, notes_json")
    .eq("id", videoId)
    .eq("status", "done")
    .single();

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  // Already generated — return immediately, no AI call
  if (video.short_notes_json) {
    return NextResponse.json({ short_notes: video.short_notes_json });
  }

  // Generate now
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: SHORT_NOTES_SYSTEM,
    });

    const notesJson = JSON.stringify(video.notes_json ?? {}, null, 2).slice(0, 8000);
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: SHORT_NOTES_USER + notesJson }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    });

    let raw = result.response.text().trim();
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const shortNotes = JSON.parse(raw);

    // Persist so next open is instant
    await supabase
      .from("processed_videos")
      .update({ short_notes_json: shortNotes })
      .eq("id", videoId);

    return NextResponse.json({ short_notes: shortNotes });
  } catch (err) {
    console.error("[short-notes] generation failed:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
