/**
 * `layout` — pure geometry for the graph canvas: where to draw each node. No DOM, no SVG, no
 * randomness — a deterministic function of `nodeIds` alone, so the same graph always lays out
 * identically (a player's mental map of their own production graph shouldn't shuffle every
 * render) and so this file is trivially unit-testable under plain `node --test`.
 */

/**
 * Place `nodeIds` evenly around a circle of `radius` centered at `(cx, cy)`, in the order given
 * — callers that want a stable layout across renders should pass a stably-sorted id list (e.g.
 * `nodeOrder(graph)` from `graph.mts`, already alphabetical). The first id is placed at the top
 * (12 o'clock) and the rest proceed clockwise, purely so a single-node graph draws at a
 * recognizable, consistent spot rather than an arbitrary trig-determined angle.
 */
export function circleLayout(nodeIds, { radius = 150, cx = 200, cy = 200 } = {}) {
  const n = nodeIds.length;
  const positions = new Map();
  if (n === 0) return positions;
  if (n === 1) {
    positions.set(nodeIds[0], { x: cx, y: cy });
    return positions;
  }
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    positions.set(nodeIds[i], { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  }
  return positions;
}

/** A point `t` (0..1) along the line from `a` to `b`, shortened by `shorten` px from the `b` end
 *  — used to stop an edge's arrowhead just short of the target node's circle rather than drawing
 *  into/through it. */
export function pointToward(a, b, shorten) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { x: b.x, y: b.y };
  const t = Math.max(0, (dist - shorten) / dist);
  return { x: a.x + dx * t, y: a.y + dy * t };
}
