// @lenticule-science/metrologic/readout — a charge → style/readout utility, on zero dependencies.
//
// Reads a charge's FOUR place as the bilattice already names it (`absurd`/`potential`/`active`/`stable`
// — see charge.mjs's header), plus two order-derived numbers a renderer needs and would otherwise
// re-invent per consumer: `knowledgeWeight` (how many sides are told — 0, 1, or 2) and `salience`, a
// total draw-priority ranking that resolves the two knowledge-weight-1 places (`potential` vs `active`)
// by truth. `styleFor` replaces the hand-rolled switch/lookup a renderer would otherwise write per FOUR
// place with one call, validated against all four places up front.
//
// This absorbs the *shape* that consumers (abrash, tsander) had each hand-rolled as a local `FOUR =
// {T,F,BOT,TOP}` string-tag table keyed for rendering (a wall-color table, a glyph table, a salience
// ordering) — it does not bake in any consumer's colors or glyphs, only the theory-derived
// classification and ordering a style table is looked up by.

import { present, isTop } from "../../bilattice/src/charge.mjs";

/** @typedef {import("../../bilattice/src/charge.mjs").Charge} Charge */

/** The canonical FOUR place names, in the bilattice's own vocabulary (charge.mjs's header comment). */
export const PLACES = Object.freeze(["absurd", "potential", "active", "stable"]);

/**
 * The FOUR place a charge reads at, by its value bits: `[F,F]` absurd, `[T,F]` potential, `[F,T]`
 * active, `[T,T]` stable.
 * @param {Charge} charge @returns {"absurd"|"potential"|"active"|"stable"}
 */
export function place(charge) {
  const [pos, neg] = present(charge);
  if (pos && neg) return "stable";
  if (pos) return "potential";
  if (neg) return "active";
  return "absurd";
}

/**
 * How many sides are told: 0 (absurd), 1 (potential or active — the knowledge order's middle, where
 * the two places tie), or 2 (stable). The knowledge order's own measure of "how determined."
 * @param {Charge} charge @returns {0|1|2}
 */
export function knowledgeWeight(charge) {
  const [pos, neg] = present(charge);
  return (pos ? 1 : 0) + (neg ? 1 : 0);
}

/**
 * A total draw-priority ranking, derived from the two σ-dual orders rather than picked by hand:
 * `knowledgeWeight × 2 + (pos ? 1 : 0)` — knowledge breaks the tie between places first, truth (the pos
 * bit) breaks the tie the knowledge order leaves between `potential` and `active`. Yields
 * `absurd(0) < active(2) < potential(3) < stable(5)`, a genuine total order derived from the bilattice's
 * own structure (not an arbitrary enum a renderer would otherwise assign).
 * @param {Charge} charge @returns {number}
 */
export function salience(charge) {
  const [pos] = present(charge);
  return knowledgeWeight(charge) * 2 + (pos ? 1 : 0);
}

/**
 * The full readout of a charge: its place, knowledge weight, salience rank, and whether it is `⊤`
 * (told-both — the paraconsistent locus `compare` in `../../bilattice/src/descent.mjs` partitions on).
 * @param {Charge} charge @returns {{ place: string, knowledgeWeight: number, salience: number, top: boolean }}
 */
export function readout(charge) {
  return Object.freeze({ place: place(charge), knowledgeWeight: knowledgeWeight(charge), salience: salience(charge), top: isTop(charge) });
}

/**
 * Look a charge's place up in a style table — the theory-derived replacement for a hand-rolled
 * switch/keyed-object per FOUR place (as abrash's `WALL_COLOR` and tsander's `CHARGE_GLYPH` each were).
 * `table` must cover all four `PLACES`; validated up front so a missing place fails at the call site,
 * not with `undefined` three functions later.
 * @template T @param {Charge} charge @param {Record<"absurd"|"potential"|"active"|"stable", T>} table @returns {T}
 */
export function styleFor(charge, table) {
  assertStyleTable(table);
  return table[place(charge)];
}

/**
 * Validate a style table covers all four FOUR places.
 * @param {Record<string, unknown>} table
 */
export function assertStyleTable(table) {
  if (!table || typeof table !== "object") {
    throw new TypeError("assertStyleTable: expected an object keyed by the four FOUR places");
  }
  for (const p of PLACES) {
    if (!(p in table)) throw new TypeError(`assertStyleTable: table is missing "${p}"`);
  }
}
