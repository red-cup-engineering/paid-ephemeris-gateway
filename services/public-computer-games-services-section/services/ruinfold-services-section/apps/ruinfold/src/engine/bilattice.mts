// bilattice — the four-valued paraconsistent cell ruinfold's death model is built on, ported
// from the shape of legacy's tab-substrate `alive`/`human` cells (declareConverse + doing/retract
// folding to a glyph) without the general EAVT trace machinery underneath it, which lived in the
// external `@561-group/tab` package this app does not depend on (zero external deps, per the
// task). What survives is the exact semantics legacy's death.mjs/ai.mjs read:
//
//   a cell carries a POSITIVE face (asserted true) and a NEGATIVE face (asserted false),
//   independently, and its glyph is the bilattice join of the two:
//
//     pos=false neg=false -> "⊥"  (unknown / un-made / never touched)
//     pos=true  neg=false -> "t"  (simply true — alive, human)
//     pos=false neg=true  -> "f"  (simply false — truly dead, settled)
//     pos=true  neg=true  -> "⊤"  (BOTH — a held contradiction: undead, or the cursed dual form)
//
// death.mts drives every cell transition through `deathFace(rule)` below, which is exactly
// legacy's death.mjs table collapsed to the two booleans that produce the same four glyphs:
//   undead    -> keep the positive face, ADD the negative -> ⊤ (rise, forever)
//   construct -> retract BOTH faces                        -> ⊥ (vanish, un-made)
//   mortal / named / cursed -> retract positive, hold negative -> f (true, settled death)

export interface BilatticeCell {
  pos: boolean;
  neg: boolean;
}

export type Glyph = "⊥" | "t" | "f" | "⊤";

export type DeathRule = "mortal" | "undead" | "construct" | "named" | "cursed";

// asserted — a freshly-declared cell: the positive face alone, held. (`doing(alive)` at seed.)
export function asserted(): BilatticeCell {
  return { pos: true, neg: false };
}

// unknown — an untouched cell: neither face asserted.
export function unknown(): BilatticeCell {
  return { pos: false, neg: false };
}

export function glyphOf(cell: BilatticeCell | undefined): Glyph {
  if (!cell) return "⊥";
  if (cell.pos && cell.neg) return "⊤";
  if (cell.pos) return "t";
  if (cell.neg) return "f";
  return "⊥";
}

// deathFace — the cell a `death-rule` routes an entity's positive/negative-carrying cell to,
// once the killing blow lands (the "slain" evidence has arrived). This single function IS the
// five-way bilattice router in its most reduced form: every one of death.mts's five branches
// calls this to get the next cell, and only then layers on the branch-specific bookkeeping
// (heal-and-rise, vanish-and-respawn, ghost-run, curse-the-killer) described in death.mts.
export function deathFace(rule: DeathRule): BilatticeCell {
  if (rule === "undead") return { pos: true, neg: true }; // ⊤ — keep positive, add negative
  if (rule === "construct") return { pos: false, neg: false }; // ⊥ — retract both faces
  return { pos: false, neg: true }; // f — mortal / named / cursed: true, settled death
}
