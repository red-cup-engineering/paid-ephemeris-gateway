// field — a scalar "void-tension" field over the world, evolved by the discrete graph LAPLACIAN.
// This is the repo's sheaf-Laplacian / H¹ idea made into live physics (the full Hodge Laplacian is
// deferred in-repo — see voidmath-cohomology — so we realize the part that runs on the bilattice
// algebra: knowledge-join-style diffusion + a tension scalar). Tension DIFFUSES across the grid,
// Anomalies RADIATE it (sources), the Settled Reach and the Keepers DRAIN it (sinks), and where it
// pools high the world breeds more corruption. Cheap: a 48×48 grid stepped each tick.

import { WORLD, KIND } from "../../shared/constants.mjs";
import { ringRadius } from "../../shared/worldgen.mjs";

const DIM = 48; // field resolution
const D = 0.20; // diffusion coefficient (graph-Laplacian step; keep < 0.25 for stability)
const DECAY = 0.99; // tension fades slowly everywhere (relaxation toward calm)

const idx = (i, j) => j * DIM + i;

export function createField() {
  const drain = new Float32Array(DIM * DIM); // static sink: the Settled Reach (grade 0) stays calm
  const r0 = ringRadius(0); // radius of the safe heart
  for (let j = 0; j < DIM; j++) {
    for (let i = 0; i < DIM; i++) {
      const { x, z } = cellWorld(i, j);
      const d = Math.hypot(x, z);
      drain[idx(i, j)] = d < r0 ? 0.06 * (1 - d / r0) : 0; // strongest at the origin
    }
  }
  return { dim: DIM, cells: new Float32Array(DIM * DIM), _next: new Float32Array(DIM * DIM), drain };
}

// world coords (centered, [-size/2, size/2]) ⇄ grid cell
function cellOf(x, z) {
  const h = WORLD.size / 2;
  const i = clampi(Math.floor(((x + h) / WORLD.size) * DIM));
  const j = clampi(Math.floor(((z + h) / WORLD.size) * DIM));
  return [i, j];
}
function cellWorld(i, j) {
  const h = WORLD.size / 2;
  return { x: ((i + 0.5) / DIM) * WORLD.size - h, z: ((j + 0.5) / DIM) * WORLD.size - h };
}
const clampi = (n) => Math.max(0, Math.min(DIM - 1, n));

// sampleField — the tension at a world point (nearest cell), in [0,1].
export function sampleField(field, x, z) {
  const [i, j] = cellOf(x, z);
  return field.cells[idx(i, j)];
}

// stepField — one tick: diffuse (discrete Laplacian) + decay − static drain, then apply the
// entity sources/sinks (Anomalies radiate, fresh corpses smoulder, Keepers soothe). Double-buffered.
export function stepField(field, world) {
  const cur = field.cells, next = field._next, drain = field.drain;
  for (let j = 0; j < DIM; j++) {
    for (let i = 0; i < DIM; i++) {
      const k = idx(i, j);
      const c = cur[k];
      let sum = 0, n = 0;
      if (i > 0) { sum += cur[k - 1]; n++; }
      if (i < DIM - 1) { sum += cur[k + 1]; n++; }
      if (j > 0) { sum += cur[k - DIM]; n++; }
      if (j < DIM - 1) { sum += cur[k + DIM]; n++; }
      const lap = (n ? sum / n : c) - c; // graph Laplacian: pull toward the neighbour mean
      next[k] = clamp01((c + D * lap) * DECAY - drain[k]);
    }
  }
  // entity sources & sinks
  for (const e of world.entities.values()) {
    const [i, j] = cellOf(e.x, e.z), k = idx(i, j);
    if (e.kind === KIND.anomaly && e.state === "anomaly") next[k] = clamp01(next[k] + 0.30); // ⊤ radiates
    else if (e.state === "dead") next[k] = clamp01(next[k] + 0.05); // a fresh corpse smoulders
    else if (e.kind === KIND.keeper) next[k] = clamp01(next[k] - 0.20); // a Keeper soothes the ground
    else if (e.kind === KIND.cairn) next[k] = clamp01(next[k] - 0.30); // [marks] a Cairn CALMS the void (a strong sink)
    else if (e.kind === KIND.altar && e.claim) { // [claims] a CLAIM ALTAR's settled truth shapes the field
      if (e.claim.state === "sanctuary") next[k] = clamp01(next[k] - 0.35); // t — drains tension strongly, like a big Cairn
      else if (e.claim.state === "erupt") next[k] = clamp01(next[k] + 0.30); // ⊤ — radiates tension (a contested-value source)
    }
  }
  field.cells = next;
  field._next = cur;
}

// [powers] dampenField — knock the void-tension DOWN in a disc of world-radius `r` around a point,
// scaling each cell toward calm by `factor` (0 = fully cleared, 1 = untouched). Banishing a ⊤
// Anomaly conflates its contradiction to ⊥; the pooled tension it radiated subsides with it.
export function dampenField(field, x, z, r, factor = 0.4) {
  const [ci, cj] = cellOf(x, z);
  const cr = Math.max(1, Math.round((r / WORLD.size) * field.dim));
  for (let dj = -cr; dj <= cr; dj++) {
    for (let di = -cr; di <= cr; di++) {
      if (di * di + dj * dj > cr * cr) continue;
      const i = ci + di, j = cj + dj;
      if (i < 0 || j < 0 || i >= field.dim || j >= field.dim) continue;
      field.cells[idx(i, j)] *= factor;
    }
  }
}

// totalTension — a single scalar (the field's mass): a cheap read of how unsettled the whole
// world is right now (rises as Anomalies spread, falls as players settle them). H¹-like.
export function totalTension(field) {
  let s = 0;
  for (let k = 0; k < field.cells.length; k++) s += field.cells[k];
  return s / field.cells.length;
}

// packField — downsample + quantize to a compact digit string for the wire (WIRE_DIM², 0..9 each).
const WIRE_DIM = 24;
export function packField(field) {
  let s = "";
  for (let j = 0; j < WIRE_DIM; j++) {
    for (let i = 0; i < WIRE_DIM; i++) {
      const fi = Math.floor((i / WIRE_DIM) * DIM), fj = Math.floor((j / WIRE_DIM) * DIM);
      s += Math.round(field.cells[idx(fi, fj)] * 9);
    }
  }
  return { dim: WIRE_DIM, q: s };
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
