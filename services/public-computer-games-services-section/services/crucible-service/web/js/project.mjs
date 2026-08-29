/**
 * `project` — pure, DOM-free state -> render-model projection (solitaire's `project.mjs` /
 * onestone's `projectFrame` pattern — the ANATOMY digest's convention for "the only
 * client-owned logic besides SVG string-building and input wiring": never domain rules, only
 * layout/geometry math derived from state the kernel already computed).
 *
 * Nothing here imports the kernel or computes a cost, a legality decision, or a settlement
 * reading — it only turns a `Tangle` (already-computed engine state) into screen-space
 * positions and simple per-element view flags a renderer can draw without re-deriving anything.
 */

/** Deterministic layout: claims placed on a circle, ordered by id, so the SAME tangle always
 * projects to the SAME positions (no `Math.random()` — a `spawnTangle` id ordering is itself
 * fully deterministic, so this is too). Radius/center are caller-supplied viewport parameters,
 * not game state. */
export function layoutClaims(claims, { cx, cy, radius }) {
  const n = claims.length;
  const positions = new Map();
  claims.forEach((claim, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, n) - Math.PI / 2;
    positions.set(claim.id, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  });
  return positions;
}

/** Project a tangle + selection state into the plain view-model `render-svg.mjs` draws from. */
export function projectTangle(tangle, positions, { selectedBondId = null, selectedClaimId = null, hoverId = null } = {}) {
  const claimViews = tangle.claims.map((c) => {
    const p = positions.get(c.id) ?? { x: 0, y: 0 };
    return {
      id: c.id,
      x: p.x,
      y: p.y,
      phi: c.phi,
      selected: c.id === selectedClaimId,
      hovered: c.id === hoverId,
    };
  });

  const byId = new Map(claimViews.map((c) => [c.id, c]));
  const bondViews = tangle.bonds.map((b) => {
    const a = byId.get(b.a);
    const bb = byId.get(b.b);
    return {
      id: b.id,
      x1: a?.x ?? 0,
      y1: a?.y ?? 0,
      x2: bb?.x ?? 0,
      y2: bb?.y ?? 0,
      geometry: b.geometry,
      state: b.state,
      selected: b.id === selectedBondId,
      hovered: b.id === hoverId,
    };
  });

  return { claims: claimViews, bonds: bondViews, freeReserve: tangle.freeReserve };
}

/** Nearest claim to `fromId` in the given cardinal direction — the keyboard-nav primitive
 * (lantern/solitaire's "nearestInDirection" pattern), operating purely on already-projected
 * screen positions. */
export function nearestInDirection(claimViews, fromId, dx, dy) {
  const from = claimViews.find((c) => c.id === fromId);
  if (!from) return claimViews[0]?.id ?? null;
  let best = null;
  let bestScore = Infinity;
  for (const c of claimViews) {
    if (c.id === fromId) continue;
    const vx = c.x - from.x;
    const vy = c.y - from.y;
    const dot = vx * dx + vy * dy;
    if (dot <= 0) continue; // behind the requested direction
    const dist = Math.hypot(vx, vy);
    const angleScore = 1 - dot / (dist || 1);
    const score = dist * (1 + 4 * angleScore);
    if (score < bestScore) {
      bestScore = score;
      best = c.id;
    }
  }
  return best;
}
