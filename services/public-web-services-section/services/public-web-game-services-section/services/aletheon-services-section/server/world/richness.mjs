// [economy] richness — value as FIBER RICHNESS, read off an item's settled fiber. Value is NOT a
// number an item carries; it is a property of how richly its fiber composes. Grounded line-for-line
// in tab's richness.mjs (development/lab/tab/being/library/value/library/richness/scripts/
// richness.mjs) and the economy note (docs/dev/notes/economy-is-predicate-richness.md):
//
//   - a DETERMINED cell contributes; an undetermined cell (⊥, honest ignorance) contributes nothing.
//   - a CONTESTED cell (⊤, a thing the world argues about) COUNTS toward worth — it is not worthless.
//   - a FUNCTIONAL (single-valued, superseding) cell weighs more, because scarcity IS settledness:
//     a settled functional cell is the dense/inert/stable kind, where firable cells are abundant.
//
// Pure reads — a QUOTE, not a move. Nothing changes. (In tab the four-value face comes from the
// substrate; here our item cells already carry the settled glyph, so isDetermined/isTop are a read
// of the glyph string: ⊥ undetermined, ⊤ contested, t/f determined-and-not-contested.)

import { FUNCTIONAL } from "../../shared/items.mjs";

// the bilattice reads, off a cell's settled glyph (mirrors tab's #value isDetermined / isTop).
const isDetermined = (v) => v === "t" || v === "f" || v === "⊤"; // ⊥ alone is honest ignorance
const isTop = (v) => v === "⊤";

// richness(fiber, opts?) -> { score, determined, contested }. `fiber` is the item's cell list
// [{predicate, value}]. opts.functionalWeight is the weight of a functional determined cell (2).
export function richness(fiber, opts = {}) {
  if (!Array.isArray(fiber)) throw new TypeError("richness: fiber must be an array of {predicate,value} cells");
  const functionalWeight = opts.functionalWeight ?? 2;

  let score = 0, determined = 0, contested = 0;
  for (const cell of fiber) {
    const v = cell.value;
    if (!isDetermined(v)) continue; // ⊥ contributes nothing
    determined += 1;
    if (isTop(v)) contested += 1; // ⊤ counts toward worth and is contested
    // scarcity = settledness: a functional (single-valued, superseding) cell weighs more.
    score += FUNCTIONAL.has(cell.predicate) ? functionalWeight : 1;
  }
  return { score, determined, contested };
}

// value(item) — the item's worth as a positive number: the richness SCORE of its fiber. A
// non-empty fiber with any determined cell is worth a positive number; an all-⊥ fiber is worth 0.
export function value(item) {
  if (!item || !Array.isArray(item.fiber)) return 0;
  return richness(item.fiber).score;
}

// inventoryRichness — the combined fiber richness of a holder's whole inventory, plus their marks
// (marks are the conserved base quantum — themselves richness already settled into currency). This
// is what the HUD quotes as the player's total worth.
export function inventoryRichness(inventory = [], marks = 0) {
  let score = marks | 0;
  for (const item of inventory) score += value(item);
  return score;
}
