"use client";

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

interface Props {
  title: string;
  notes: NotesJson;
}

const CX = 450;
const CY = 420;
const SECTION_RADIUS = 220;
const BULLET_RADIUS = 155;
const MAX_BULLETS = 2;
const TRUNCATE_LEN = 40;

function truncate(text: string, len: number = TRUNCATE_LEN): string {
  return text.length > len ? text.slice(0, len - 1) + "…" : text;
}

// Compute (x, y) from center at angle (radians) and distance
function polar(cx: number, cy: number, angle: number, r: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

// Cubic bezier path string between two points, curving slightly
function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

interface NodeBoxProps {
  x: number;
  y: number;
  text: string;
  fill: string;
  textColor: string;
  width: number;
  height: number;
  rx?: number;
  fontSize?: number;
  fontWeight?: string;
}

function NodeBox({
  x,
  y,
  text,
  fill,
  textColor,
  width,
  height,
  rx = 10,
  fontSize = 12,
  fontWeight = "normal",
}: NodeBoxProps) {
  // foreignObject for text wrapping
  const fo = (
    <foreignObject
      x={x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      style={{ overflow: "visible" }}
    >
      {/* @ts-ignore: xmlns required for SVG foreignObject */}
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: `${fontSize}px`,
          fontWeight,
          color: textColor,
          padding: "4px 6px",
          boxSizing: "border-box",
          wordBreak: "break-word",
          lineHeight: 1.3,
        }}
      >
        {text}
      </div>
    </foreignObject>
  );

  return (
    <g>
      <rect
        x={x - width / 2}
        y={y - height / 2}
        width={width}
        height={height}
        rx={rx}
        fill={fill}
      />
      {fo}
    </g>
  );
}

export default function MindMap({ title, notes }: Props) {
  const sections = notes.sections ?? [];
  const sectionCount = sections.length;

  if (sectionCount === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        No sections available to display as a mind map.
      </div>
    );
  }

  // Precompute all positions
  const sectionAngles = sections.map((_, i) => (2 * Math.PI * i) / sectionCount - Math.PI / 2);

  // Collect all SVG elements to render in defined order (lines first, nodes on top)
  const lines: React.ReactNode[] = [];
  const nodes: React.ReactNode[] = [];

  sections.forEach((section, si) => {
    const angle = sectionAngles[si];
    const [sx, sy] = polar(CX, CY, angle, SECTION_RADIUS);

    // Line: center → section
    lines.push(
      <path
        key={`line-center-${si}`}
        d={bezierPath(CX, CY, sx, sy)}
        stroke="#7c3aed"
        strokeWidth={2}
        fill="none"
        opacity={0.5}
      />
    );

    // Bullets
    const bullets = (section.bullets ?? []).slice(0, MAX_BULLETS);
    const bulletCount = bullets.length;

    bullets.forEach((bullet, bi) => {
      // Spread bullets in a 60° arc centered on the section angle (outward from center)
      const spread = bulletCount > 1 ? (Math.PI * 80 / 180) : 0; // 80° arc
      const startAngle = angle - spread / 2;
      const bulletAngle = bulletCount > 1
        ? startAngle + (spread / (bulletCount - 1)) * bi
        : angle;

      const [bx, by] = polar(sx, sy, bulletAngle, BULLET_RADIUS);

      // Line: section → bullet
      lines.push(
        <path
          key={`line-bullet-${si}-${bi}`}
          d={bezierPath(sx, sy, bx, by)}
          stroke="#6b7280"
          strokeWidth={1.5}
          fill="none"
          opacity={0.4}
          strokeDasharray="4 3"
        />
      );

      // Bullet node
      nodes.push(
        <NodeBox
          key={`bullet-${si}-${bi}`}
          x={bx}
          y={by}
          text={truncate(bullet, 38)}
          fill="#f3f4f6"
          textColor="#374151"
          width={120}
          height={50}
          rx={8}
          fontSize={10}
        />
      );
    });

    // Section node (rendered after bullets so it sits on top of its lines)
    nodes.push(
      <NodeBox
        key={`section-${si}`}
        x={sx}
        y={sy}
        text={truncate(section.heading, 36)}
        fill="#4f46e5"
        textColor="#ffffff"
        width={130}
        height={52}
        rx={10}
        fontSize={11}
        fontWeight="600"
      />
    );
  });

  // Center node — rendered last so it sits on top of all lines
  const centerNode = (
    <NodeBox
      key="center"
      x={CX}
      y={CY}
      text={truncate(title, 42)}
      fill="#7c3aed"
      textColor="#ffffff"
      width={150}
      height={60}
      rx={14}
      fontSize={13}
      fontWeight="700"
    />
  );

  return (
    <svg
      viewBox="0 0 900 840"
      width="100%"
      aria-label="Mind map"
      style={{ display: "block", background: "#ffffff" }}
    >
      {lines}
      {nodes}
      {centerNode}
    </svg>
  );
}
