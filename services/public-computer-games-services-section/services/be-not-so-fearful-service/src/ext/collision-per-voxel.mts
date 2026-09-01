// EXT-3 — per-voxel contested-pass override, as a BNSF-owned ADAPTER (never an abrash edit).
//
// THE GAP: abrash's real `collision.mjs` exposes `passContested` as ONE global boolean per
// `move`/`occupied` call (see `blocks(charge, opts)`: `opts.passContested ? false : true` for a ⊤
// voxel) — a scene cannot have SOME ⊤ walls block (an ambient, pre-seeded contested hazard from
// level-gen.mts) while OTHER ⊤ walls in the same level pass (a deliberate anomaly-authored phase-gate)
// at the same time, because one `move()` call can only carry one `passContested` value for the whole
// grid.
//
// THE ADAPTER: this file re-derives only the small SHAPE abrash's own `move`/`occupied` already have
// (the per-axis slide loop, the bounding-cell scan) but calls abrash's REAL, UNMODIFIED `blocks(charge,
// opts)` once per cell, with a `passContested` value computed FRESH for that specific cell via a
// caller-supplied `passContestedWhere(subjectKey) => boolean` predicate. The actual blocking semantic
// (t/⊤ block, f/⊥ pass, ⊤ pass only when opted in) is still abrash's own `blocks()` — never
// reimplemented, only invoked per-voxel instead of once-per-call.
//
// PROPOSED UPSTREAM (see the service README's "extensions proposed" list, for the abrash owner lane):
// `blocks(charge, opts, subjectKey?)` consulting an optional `opts.passContestedWhere(subjectKey)`,
// defaulting to today's global `opts.passContested` when absent — fully backward-compatible, and would
// let this whole adapter file be deleted in favor of calling abrash's own `move`/`occupied` directly
// with the new option. Until then, this adapter is BNSF's own, lives in BNSF's own tree, and touches
// nothing in abrash's package.

import { blocks } from "@red-cup-engineering/abrash/collision";
import { cellKey } from "@red-cup-engineering/abrash/world";

export interface PerVoxelGrid {
  at(x: number, z: number): { charge: string };
}

export interface PerVoxelOpts {
  /** Called once per candidate cell with that cell's abrash subject key (`voxel:x,z`); return true to
   *  let a ⊤ (contested) voxel there pass, matching abrash's own `passContested` semantics but decided
   *  per cell instead of once for the whole call. Cells for which this returns false (or is absent)
   *  fall back to abrash's own default ⊤-blocks behavior. */
  passContestedWhere?: (subjectKey: string) => boolean;
}

/** occupiedPerVoxel — the same bounding-cell scan abrash's own `collision.occupied` performs, but
 *  calling abrash's real `blocks()` with a per-cell `passContested` decision. */
export function occupiedPerVoxel(g: PerVoxelGrid, x: number, z: number, radius: number, opts: PerVoxelOpts = {}): boolean {
  const minX = Math.floor(x - radius);
  const maxX = Math.floor(x + radius);
  const minZ = Math.floor(z - radius);
  const maxZ = Math.floor(z + radius);
  for (let cz = minZ; cz <= maxZ; cz++) {
    for (let cx = minX; cx <= maxX; cx++) {
      const charge = g.at(cx, cz).charge;
      const passContested = opts.passContestedWhere?.(cellKey(cx, cz)) ?? false;
      if (blocks(charge, { passContested })) return true;
    }
  }
  return false;
}

export interface Body {
  x: number;
  z: number;
  radius?: number;
}

/** movePerVoxel — abrash's real per-axis slide shape (try x, then z against the possibly-updated x),
 *  built over `occupiedPerVoxel` instead of abrash's own `occupied`. Same return shape as abrash's
 *  `collision.move`: `{ body, hit }`. */
export function movePerVoxel(g: PerVoxelGrid, body: Body, dx: number, dz: number, opts: PerVoxelOpts = {}): { body: Body; hit: { x: boolean; z: boolean } } {
  const radius = body.radius ?? 0.2;
  let x = body.x;
  let z = body.z;
  const hit = { x: false, z: false };

  const nx = x + dx;
  if (!occupiedPerVoxel(g, nx, z, radius, opts)) x = nx;
  else hit.x = true;

  const nz = z + dz;
  if (!occupiedPerVoxel(g, x, nz, radius, opts)) z = nz;
  else hit.z = true;

  return { body: { ...body, x, z, radius }, hit };
}
