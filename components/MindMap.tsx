"use client";

import { useState, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Section {
  heading: string;
  bullets: string[];
}

interface Props {
  root: string;
  sections: Section[];
}

// ── Layout constants ──────────────────────────────────────────────────────────

const CW = 180;      // center node width
const CH = 64;       // center node height
const BW = 220;      // branch node width
const BH = 52;       // branch node height
const LW = 260;      // leaf node width
const L_FONT = 11;   // leaf font size (px)
const L_LINE = 17;   // leaf line height (px)
const L_PAD = 14;    // leaf vertical padding (px)
const LEAF_GAP = 12; // gap between sibling leaves
const BRANCH_GAP = 40; // gap between branch groups
const H_CB = 80;     // horiz gap: center → branch
const H_BL = 56;     // horiz gap: branch → leaf
const CANVAS_PAD = 60;

// ── Colors (app palette: white + purple/pink) ─────────────────────────────────

const BG = "#ffffff";
const C_CENTER = "#7c3aed";       // purple-700
const C_BRANCH = "#f3e8ff";       // purple-100 fill
const C_BRANCH_BORDER = "#a855f7"; // purple-500 stroke
const C_LEAF = "#fdf4ff";         // purple-50 fill
const C_LEAF_BORDER = "#e9d5ff";  // purple-200 stroke
const T_WHITE = "#ffffff";
const T_BRANCH = "#6b21a8";       // purple-800
const T_LEAF = "#374151";         // gray-700
const C_LINE = "#c084fc";         // purple-400

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Estimate rendered height of a leaf node based on text length */
function leafHeight(text: string): number {
  const charsPerLine = Math.floor((LW - 20) / (L_FONT * 0.58));
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
  return lines * L_LINE + L_PAD * 2;
}

/** Group info for a single section — bullets capped at 5 */
function groupInfo(section: Section) {
  const bullets = section.bullets.slice(0, 5);
  const heights = bullets.map(leafHeight);
  const totalLeaf = heights.reduce((a, b) => a + b, 0) + LEAF_GAP * Math.max(0, heights.length - 1);
  return { bullets, heights, totalLeaf, groupH: Math.max(BH + 16, totalLeaf) };
}

/** S-curve bezier between two points (horizontal bias) */
function sCurve(x1: number, y1: number, x2: number, y2: number, key: string) {
  const mx = (x1 + x2) / 2;
  return (
    <path
      key={key}
      d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
      fill="none"
      stroke={C_LINE}
      strokeWidth={1.5}
      opacity={0.65}
    />
  );
}

// ── Node component ────────────────────────────────────────────────────────────

interface NodeProps {
  x: number; y: number; w: number; h: number;
  text: string; bg: string; color: string; stroke?: string;
  fontSize: number; bold?: boolean; rx?: number;
}

function MNode({ x, y, w, h, text, bg, color, stroke, fontSize, bold, rx = 10 }: NodeProps) {
  return (
    <g>
      <rect x={x} y={y - h / 2} width={w} height={h} rx={rx} fill={bg}
        stroke={stroke} strokeWidth={stroke ? 1.5 : 0} />
      <foreignObject x={x + 8} y={y - h / 2 + L_PAD / 2} width={w - 16} height={h - L_PAD}>
        {/* @ts-ignore */}
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            color,
            fontSize,
            fontWeight: bold ? 600 : 400,
            lineHeight: `${L_LINE}px`,
            wordBreak: "break-word",
          }}
        >
          {text}
        </div>
      </foreignObject>
    </g>
  );
}

// ── SVG renderer ──────────────────────────────────────────────────────────────

