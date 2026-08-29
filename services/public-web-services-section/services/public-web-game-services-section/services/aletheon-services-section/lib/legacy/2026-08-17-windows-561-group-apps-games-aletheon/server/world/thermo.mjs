// thermo — [tide] THE SETTLING TIDE: the repo's thermodynamic + number-theoretic physics made into
// living world behavior. Three movements, all grounded in the constants (shared/constants.mjs TIDE):
//
//   1. SETTLEDNESS — the arrow of time as the world's calm. The Laplacian void-tension field
//      (field.mjs) is the world's "energy"; its complement is entropy/equilibrium. settledness =
//      1 − totalTension, in [0,1]: it RISES monotonically toward calm as Anomalies are cleared and
//      the field relaxes (DECAY pulls every cell toward 0). The settled heart is the ground state.
//
//   2. φ-PACED ECOLOGY — the classical regime's growth is the GOLDEN RATIO Pisot factor φ (the
//      Fibonacci substitution a→ab,b→a has Perron eigenvalue φ ≈ 1.618). Critters never respawned;
//      repopulate() regrows the wildlife toward a cap, each step adding ~⌈current·(φ−1)⌉ newcomers
//      (so the population follows a φ-multiplicative law: nₖ₊₁ ≈ φ·nₖ until the cap), placed at
//      GOLDEN-ANGLE ranks (2π(1−1/φ)) around a grade ring — the sunflower packing of quasicrystals.
//
//   3. BRAGG RESONANCE — an aperiodic / quasicrystal point set has pure-point diffraction whose
//      BRAGG PEAKS sit at lattice positions a+bφ (the rare "prime" resonances). maybeResonance()
//      rarely (when the tick index is a FIBONACCI number — a pure-point criterion) spawns a
//      transient peaceful "resonance" node at a golden-ratio a+bφ position. A player who steps
//      within resonanceRadius BLOOMS it: a Fibonacci burst of marks settles into them, the node
//      dissolves, and a chat line announces it. Bloom-checking is bloomResonances() (called by tick).

import { KIND, TIDE } from "../../shared/constants.mjs";
import { gradePosition, ringRadius } from "../../shared/worldgen.mjs";
import { totalTension } from "./field.mjs";
import { spawn, players, remove, all } from "./store.mjs";
import { within } from "./spacetime.mjs";

// settledness — the world's calm, in [0,1]: 1 − the field's total tension (the H¹-like mass). Rises
// as the world settles toward equilibrium (Anomalies cleared, tension decayed). The arrow of time.
export function settledness(world) {
  const s = 1 - totalTension(world.field);
  return s < 0 ? 0 : s > 1 ? 1 : s;
}

// --- 2. φ-paced ecology -----------------------------------------------------------------------
// countCritters — the living (non-corpse) wildlife population right now.
function countCritters(world) {
  let n = 0;
  for (const e of world.entities.values()) {
    if (e.kind === KIND.critter && e.state !== "dead") n++;
  }
  return n;
}

// repopulate — one φ-paced regrowth step. Adds ~⌈current·(φ−1)⌉ critters (with a seed floor when the
// population has collapsed), up to the cap, at GOLDEN-ANGLE ranks around the ecology grade ring.
// Deterministic given the world (no RNG): the placement angle is the running golden-angle spiral, so
// tests can predict the count exactly. Returns the number of critters actually born this step.
export function repopulate(world) {
  const cur = countCritters(world);
  if (cur >= TIDE.critterCap) return 0; // the ecology has filled its niche — grow no further
  // the φ law: each step multiplies toward φ·cur (add ⌈cur·(φ−1)⌉), with a seed floor for collapse.
  const wanted = Math.max(TIDE.critterSeed, Math.ceil(cur * (TIDE.PHI - 1)));
  const born = Math.min(wanted, TIDE.critterCap - cur); // never overshoot the cap
  for (let k = 0; k < born; k++) {
    // golden-angle placement: the rank advances by the golden angle, the radius rides the grade ring.
    const rank = (world._ecoRank = (world._ecoRank ?? 0) + 1);
    const theta = rank * TIDE.GOLDEN_ANGLE;
    const r = ringRadius(TIDE.ecologyGrade);
    const x = r * Math.cos(theta), z = r * Math.sin(theta);
    spawn(world, { kind: KIND.critter, name: pick(CRITTERS, rank), x, z, yaw: theta, maxHp: TIDE.critterMaxHp });
  }
  return born;
}

