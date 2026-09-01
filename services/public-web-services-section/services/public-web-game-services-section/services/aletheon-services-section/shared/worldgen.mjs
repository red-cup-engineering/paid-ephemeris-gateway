// worldgen — the pure geometry of Aletheon, shared verbatim by server and client so the ground
// the server simulates on is the exact ground the browser draws. Two things live here:
//   1. the TERRAIN heightfield (deterministic value-noise — zero-dep, no assets);
//   2. the VOID-MANIFOLD map (ported from lab/archive/.../void-monoid/manifold_dpm.py): the world
//      is concentric grade-rings — grade 0 is the Settled Reach at the origin, and strangeness
//      (danger, corruption) grows with grade/radius, the rings widening as `ring_r` does.
// Browser-safe: imports nothing but constants.

import { WORLD } from "./constants.mjs";

// ---- the void-manifold ring embedding (manifold_dpm.py: ring_r, grade_positions) -------------
const R_BASE = 14; // radius of the grade-0 ring (world units) — the Settled Reach
const R_GROW = 26; // extra radius per grade, so rings widen outward as in the toy

export const ringRadius = (grade) => R_BASE + grade * R_GROW;
export const gradeOf = (radius) => (radius <= R_BASE ? 0 : Math.floor((radius - R_BASE) / R_GROW) + 1);
export const gradeAtXZ = (x, z) => gradeOf(Math.hypot(x, z));
export const dangerAt = (x, z) => gradeAtXZ(x, z);

// gradePosition — a point on the grade-n ring at angular rank k of `total` (manifold_dpm's
// theta = 2π·rank/total). Used to place landmarks / spawn anchors evenly around each ring.
export function gradePosition(grade, rank, total) {
  const r = ringRadius(grade);
  const theta = total <= 1 ? 0 : (2 * Math.PI * rank) / total;
  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  return { x, y: terrainHeight(x, z), z };
}

// ---- terrain: a cheap deterministic value-noise heightfield ----------------------------------
function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295; // [0,1)
}
const smooth = (t) => t * t * (3 - 2 * t);
function valueNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const a = hash2(ix, iz), b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  const u = smooth(fx), v = smooth(fz);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

// terrainHeight — fractal sum flattened toward the centre, so the Settled Reach is gentle and the
// high grades rise into broken, anomaly-haunted hills.
export function terrainHeight(x, z) {
  const s = 0.02;
  let h = 0, amp = 1, freq = 1, norm = 0;
  for (let o = 0; o < 4; o++) {
    h += valueNoise(x * s * freq + 100, z * s * freq + 100) * amp;
    norm += amp; amp *= 0.5; freq *= 2.1;
  }
  h /= norm; // [0,1]
  const radius = Math.hypot(x, z);
  const rise = Math.min(1, radius / (WORLD.size * 0.5)); // 0 at centre → 1 at the rim
  return h * WORLD.maxHeight * (0.25 + 0.75 * rise);
}

export const isWater = (x, z) => terrainHeight(x, z) < WORLD.seaLevel;

// clampToWorld — keep a position inside the square patch (shared so prediction agrees with server).
export function clampToWorld(p) {
  const h = WORLD.size / 2;
  p.x = Math.max(-h, Math.min(h, p.x));
  p.z = Math.max(-h, Math.min(h, p.z));
  return p;
}