function MindMapSVG({ root, sections }: Props) {
  const n = sections.length;
  const left = sections.slice(0, Math.ceil(n / 2));
  const right = sections.slice(Math.ceil(n / 2));

  const leftInfo = left.map(groupInfo);
  const rightInfo = right.map(groupInfo);

  const totalH = (infos: ReturnType<typeof groupInfo>[]) =>
    infos.reduce((a, g) => a + g.groupH, 0) + BRANCH_GAP * Math.max(0, infos.length - 1);

  const leftH = totalH(leftInfo);
  const rightH = totalH(rightInfo);
  const canvasH = Math.max(leftH, rightH, CH + 40) + CANVAS_PAD * 2;
  const canvasW = CANVAS_PAD * 2 + LW * 2 + H_BL * 2 + BW * 2 + H_CB * 2 + CW;

  const cx = canvasW / 2;
  const cy = canvasH / 2;

  // X anchor points
  const cLeft = cx - CW / 2;
  const cRight = cx + CW / 2;
  const lBranchR = cLeft - H_CB;
  const lBranchL = lBranchR - BW;
  const lLeafR = lBranchL - H_BL;
  const lLeafL = lLeafR - LW;
  const rBranchL = cRight + H_CB;
  const rBranchR = rBranchL + BW;
  const rLeafL = rBranchR + H_BL;

  const lines: React.ReactNode[] = [];
  const nodes: React.ReactNode[] = [];

  // LEFT
  let curY = cy - leftH / 2;
  left.forEach((section, bi) => {
    const info = leftInfo[bi];
    const bY = curY + info.groupH / 2;

    lines.push(sCurve(cLeft, cy, lBranchR, bY, `lc-${bi}`));
    nodes.push(
      <MNode key={`lb-${bi}`} x={lBranchL} y={bY} w={BW} h={BH}
        text={section.heading} bg={C_BRANCH} color={T_BRANCH} stroke={C_BRANCH_BORDER}
        fontSize={11} bold />
    );

    let leafY = bY - info.totalLeaf / 2;
    info.bullets.forEach((bullet, ci) => {
      const lh = info.heights[ci];
      const lmY = leafY + lh / 2;
      lines.push(sCurve(lBranchL, bY, lLeafR, lmY, `ll-${bi}-${ci}`));
      nodes.push(
        <MNode key={`llf-${bi}-${ci}`} x={lLeafL} y={lmY} w={LW} h={lh}
          text={bullet} bg={C_LEAF} color={T_LEAF} stroke={C_LEAF_BORDER}
          fontSize={L_FONT} rx={8} />
      );
      leafY += lh + LEAF_GAP;
    });

    curY += info.groupH + BRANCH_GAP;
  });

  // RIGHT
  curY = cy - rightH / 2;
  right.forEach((section, bi) => {
    const info = rightInfo[bi];
    const bY = curY + info.groupH / 2;

    lines.push(sCurve(cRight, cy, rBranchL, bY, `rc-${bi}`));
    nodes.push(
      <MNode key={`rb-${bi}`} x={rBranchL} y={bY} w={BW} h={BH}
        text={section.heading} bg={C_BRANCH} color={T_BRANCH} stroke={C_BRANCH_BORDER}
        fontSize={11} bold />
    );

    let leafY = bY - info.totalLeaf / 2;
    info.bullets.forEach((bullet, ci) => {
      const lh = info.heights[ci];
      const lmY = leafY + lh / 2;
      lines.push(sCurve(rBranchR, bY, rLeafL, lmY, `rl-${bi}-${ci}`));
      nodes.push(
        <MNode key={`rlf-${bi}-${ci}`} x={rLeafL} y={lmY} w={LW} h={lh}
          text={bullet} bg={C_LEAF} color={T_LEAF} stroke={C_LEAF_BORDER}
          fontSize={L_FONT} rx={8} />
      );
      leafY += lh + LEAF_GAP;
    });

    curY += info.groupH + BRANCH_GAP;
  });

  return (
    <svg
      viewBox={`0 0 ${canvasW} ${canvasH}`}
      width="100%"
      style={{ display: "block", background: BG }}
    >
      {lines}
      {nodes}
      {/* Center node rendered last → always on top */}
      <MNode
        x={cLeft} y={cy} w={CW} h={CH}
        text={root} bg={C_CENTER} color="#ffffff"
        fontSize={13} bold rx={32}
      />
    </svg>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function MindMap({ root, sections }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const drag = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);

  if (!sections || sections.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        No mind map data available.
      </div>
    );
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.min(3, Math.max(0.2, s - e.deltaY * 0.001)));
  };
  const onDown = (e: React.MouseEvent) => {
    drag.current = { sx: e.clientX, sy: e.clientY, tx: translate.x, ty: translate.y };
  };
  const onMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    setTranslate({ x: drag.current.tx + e.clientX - drag.current.sx, y: drag.current.ty + e.clientY - drag.current.sy });
  };
  const onUp = () => { drag.current = null; };

  const map = <MindMapSVG root={root} sections={sections} />;

  if (fullscreen) {
    return (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#f9fafb", overflow: "hidden", cursor: "grab" }}
        onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      >
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10000, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#9ca3af", fontSize: 11 }}>Scroll to zoom · Drag to pan</span>
          <button
            onClick={() => { setFullscreen(false); setScale(1); setTranslate({ x: 0, y: 0 }); }}
            style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 14px", color: "#374151", cursor: "pointer", fontSize: 13 }}
          >
            ✕ Close
          </button>
        </div>
        <div style={{
          transform: `translate(calc(-50% + ${translate.x}px), calc(-50% + ${translate.y}px)) scale(${scale})`,
          transformOrigin: "center center",
          position: "absolute", top: "50%", left: "50%",
        }}>
          {map}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setFullscreen(true)}
      style={{ position: "relative", background: "#faf5ff", borderRadius: 12, overflow: "hidden", border: "1px solid #e9d5ff", cursor: "zoom-in" }}
    >
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, background: "#fff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "6px 12px", color: "#7c3aed", fontSize: 12, fontWeight: 500, pointerEvents: "none" }}>
        ⛶ Fullscreen
      </div>
      {map}
    </div>
  );
}
