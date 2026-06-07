"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

interface CodeSnippet {
  language: "python" | "java" | "cpp";
  code: string;
}

interface ShortNoteSection {
  heading: string;
  formulas?: string[];
  key_concepts?: string[];
  definitions?: string[];
  must_remember?: string[];
  code_snippets?: CodeSnippet[];
  real_world_examples?: string[];
  key_events?: string[];
}

interface ShortNotesData {
  domain?: string;
  sections: ShortNoteSection[];
}

interface Props {
  data: ShortNotesData;
}

const LANG_LABEL: Record<string, string> = {
  python: "Python",
  java: "Java",
  cpp: "C++",
};

const LANG_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  python: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  java:   { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  cpp:    { bg: "#fdf4ff", border: "#e9d5ff", text: "#7c3aed" },
};

function FormulaBlock({ text }: { text: string }) {
  const latex = text
    .replace(/\^(\(([^)]+)\))/g, "^{$2}")
    .replace(/_(\(([^)]+)\))/g, "_{$2}")
    .replace(/\*/g, "\\cdot ")
    .replace(/Σ/g, "\\Sigma ")
    .replace(/Π/g, "\\Pi ")
    .replace(/α/g, "\\alpha ")
    .replace(/β/g, "\\beta ")
    .replace(/θ/g, "\\theta ")
    .replace(/λ/g, "\\lambda ")
    .replace(/μ/g, "\\mu ")
    .replace(/σ/g, "\\sigma ")
    .replace(/√/g, "\\sqrt")
    .replace(/∞/g, "\\infty ")
    .replace(/≈/g, "\\approx ")
    .replace(/≤/g, "\\leq ")
    .replace(/≥/g, "\\geq ")
    .replace(/≠/g, "\\neq ");

  try {
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      output: "html",
    });
    return (
      <span
        style={{ background: "#fff1f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "4px 12px", display: "inline-block" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return (
      <span style={{ background: "#fff1f2", border: "1px solid #fecaca", color: "#b91c1c", fontFamily: "monospace", fontSize: "13px", padding: "4px 12px", borderRadius: "6px", display: "inline-block" }}>
        {text}
      </span>
    );
  }
}

function DefinitionLine({ text }: { text: string }) {
  const colonIdx = text.indexOf(":");
  if (colonIdx === -1) return <span>{text}</span>;
  const term = text.slice(0, colonIdx).trim();
  const value = text.slice(colonIdx + 1).trim();
  const looksLikeMath = /[=^]/.test(value);
  return (
    <>
      <span style={{ fontWeight: 600, fontStyle: "normal", color: "#1d4ed8" }}>{term}:</span>{" "}
      {looksLikeMath ? <FormulaBlock text={value} /> : <span>{value}</span>}
    </>
  );
}

function CodeBlock({ snippet }: { snippet: CodeSnippet }) {
  const colors = LANG_COLOR[snippet.language] ?? { bg: "#f9fafb", border: "#e5e7eb", text: "#374151" };
  return (
    <div style={{ marginBottom: "8px", borderRadius: "8px", border: `1px solid ${colors.border}`, overflow: "hidden" }}>
      <div style={{ background: colors.bg, padding: "4px 10px", fontSize: "11px", fontWeight: 600, color: colors.text, borderBottom: `1px solid ${colors.border}` }}>
        {LANG_LABEL[snippet.language] ?? snippet.language}
      </div>
      <pre style={{ margin: 0, padding: "10px 12px", background: "#fafafa", fontSize: "12px", lineHeight: "1.6", overflowX: "auto", color: "#1f2937", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
        {snippet.code}
      </pre>
    </div>
  );
}

export default function ShortNotes({ data }: Props) {
  if (!data || !data.sections || data.sections.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        No short notes available.
      </div>
    );
  }

  return (
    <div style={{ background: "#ffffff", maxWidth: "768px", padding: "24px", margin: "0 auto" }}>
      {data.sections.map((section, i) => (
        <div key={i}>
          <h2 style={{ fontWeight: "bold", color: "#1e3a5f", borderBottom: "1px solid #e5e7eb", paddingBottom: "6px", marginBottom: "12px", fontSize: "15px" }}>
            {section.heading}
          </h2>

          {/* Formulas */}
          {section.formulas && section.formulas.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                📐 Formulas
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {section.formulas.map((f, j) => <FormulaBlock key={j} text={f} />)}
              </div>
            </div>
          )}

          {/* Code snippets */}
          {section.code_snippets && section.code_snippets.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                💻 Code
              </div>
              {section.code_snippets.map((snippet, j) => <CodeBlock key={j} snippet={snippet} />)}
            </div>
          )}

          {/* Key concepts */}
          {section.key_concepts && section.key_concepts.length > 0 && (
            <ul style={{ marginBottom: "10px", paddingLeft: 0, listStyle: "none" }}>
              {section.key_concepts.map((concept, j) => (
                <li key={j} style={{ display: "flex", gap: "6px", fontSize: "14px", color: "#1f2937", lineHeight: "1.4", marginBottom: "3px" }}>
                  <span style={{ color: "#4f46e5", flexShrink: 0 }}>•</span>
                  <span>{concept}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Definitions */}
          {section.definitions && section.definitions.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              {section.definitions.map((def, j) => (
                <p key={j} style={{ fontSize: "14px", color: "#1d4ed8", fontStyle: "italic", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  📖 <DefinitionLine text={def} />
                </p>
              ))}
            </div>
          )}

          {/* Real-world examples */}
          {section.real_world_examples && section.real_world_examples.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                🌍 Real-world Examples
              </div>
              {section.real_world_examples.map((ex, j) => (
                <div key={j} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "6px", padding: "6px 10px", fontSize: "13px", color: "#0c4a6e", marginBottom: "4px" }}>
                  {ex}
                </div>
              ))}
            </div>
          )}

          {/* Key events */}
          {section.key_events && section.key_events.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                📅 Key Events
              </div>
              {section.key_events.map((ev, j) => (
                <div key={j} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "#374151", marginBottom: "3px" }}>
                  <span style={{ color: "#d97706", fontWeight: 600, flexShrink: 0 }}>›</span>
                  <span>{ev}</span>
                </div>
              ))}
            </div>
          )}

          {/* Must remember */}
          {section.must_remember && section.must_remember.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              {section.must_remember.map((item, j) => (
                <div key={j} style={{ borderLeft: "2px solid #22c55e", background: "#f0fdf4", color: "#14532d", fontSize: "12px", fontWeight: 500, marginBottom: "4px", padding: "4px 4px 4px 8px" }}>
                  {item}
                </div>
              ))}
            </div>
          )}

          {i < data.sections.length - 1 && (
            <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "16px 0" }} />
          )}
        </div>
      ))}
    </div>
  );
}
