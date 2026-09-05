/**
 * `render-graph` — the widget production-graph figure: nodes as circles, edges as arrows labeled
 * with their rate, drawn as inline SVG. Ported from stoke-service's `web/js/render-graph.mjs`
 * (this game's widget graph is Stoke's own, unmodified). Purely decorative/informational: every
 * action a player can take on the graph (build/connect/upgrade) is a real form control elsewhere
 * in `index.html`; the accessible list of the same facts sits beside this figure, per DESIGN.md
 * §5's own instruction that the graph canvas stays "decorative, aria-hidden, with the same facts
 * always also present as an accessible list."
 */
import { circleLayout, pointToward } from "./layout.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const NODE_RADIUS = 26;

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function text(content, attrs = {}) {
  const node = el("text", attrs);
  node.textContent = content;
  return node;
}

export function renderGraph(svgRoot, graph, stocks, { onNodeClick, width = 360, height = 360 } = {}) {
  while (svgRoot.firstChild) svgRoot.removeChild(svgRoot.firstChild);
  svgRoot.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svgRoot.setAttribute("role", "img");
  svgRoot.setAttribute("aria-hidden", "true");

  const ids = graph.nodes.map((n) => n.id).slice().sort();
  const positions = circleLayout(ids, { radius: Math.min(width, height) / 2 - 55, cx: width / 2, cy: height / 2 });
  const maxStock = Math.max(1, ...ids.map((id) => stocks[id] ?? 0));

  const defs = el("defs");
  const marker = el("marker", { id: "arrowhead", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
  marker.appendChild(el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "currentColor" }));
  defs.appendChild(marker);
  svgRoot.appendChild(defs);

  const edgeLayer = el("g", { class: "edge-layer" });
  const nodeLayer = el("g", { class: "node-layer" });

  for (const edge of graph.edges) {
    const a = positions.get(edge.from);
    const b = positions.get(edge.to);
    if (!a || !b) continue;
    if (edge.from === edge.to) {
      const loop = el("circle", {
        cx: a.x, cy: a.y - NODE_RADIUS - 14, r: 10, fill: "none", stroke: "currentColor",
        "stroke-width": 1.5, class: "edge-line", "marker-end": "url(#arrowhead)",
      });
      edgeLayer.appendChild(loop);
      edgeLayer.appendChild(text(edge.rate.toFixed(3), { x: a.x, y: a.y - NODE_RADIUS - 28, class: "edge-label", "text-anchor": "middle" }));
      continue;
    }
    const start = pointToward(b, a, NODE_RADIUS + 2);
    const end = pointToward(a, b, NODE_RADIUS + 10);
    edgeLayer.appendChild(el("line", {
      x1: start.x, y1: start.y, x2: end.x, y2: end.y,
      stroke: "currentColor", "stroke-width": 1.5, class: "edge-line", "marker-end": "url(#arrowhead)",
    }));
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    edgeLayer.appendChild(text(edge.rate.toFixed(3), { x: midX, y: midY - 4, class: "edge-label", "text-anchor": "middle" }));
  }

  for (const node of graph.nodes) {
    const p = positions.get(node.id);
    if (!p) continue;
    const stock = stocks[node.id] ?? 0;
    const fillT = Math.min(1, stock / maxStock);
    const g = el("g", { class: "graph-node", "data-node-id": node.id });
    const circle = el("circle", {
      cx: p.x, cy: p.y, r: NODE_RADIUS, class: "node-circle",
      style: `--fill-t: ${fillT.toFixed(3)}`,
    });
    g.appendChild(circle);
    g.appendChild(text(node.label, { x: p.x, y: p.y - NODE_RADIUS - 8, class: "node-label", "text-anchor": "middle" }));
    g.appendChild(text(stock.toFixed(1), { x: p.x, y: p.y + 4, class: "node-stock", "text-anchor": "middle" }));
    if (onNodeClick) {
      g.classList.add("graph-node--clickable");
      g.addEventListener("click", () => onNodeClick(node.id));
    }
    nodeLayer.appendChild(g);
  }

  svgRoot.appendChild(edgeLayer);
  svgRoot.appendChild(nodeLayer);

  const title = el("title", {});
  title.textContent = `Your widget production graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges.`;
  svgRoot.appendChild(title);
}
