// floor.mjs — the bridge from the bilattice floor to the settling cohomology, and the void-dual read.
//
// A bilattice settling (`settle`) is a real settling in the sense of settling.mjs: its closure trace is
// a monotone sequence of stages, each designating the cells it has driven to **t**. `settlingOf` reads
// that trace off the floor. Because the floor represents only finite data, every floor settling is
// FINITE — no limit stage — so its H¹ is 0, exactly as the four-regime dichotomy requires. The
// non-zero regimes are reached by settlings carrying limit firings (constructed as data; see the tests
// and docs), not by a single finite datum.

import {
  commutate, possibilizeKnowledge, necessitateKnowledge, lastValuation, present, vanish,
} from "@lenticule-science/metrologic/bilattice";
import { settling, nscFirings, h1 } from "./settling.mjs";

const S = (x) => JSON.stringify(x);
const dedup = (xs) => { const out = []; for (const x of xs) if (!out.some((o) => S(o) === S(x))) out.push(x); return out; };

/**
 * The cells a floor valuation designates **t** — value `[T, F]` (positive evidence, no negative): the
 * classical truth-order designation the settling-associated sheaf counts.
 * @param {object} valuation a floor valuation (`{ "fiber-algebras" }`) @returns {object[]}
 */
export const designatedCells = (valuation) =>
  valuation["fiber-algebras"].flatMap((fa) =>
    fa.assignments
      .filter(({ charge }) => S(present(charge)) === S([true, false]))
      .map(({ cell }) => cell));

/**
 * Read a floor category's closure trace as a settling: run `possibilizeKnowledge ∘ necessitateKnowledge`
 * to the fixed point, recording the cumulative designated-cell set at each stage. The result is a finite
 * settling (no limit stages), so `h1(settlingOf(category)).vanishes === true` for every floor settling.
 * @param {object} category a posited category (`{ presheaf, traces }`)
 * @returns {object} a settling (see settling.mjs)
 */
export function settlingOf(category) {
  const { saturated: presheaf, residue: traces } = commutate(category);
  let current = { presheaf, traces };
  let prev;
  let cumulative = dedup(designatedCells(lastValuation(current)));
  const stages = [{ designated: cumulative }];
  do {
    prev = current;
    current = possibilizeKnowledge(necessitateKnowledge(current));
    cumulative = dedup([...cumulative, ...designatedCells(lastValuation(current))]);
    stages.push({ designated: cumulative });
  } while (S(lastValuation(current)) !== S(lastValuation(prev)));
  return settling(stages);
}

/**
 * The void cone of a settled category — the floor's `vanish` (the gap between `settle`'s least fixed
 * point and `brim`'s greatest): the cells the closure pins from neither side.
 * @param {object} category a posited category @returns {{ apex: object[], evidence: object[] }}
 */
export const voidCone = (category) => vanish(category);

/**
 * The void-dual reading: the associated graded of the void filtration — the cells that LEAVE the void
 * (become designated) at each non-Scott-continuous firing. By the void-cone (co)homology theorem this is
 * canonically isomorphic to the apex H¹; the isomorphism is the firing-ordinal bijection, which holds at
 * the chain level independently of Verdier duality. `apexVoidMatch` asserts the rank equality directly.
 * @param {object} v a settling @returns {{ lost: {stage: number, cell: unknown}[], rank: number }}
 */
export function gradedVoid(v) {
  const lost = nscFirings(v).flatMap((d) => d.added.map((cell) => ({ stage: d.stage, cell })));
  return { lost, rank: lost.length };
}

/** The apex–void match: rank H¹(apex) = rank gr(Void), the chain-level core of the void-cone theorem. */
export const apexVoidMatch = (v) => h1(v).rank === gradedVoid(v).rank;
