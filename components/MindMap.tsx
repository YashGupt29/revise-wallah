"use client";

interface MindMapChild {
  label: string;
  leaf?: boolean;
}

interface MindMapBranch {
  label: string;
  children: MindMapChild[];
}

interface MindMapData {
  root: string;
  branches: MindMapBranch[];
}

interface Props {
  data: MindMapData;
}

const CX = 500;
const CY = 480;
const SECTION_RADIUS = 220;
const BULLET_RADIUS = 200;
const MAX_BULLETS = 2;

// Leaf box dimensions — must satisfy: 2 * BULLET_RADIUS * sin(spread/2) > LEAF_W + padding
const LEAF_W = 120;
const LEAF_H = 65;

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

export default function MindMap({ data }: Props) {
  if (!data || !data.branches || data.branches.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        No mind map data available.
      </div>
    );
  }

  const branches = data.branches;
  const branchCount = branches.length;

  // Precompute branch angles spread evenly around the circle
  const branchAngles = branches.map((_, i) => (2 * Math.PI * i) / branchCount - Math.PI / 2);

  const lines: React.ReactNode[] = [];
  const nodes: React.ReactNode[] = [];

  branches.forEach((branch, si) => {
    const angle = branchAngles[si];
    const [sx, sy] = polar(CX, CY, angle, SECTION_RADIUS);

    // Line: center → branch
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

    // Children (leaves) — max 2
    const children = (branch.children ?? []).slice(0, MAX_BULLETS);
    const childCount = children.length;

    // Spread must satisfy: 2 * BULLET_RADIUS * sin(spread/2) >= LEAF_W + 30px gap
    // Also must not exceed 65% of the inter-branch gap to avoid neighbour collision
    const interBranchGap = (2 * Math.PI) / branchCount;
    const minSpread = 2 * Math.asin((LEAF_W + 30) / (2 * BULLET_RADIUS)); // geometry-enforced minimum
    const maxSpread = Math.min(Math.PI * 60 / 180, interBranchGap * 0.65);
    const spread = childCount > 1 ? Math.max(minSpread, maxSpread) : 0;

    children.forEach((child, bi) => {
      const startAngle = angle - spread / 2;
      const leafAngle = childCount > 1
        ? startAngle + (spread / (childCount - 1)) * bi
        : angle;

      const [bx, by] = polar(sx, sy, leafAngle, BULLET_RADIUS);

      // Line: branch → leaf
      lines.push(
        <path
          key={`line-leaf-${si}-${bi}`}
          d={bezierPath(sx, sy, bx, by)}
          stroke="#6b7280"
          strokeWidth={1.5}
          fill="none"
          opacity={0.4}
          strokeDasharray="4 3"
        />
      );

      // Leaf node
      nodes.push(
        <NodeBox
          key={`leaf-${si}-${bi}`}
          x={bx}
          y={by}
          text={child.label}
          fill="#f3f4f6"
          textColor="#374151"
          width={LEAF_W}
          height={LEAF_H}
          rx={8}
          fontSize={10}
        />
      );
    });

    // Branch node (rendered after leaves so it sits on top)
    nodes.push(
      <NodeBox
        key={`branch-${si}`}
        x={sx}
        y={sy}
        text={branch.label}
        fill="#4f46e5"
        textColor="#ffffff"
        width={148}
        height={62}
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
      text={data.root}
      fill="#7c3aed"
      textColor="#ffffff"
      width={170}
      height={74}
      rx={14}
      fontSize={13}
      fontWeight="700"
    />
  );

  return (
    <svg
      viewBox="0 0 1000 960"
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
