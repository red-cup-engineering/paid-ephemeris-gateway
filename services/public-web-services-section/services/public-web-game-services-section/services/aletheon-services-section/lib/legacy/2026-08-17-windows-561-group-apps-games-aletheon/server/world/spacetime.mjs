// spacetime — Aletheon's 3+1 geometry, taken from voidmath's own structure.
//
// THE THESIS (see docs/dev/notes/voidmath-spacetime-3plus1.md). cosmogenerating.md classifies the
// kernel's four regimes by (κ, H¹): three — strict-finite, scott-continuous, transfinite — have
// H¹ = 0 (closure determined by countable INTERNAL resources; they only rearrange evidence already
// present), and exactly one — the APERIODIC corner (κ ≥ ω₁, H¹ ≠ 0) — "extends the base with
// genuinely new entities and facts… the only corner that needs the outside." That is a 3+1 split:
// the three H¹=0 regimes are SPACE (reversible — you may ◇/□ back and forth, nothing new is made);
// the one aperiodic regime is TIME (irreversible novelty — the EAVT trace, the tick).
//
//   x, y, z  — the three spatial axes (the three internal-closure regimes); y is terrain elevation.
//              Movement along them is the modal pair ◇ (possibilize, forward) / □ (necessitate,
//              back) — free both ways (see ticking.stepPlayer).
//   τ (tau)  — TIME: the world tick / an entity's trace length (store.append). Monotone. Aperiodic.
//
// The MAP — concentric grade-rings — and the terrain live in shared/worldgen.mjs (shared verbatim
// with the client so the simulated ground IS the drawn ground). This module adds the server's
// interest math on top.

export {
  ringRadius, gradeOf, gradeAtXZ, gradePosition, dangerAt, terrainHeight, isWater, clampToWorld,
} from "../../shared/worldgen.mjs";

// dist2 / within — squared planar distance and a radius test (server interest queries; small
// worlds, linear scan). On the xz-plane: the two free spatial axes you actually navigate.
export const dist2 = (a, b) => { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; };
export const within = (a, b, r) => dist2(a, b) <= r * r;
