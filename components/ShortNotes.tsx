"use client";

interface ShortNoteSection {
  heading: string;
  formulas?: string[];
  key_concepts?: string[];
  definitions?: string[];
  must_remember?: string[];
}

interface ShortNotesData {
  sections: ShortNoteSection[];
}

interface Props {
  data: ShortNotesData;
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
    <div
      style={{
        background: "#ffffff",
        maxWidth: "768px",
        padding: "24px",
        margin: "0 auto",
      }}
    >
      {data.sections.map((section, i) => (
        <div key={i}>
          {/* Section heading */}
          <h2
            style={{
              fontWeight: "bold",
              color: "#1e3a5f",
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: "6px",
              marginBottom: "10px",
              fontSize: "15px",
            }}
          >
            {section.heading}
          </h2>

          {/* Formulas */}
          {section.formulas && section.formulas.length > 0 && (
            <div style={{ marginBottom: "8px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginRight: "6px",
                }}
              >
                📐
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                {section.formulas.map((formula, j) => (
                  <span
                    key={j}
                    style={{
                      background: "#fff1f2",
                      border: "1px solid #fecaca",
                      color: "#b91c1c",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {formula}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key concepts */}
          {section.key_concepts && section.key_concepts.length > 0 && (
            <ul style={{ marginBottom: "8px", paddingLeft: "0", listStyle: "none" }}>
              {section.key_concepts.map((concept, j) => (
                <li
                  key={j}
                  style={{
                    display: "flex",
                    gap: "6px",
                    fontSize: "14px",
                    color: "#1f2937",
                    lineHeight: "1.4",
                    marginBottom: "2px",
                  }}
                >
                  <span style={{ color: "#4f46e5", flexShrink: 0 }}>•</span>
                  <span>{concept}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Definitions */}
          {section.definitions && section.definitions.length > 0 && (
            <div style={{ marginBottom: "8px" }}>
              {section.definitions.map((def, j) => (
                <p
                  key={j}
                  style={{
                    fontSize: "14px",
                    color: "#1d4ed8",
                    fontStyle: "italic",
                    marginBottom: "2px",
                  }}
                >
                  📖 {def}
                </p>
              ))}
            </div>
          )}

          {/* Must remember */}
          {section.must_remember && section.must_remember.length > 0 && (
            <div style={{ marginBottom: "8px" }}>
              {section.must_remember.map((item, j) => (
                <div
                  key={j}
                  style={{
                    borderLeft: "2px solid #22c55e",
                    paddingLeft: "8px",
                    background: "#f0fdf4",
                    color: "#14532d",
                    fontSize: "12px",
                    fontWeight: "500",
                    marginBottom: "4px",
                    padding: "4px 4px 4px 8px",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          )}

          {/* Separator between sections */}
          {i < data.sections.length - 1 && (
            <hr
              style={{
                border: "none",
                borderTop: "1px solid #e5e7eb",
                margin: "16px 0",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
