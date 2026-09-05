// value — Aletheon's world-truth, computed by the REAL kernel charge operations.
//
// Every creature carries one load-bearing predication: `(self, alive, self)`. Its bilattice
// charge is what actually decides life, death, and corruption — not an HP integer. We build
// kernel-shaped charges and fold them with the kernel's own `joinKnowledge` (the knowledge-order
// lub: accumulate evidence, OR the value bits), then read the four-value face with `present` /
// `isTop`. The thresholds below only decide whether a face is ASSERTED; the kernel does the logic.
//
//   ⊥  no evidence            — an unspawned / unknown cell
//   t  positive only          — alive and standing
//   f  negative only          — slain; loot drops, corpse lingers
//   ⊤  BOTH asserted          — a contradiction the world HOLDS as a situation: positive life
//                               evidence re-asserted onto an already-slain cell. The creature
//                               does not die quietly — it rises as a Corrupted Anomaly.
//
// The ⊤ gate is the whole point of using a bilattice instead of a boolean: "is and is not alive"
// is a first-class state the renderer can show, not a crash or a coin-flip. (Modeled on tab's
// thin bilattice — being/library/value — but fused with the actual kernel charge ops.)

import { joinKnowledge, present, isTop } from "./kernel.mjs";

// a witness is any small datum; the kernel unions them losslessly. We tag with the source.
const witness = (src, t) => ({ src, t });

// kernel-shaped charges. value bits are booleans; evidence are witness lists.
const BOTTOM = { value: [false, false], evidence: [[], []] };
const alive = (w) => ({ value: [true, false], evidence: [[w], []] }); // asserts the positive face
const slain = (w) => ({ value: [false, true], evidence: [[], [w]] }); // asserts the negative face

// vital — fold a creature's life-evidence into its settled `alive` charge, via the kernel.
//
// Inputs are the graded tallies the combat loop maintains:
//   hp        : current vitality (maxHp - damage + heals); > 0 means the positive face is live.
//   killed    : has this cell ever been driven to hp <= 0? (the negative face, once asserted,
//               is never retracted — death is a converse predication, not a deletion).
//   raised    : has a corruption/raise source re-asserted life AFTER death? (re-lights positive).
//
// The verdict comes straight out of joinKnowledge: positive (alive) ⊔ negative (slain) bits OR.
export function vital({ hp, killed, raised }, tick = 0) {
  let charge = BOTTOM;
  if (hp > 0) charge = joinKnowledge({ left: charge, right: alive(witness("vitality", tick)) });
  if (killed) charge = joinKnowledge({ left: charge, right: slain(witness("mortal-blow", tick)) });
  if (raised) charge = joinKnowledge({ left: charge, right: alive(witness("corruption", tick)) });
  return charge;
}

// reading — name the settled face. Drives both the fantasy surface and the renderer's tint.
export function reading(charge) {
  const [pos, neg] = present(charge);
  if (isTop(charge)) return { face: "top", glyph: "⊤", state: "anomaly" }; // is AND is-not
  if (pos && !neg) return { face: "true", glyph: "t", state: "alive" };
  if (neg && !pos) return { face: "false", glyph: "f", state: "dead" };
  return { face: "bottom", glyph: "⊥", state: "unknown" };
}

// glyph — the bare four-value mark, for the wire (protocol view.charge) and the HUD.
export const glyph = (charge) => reading(charge).glyph;

// stateGlyph — the mark for a settled STATE name (the projection the wire and snapshots carry,
// where the charge object has already been read down to alive/dead/anomaly/unknown).
export const stateGlyph = (state) =>
  state === "alive" ? "t" : state === "dead" ? "f" : state === "anomaly" ? "⊤" : "⊥";

// helpers the combat/ticking loops read off the verdict
export const isAnomaly = (charge) => isTop(charge);
export const isDead = (charge) => { const [p, n] = present(charge); return n && !p; };
export const isAlive = (charge) => { const [p, n] = present(charge); return p && !n; };

export { BOTTOM };
