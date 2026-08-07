// balance.mts — double-entry as the conservation law. A transaction's postings are a graded
// 0-chain; "the books balance" is ∂ = 0 in every commodity. This module computes posting weights
// and then DEFERS the conservation judgment to @emsenn/relating's graded operator: residual, the
// balanced/not verdict, and the inferred elided leg are all readings of gradedResidualBy /
// gradedConservedBy / gradedCompleteBy. The law lives upstream in the relational substrate; money
// is one instantiation of it — a bigint rational graded by commodity, because real money magnitudes
// run past what von Neumann ordinals can hold, so the value is bigint while the LAW is shared. Truth
// is exact (the residual vanishes), never a tolerance.

import type { Amount, Posting, Transaction } from "./model/types.mjs";
import type { Registry } from "./registry.mjs";
import { add, negate, isZero, times, amount, toExactString } from "./rational.mjs";
import { conservation } from "@emsenn/relating/analysis";

const { gradedResidualBy, gradedConservedBy, gradedCompleteBy } = conservation;

// Money as a grade-tagged additive structure: the commodity is the sector. This is the bridge that
// lets bigint money reuse the same conservation operator the carrier Rational does.
const moneyAdditive = Object.freeze({
  gradeOf: (a: Amount): string => a.commodity,
  add,
  isZero,
  negate,
});

const weightsOf = (postings: readonly Posting[], registry?: Registry): Amount[] => {
  const weights: Amount[] = [];
  for (const p of postings) {
    const w = postingWeight(p, registry);
    if (w !== null) weights.push(w);
  }
  return weights;
};

// postingWeight — the commodity weight a posting contributes to its transaction's BALANCE check.
// Precedence: cost > price > face. A total-kind reduces to the stated total with the posting's sign;
// per-unit reduces to units × per-unit in the reducer commodity. Elided → null.
export function postingWeight(posting: Posting, _registry?: Registry): Amount | null {
  const a = posting.amount;
  if (a === null) return null;

  const reduce = (reducer: { kind: string; amount: Amount | null }, totalKind: boolean): Amount => {
    const r = reducer.amount;
    if (!r) return { num: a.num, den: a.den, commodity: a.commodity }; // empty {} = face
    if (totalKind) {
      const sign = a.num < 0n ? -1n : 1n;
      const mag = r.num < 0n ? -r.num : r.num;
      return amount(sign * mag, r.den, r.commodity);
    }
    return times(a, r, r.commodity);
  };

  if (posting.cost) return reduce(posting.cost, posting.cost.kind === "total");
  if (posting.price) return reduce(posting.price, posting.price.kind === "@@");
  return { num: a.num, den: a.den, commodity: a.commodity };
}

// postingHolding — what a posting ADDS TO ITS ACCOUNT: the face amount, always. This is what
// account balances accumulate. Elided → null.
export function postingHolding(posting: Posting): Amount | null {
  const a = posting.amount;
  if (a === null) return null;
  return { num: a.num, den: a.den, commodity: a.commodity };
}

// residual — the per-commodity leftover of the postings' weights: the graded residual of the
// 0-chain, keyed by commodity, keeping only the commodities that fail to vanish.
export function residual(postings: readonly Posting[], registry?: Registry): Map<string, Amount> {
  const out = new Map<string, Amount>();
  for (const sum of gradedResidualBy(weightsOf(postings, registry), moneyAdditive)) out.set(sum.commodity, sum);
  return out;
}

// inferElided — if exactly ONE posting has amount === null, solve for it by graded completion: the
// missing leg is whatever closes the residual of the others, possible precisely when that residual
// lives in a single commodity. 0 or >1 elided, or an ambiguous residual → unchanged.
export function inferElided(txn: Transaction, registry?: Registry): Transaction {
  const postings = txn.postings;
  const elidedIdxs: number[] = [];
  for (let i = 0; i < postings.length; i++) {
    if ((postings[i]?.amount ?? null) === null) elidedIdxs.push(i);
  }
  if (elidedIdxs.length !== 1) return txn;

  const elidedIdx = elidedIdxs[0]!;
  const known = weightsOf(postings.filter((_, i) => i !== elidedIdx), registry);
  const completion = gradedCompleteBy(known, moneyAdditive);
  if (completion.kind !== "witness") return txn;

  const newPostings = postings.map((p, i) => (i === elidedIdx ? { ...p, amount: completion.inferred } : p));
  return { ...txn, postings: newPostings };
}

// balances — does this transaction conserve? The graded conservation judgment: balanced is the
// witness, and on obstruction the surviving per-commodity residuals are the syndrome, rendered exact.
export function balances(txn: Transaction, registry?: Registry): { balanced: boolean; residualStrings: string[] } {
  const { conserved, residual: leftover } = gradedConservedBy(weightsOf(txn.postings, registry), moneyAdditive);
  return { balanced: conserved, residualStrings: leftover.map((a) => toExactString(a)) };
}
