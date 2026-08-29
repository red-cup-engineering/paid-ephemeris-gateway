// gauge.mjs — the d-frame value-category duality: the Klein-four gauge on FOUR, and self-duality.
//
// Verdier duality on d-frame data composes TWO dualities: the spatial sheaf↔cosheaf swap (verdier.mjs)
// and the value-category swap from the bilattice's internal symmetry. FOUR carries a Klein-four group
//   id,  negation ¬ (t↔f, fixes ⊥,⊤),  conflation − (⊥↔⊤, fixes t,f),  double ¬·− (swaps both).
//
// A substitution settling labels each alphabet letter with a FOUR value. Two self-dualities, per gauge
// element σ (after `klein-four-self-duality-on-named-substitutions.md`):
//   • FIRING-PATTERN self-dual under σ: every firing's value is σ-fixed (the value lies in σ's fixed set).
//   • SUBSTITUTION-RULE self-dual under σ: M commutes with the alphabet permutation σ induces (the letter
//     i ↦ the letter whose value is σ(value of i)); N/A if σ maps some value off the labeling.

import { FOUR as F, negate, conflate } from "@lenticule-science/metrologic/chu";
import * as Z from "@lenticule-science/metrologic/number/integer";
import { matmul, matEqual } from "@lenticule-science/metrologic/number/matrix";

const liftMat = (M) => M.map((row) => row.map(Z.fromInt));

/** The four bilattice values. */
export const FOUR = [F.BOT, F.T, F.F, F.TOP];

// Build a gauge element as a map FOUR → FOUR by applying a floor involution to each value.
const mapOf = (g) => Object.fromEntries(FOUR.map((v) => [v, g(v)]));

/**
 * The Klein-four gauge elements, READ off the floor's own involutions (not declared): `negation` is the
 * truth involution `negate` (t↔f, fixes ⊥,⊤), `conflation` is the knowledge involution `conflate` (⊥↔⊤,
 * fixes t,f), `double` is their composite, and `id` the identity. The Klein-four table falls out of the
 * floor, rather than being injected as a literal.
 */
export const GAUGE = {
  id: mapOf((v) => v),
  negation: mapOf(negate),
  conflation: mapOf(conflate),
  double: mapOf((v) => negate(conflate(v))),
};

/** The fixed set of a gauge element — the values σ leaves in place. */
export const fixedSet = (sigma) => FOUR.filter((v) => GAUGE[sigma][v] === v);

/**
 * Firing-pattern self-duality under σ: every labelled value is fixed by σ.
 * @param {string[]} labeling letter→FOUR value @param {string} sigma a gauge element @returns {boolean}
 */
export function firingPatternSelfDual(labeling, sigma) {
  const fixed = new Set(fixedSet(sigma));
  return labeling.every((v) => fixed.has(v));
}

/**
 * The permutation matrix σ induces on the alphabet: letter i ↦ the letter whose value is σ(value of i).
 * Returns `null` (N/A) if σ sends some letter's value to a value no letter carries. The 0/1 entries are
 * OUR integers (number/integer) — the matrix lives over our ℤ, like every other matrix here.
 * @param {string[]} labeling @param {string} sigma @returns {object[][]|null} a 0/1 matrix of our integers
 */
export function inducedPermutation(labeling, sigma) {
  const n = labeling.length;
  const valueToLetter = new Map(labeling.map((v, i) => [v, i]));
  const P = Array.from({ length: n }, () => Array.from({ length: n }, () => Z.zero));
  for (let i = 0; i < n; i++) {
    const target = GAUGE[sigma][labeling[i]];
    const j = valueToLetter.get(target);
    if (j === undefined) return null; // σ maps off the labeling — undefined
    P[j][i] = Z.one; // letter i ↦ letter j
  }
  return P;
}

/**
 * Substitution-rule self-duality under σ: M commutes with the σ-induced alphabet permutation. Returns
 * `{ selfDual, trivial }` (trivial = the permutation is the identity, so commutation is vacuous), or
 * `null` if the permutation is undefined (N/A). The host-integer M is lifted to our ℤ at the boundary; the
 * commutation MP = PM is checked over our ℤ (number/matrix matmul/matEqual).
 * @param {number[][]} M @param {string[]} labeling @param {string} sigma
 * @returns {{ selfDual: boolean, trivial: boolean }|null}
 */
export function substitutionRuleSelfDual(M, labeling, sigma) {
  const P = inducedPermutation(labeling, sigma);
  if (P === null) return null;
  const Mz = liftMat(M);
  const trivial = P.every((row, i) => row.every((x, j) => Z.equal(x, i === j ? Z.one : Z.zero)));
  return { selfDual: matEqual(matmul(Mz, P), matmul(P, Mz)), trivial };
}
