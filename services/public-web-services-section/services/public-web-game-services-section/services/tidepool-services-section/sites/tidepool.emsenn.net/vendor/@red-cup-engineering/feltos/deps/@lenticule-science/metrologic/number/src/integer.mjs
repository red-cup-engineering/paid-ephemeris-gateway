// integer.mjs — ℤ as the charge's two-sided evidence, read as a difference.
//
// The floor's charge tracks two sides at once — positive evidence and negative evidence — and `negate`
// (the truth involution) interchanges them: ∼⟨a₊, a₋⟩ = ⟨a₋, a₊⟩. An INTEGER is exactly that
// two-sidedness read as a DIFFERENCE: a pair (pos, neg) of naturals — the positive and negative
// extensions — standing for pos − neg. Nothing new is introduced; the structure is the charge's:
//
//   • negate = swap the two sides           is the ADDITIVE INVERSE:  −(p, m) = (m, p)
//   • transverse accumulation (the ≤_k-join  is ADDITION:  (p, m) + (q, n) = (p+q, m+n)
//     unions each side separately)              — each side accumulates on its own, never entangling
//   • ZERO is REACHED, not seeded: it is BALANCED evidence — the two sides cancel. In particular
//     x + (−x) reaches zero: told a thing and its opposite equally, the difference is nothing. (0,0) is
//     the canonical balance; every balanced pair (k, k) is the same integer, zero.
//
// Built on ℕ — the two sides are extensions/COUNTS, so accumulation genuinely adds (this is counting, not
// the idempotent witness set, which is why the integers need ℕ underneath). Canonicalised by subtracting
// the smaller side (monus) so one side is 0; equality is then structural, realising the evidence balance
// (p, m) ∼ (q, n) iff p + n = q + m.

import * as N from "./natural.mjs";

/** Canonical two-sided evidence: cancel the overlap (monus) so (at least) one side is zero. */
function balance(pos, neg) {
  return N.leq(neg, pos)
    ? { pos: N.monus(pos, neg), neg: N.zero }
    : { pos: N.zero, neg: N.monus(neg, pos) };
}

/** The integer for two-sided evidence (pos, neg) — its value is pos − neg. */
export const integer = (pos, neg) => balance(pos, neg);

/** The integer of a natural n — purely positive evidence (n, 0). */
export const fromNatural = (n) => ({ pos: n, neg: N.zero });

/** 0 — the canonical balance (0, 0); reached whenever the two sides cancel. */
export const zero = fromNatural(N.zero);

/** 1 = (1, 0). */
export const one = fromNatural(N.one);

/** The additive inverse −z: swap the two evidence sides (the floor's truth involution `negate`). */
export const negate = (z) => ({ pos: z.neg, neg: z.pos });

/** Addition: accumulate each side separately (transverse aggregation): (p,m) + (q,n) = (p+q, m+n). */
export const add = (a, b) => balance(N.add(a.pos, b.pos), N.add(a.neg, b.neg));

/** Subtraction a − b = a + (−b). */
export const subtract = (a, b) => add(a, negate(b));

/** Multiplication: (p−m)(q−n) = (pq+mn) − (pn+mq), each product on its own side then balanced. */
export const multiply = (a, b) =>
  balance(
    N.add(N.multiply(a.pos, b.pos), N.multiply(a.neg, b.neg)),
    N.add(N.multiply(a.pos, b.neg), N.multiply(a.neg, b.pos)),
  );

/** Equality — canonical, so it is structural equality of the two sides (the evidence balance, realized). */
export const equal = (a, b) => N.equal(a.pos, b.pos) && N.equal(a.neg, b.neg);

/** The evidence-balance relation directly: (p,m) ∼ (q,n) iff p + n = q + m. */
export const equivalent = (a, b) => N.equal(N.add(a.pos, b.neg), N.add(b.pos, a.neg));

/** Is z zero — does its two-sided evidence balance? */
export const isZero = (z) => N.isZero(z.pos) && N.isZero(z.neg);

/** Is z positive? (Canonical: positive evidence remains after cancellation.) */
export const isPositive = (z) => !N.isZero(z.pos);

/** Is z negative? */
export const isNegative = (z) => !N.isZero(z.neg);

/** The sign of z: −1, 0, or +1. */
export const sign = (z) => (isPositive(z) ? 1 : isNegative(z) ? -1 : 0);

/** The magnitude |z| as a natural — the nonzero evidence side (or zero). */
export const magnitude = (z) => (isZero(z) ? z.pos : isPositive(z) ? z.pos : z.neg);

/**
 * Division with remainder, truncated toward zero: `{ quotient, remainder }` with a = quotient·b +
 * remainder and the remainder carrying a's sign. Throws on b = 0. (Magnitudes divide via ℕ.divmod; the
 * sign rides on the quotient.)
 * @param {object} a @param {object} b @returns {{ quotient: object, remainder: object }}
 */
export function divmod(a, b) {
  if (isZero(b)) throw new RangeError("integer divmod: division by zero");
  const qMag = N.divmod(magnitude(a), magnitude(b)).quotient;
  const q = sign(a) * sign(b) < 0 ? negate(fromNatural(qMag)) : fromNatural(qMag);
  return { quotient: q, remainder: subtract(a, multiply(q, b)) };
}

/** The truncated quotient ⌊a/b⌋ toward zero. */
export const quotient = (a, b) => divmod(a, b).quotient;

/** Does b divide a exactly? */
export const divides = (b, a) => isZero(divmod(a, b).remainder);

/** Total comparison: −1 if a < b, 0 if equal, +1 if a > b — the sign of a − b. */
export const compare = (a, b) => sign(subtract(a, b));

// ── boundary reads (host integers ↔ integers) ─────────────────────────────────────────────────────────
// Not part of the construction — a convenience for tests and host code.

/** The host integer of z: |pos| − |neg|. */
export const toInt = (z) => N.toCount(z.pos) - N.toCount(z.neg);

/** Build the integer for a host integer k. */
export const fromInt = (k) =>
  k >= 0 ? fromNatural(N.fromCount(k)) : negate(fromNatural(N.fromCount(-k)));