// --- 3. Bragg resonance blooms ----------------------------------------------------------------
// isFibonacci — is n a Fibonacci number? (a perfect-square test: n is Fibonacci iff one of
// 5n²±4 is a perfect square). The pure-point criterion that gates when a resonance may appear.
export function isFibonacci(n) {
  if (n < 0) return false;
  const a = 5 * n * n + 4, b = 5 * n * n - 4;
  return isSquare(a) || isSquare(b);
}
function isSquare(x) {
  if (x < 0) return false;
  const r = Math.round(Math.sqrt(x));
  return r * r === x;
}

// countResonance — how many resonance nodes currently stand.
function countResonance(world) {
  let n = 0;
  for (const e of world.entities.values()) if (e.kind === KIND.resonance) n++;
  return n;
}

// maybeResonance — rarely spawn a transient Bragg-resonance node. Fires only when the tick index is
// a FIBONACCI number (the pure-point criterion) and the world isn't already saturated with nodes.
// Placement is a golden-ratio a+bφ lattice point mapped onto the resonance grade ring. Returns the
// spawned node, or null. Peaceful + immobile: ticking never hunts/wanders it; never an attack target.
export function maybeResonance(world) {
  if (countResonance(world) >= TIDE.resonanceMax) return null;
  if (!isFibonacci(world.tick)) return null; // a resonance only blooms on a Fibonacci-aligned tick
  // a Bragg peak at a+bφ: derive (a,b) from the tick so successive blooms land at distinct lattice
  // points, then read the fractional part as the angular rank on the ring (golden-angle spiral too).
  const a = (world.tick % 7) + 1, b = (Math.floor(world.tick / 7) % 5) + 1;
  const bragg = a + b * TIDE.PHI; // the a+bφ position scalar (the prime resonance)
  const rank = world.tick; // a unique rank per Fibonacci tick → golden-angle spread
  const theta = rank * TIDE.GOLDEN_ANGLE + bragg; // golden-angle spiral, phased by the Bragg scalar
  const r = ringRadius(TIDE.resonanceGrade);
  const x = r * Math.cos(theta), z = r * Math.sin(theta);
  const node = spawn(world, { kind: KIND.resonance, name: "Bragg Resonance", x, z, yaw: theta, maxHp: 1 });
  node.hostile = false;
  node.bragg = bragg; // remember the lattice point (for legibility / debugging)
  return node;
}

// bloomResonances — any resonance node a living player has stepped within resonanceRadius of BLOOMS:
// a Fibonacci burst of marks settles into the player, the node dissolves, and a chat line announces
// it. Returns an array of { player, node, reward } for each bloom (so the caller can broadcast). The
// reward is queued as a "resonance" world event so the net layer can voice it like a combat event.
export function bloomResonances(world) {
  const blooms = [];
  const ps = players(world);
  if (ps.length === 0) return blooms;
  for (const node of all(world)) {
    if (node.kind !== KIND.resonance) continue;
    for (const p of ps) {
      if (p.state === "dead") continue;
      if (!within(p, node, TIDE.resonanceRadius)) continue;
      const reward = TIDE.resonanceReward;
      p.marks = (p.marks || 0) + reward; // marks settle into the player (ties to the marks feature)
      p.dirty = true;
      remove(world, node.id); // the transient node dissolves once bloomed
      world.events.push({ kind: "resonance", player: p.id, name: p.name, reward });
      blooms.push({ player: p, node, reward });
      break; // one node, one bloom
    }
  }
  return blooms;
}

const CRITTERS = ["Fenwood Hare", "Moss Boar", "Dappled Stag", "Reed Heron", "Bramble Fox"];
const pick = (a, k) => a[((k % a.length) + a.length) % a.length]; // deterministic by rank (no RNG)
