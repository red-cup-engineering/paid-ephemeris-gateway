/**
 * Shared graph-to-SVG projection for organizing packages.
 */

export type DiagramNode = Readonly<{
  id: string;
  label: string;
  group?: string;
  focus?: boolean;
  href?: string;
  title?: string;
}>;

export type DiagramEdge = Readonly<{
  from: string;
  to: string;
  kind?: string;
  label?: string;
}>;

export type DiagramPaletteEntry = Readonly<{
  fill: string;
  stroke: string;
}>;

export type DiagramGraph = Readonly<{
  nodes: readonly DiagramNode[];
  edges: readonly DiagramEdge[];
}>;

export type DiagramRenderOptions = Readonly<{
  title?: string;
  palette?: Readonly<Record<string, DiagramPaletteEntry>>;
  defaultColor?: DiagramPaletteEntry;
  nodeWidth?: number;
  nodeHeight?: number;
  hGap?: number;
  vGap?: number;
  margin?: number;
  edgeStyles?: Readonly<Record<string, Readonly<{ stroke: string }>>>;
}>;

const DEFAULT_COLOR: DiagramPaletteEntry = Object.freeze({ fill: "#263241", stroke: "#86a6c7" });

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(label: string, max = 18): readonly string[] {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words.length === 0 ? [label] : words) {
    if (current.length === 0) current = word;
    else if ((current.length + 1 + word.length) <= max) current = `${current} ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  return Object.freeze(lines.slice(0, 3));
}

export function graphDiagramSvg(graph: DiagramGraph, options: DiagramRenderOptions = {}): string {
  const nodeWidth = options.nodeWidth ?? 160;
  const nodeHeight = options.nodeHeight ?? 64;
  const hGap = options.hGap ?? 48;
  const vGap = options.vGap ?? 92;
  const margin = options.margin ?? 24;
  const nodes = graph.nodes;
  const byId = new Map(nodes.map((node, index) => [node.id, { node, index }] as const));
  const indegree = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  const depth = new Map<string, number>();
  for (const node of nodes) depth.set(node.id, indegree.get(node.id) === 0 ? 0 : 1);
  for (let i = 0; i < nodes.length; i += 1) {
    for (const edge of graph.edges) depth.set(edge.to, Math.max(depth.get(edge.to) ?? 0, (depth.get(edge.from) ?? 0) + 1));
  }
  const layers = new Map<number, DiagramNode[]>();
  for (const node of nodes) {
    const layer = depth.get(node.id) ?? 0;
    const bucket = layers.get(layer) ?? [];
    bucket.push(node);
    layers.set(layer, bucket);
  }
  const positions = new Map<string, { x: number; y: number }>();
  const layerEntries = [...layers.entries()].sort((a, b) => a[0] - b[0]);
  let maxLayerWidth = 1;
  for (const [, layerNodes] of layerEntries) maxLayerWidth = Math.max(maxLayerWidth, layerNodes.length);
  for (const [layer, layerNodes] of layerEntries) {
    layerNodes.sort((a, b) => (byId.get(a.id)?.index ?? 0) - (byId.get(b.id)?.index ?? 0));
    for (let index = 0; index < layerNodes.length; index += 1) {
      const node = layerNodes[index]!;
      positions.set(node.id, {
        x: margin + index * (nodeWidth + hGap),
        y: margin + layer * (nodeHeight + vGap),
      });
    }
  }
  const width = margin * 2 + maxLayerWidth * nodeWidth + Math.max(0, maxLayerWidth - 1) * hGap;
  const height = margin * 2 + layerEntries.length * nodeHeight + Math.max(0, layerEntries.length - 1) * vGap;
  const edges = graph.edges.map((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (from === undefined || to === undefined) return "";
    const stroke = options.edgeStyles?.[edge.kind ?? ""]?.stroke ?? "#9aa7b2";
    const x1 = from.x + nodeWidth / 2;
    const y1 = from.y + nodeHeight;
    const x2 = to.x + nodeWidth / 2;
    const y2 = to.y;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${esc(stroke)}" stroke-width="1.5" marker-end="url(#arrow)" />`;
  }).join("\n");
  const renderedNodes = nodes.map((node) => {
    const position = positions.get(node.id);
    if (position === undefined) return "";
    const color = node.group === undefined ? DEFAULT_COLOR : (options.palette?.[node.group] ?? options.defaultColor ?? DEFAULT_COLOR);
    const title = esc(node.title ?? node.label);
    const lines = wrap(node.label);
    const text = lines.map((line, index) => `<text x="${position.x + nodeWidth / 2}" y="${position.y + 28 + index * 16}" text-anchor="middle" fill="#f5f7fb" font-size="13">${esc(line)}</text>`).join("\n");
    const rect = `<rect x="${position.x}" y="${position.y}" width="${nodeWidth}" height="${nodeHeight}" rx="6" fill="${esc(color.fill)}" stroke="${esc(node.focus === true ? "#f7d774" : color.stroke)}" stroke-width="${node.focus === true ? 3 : 1.5}" />`;
    const body = `<g><title>${title}</title>${rect}\n${text}</g>`;
    return node.href === undefined ? body : `<a href="${esc(node.href)}">${body}</a>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">
<title>${esc(options.title ?? "Graph diagram")}</title>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#9aa7b2" /></marker></defs>
<rect width="100%" height="100%" fill="#111820" />
${edges}
${renderedNodes}
</svg>`;
}
