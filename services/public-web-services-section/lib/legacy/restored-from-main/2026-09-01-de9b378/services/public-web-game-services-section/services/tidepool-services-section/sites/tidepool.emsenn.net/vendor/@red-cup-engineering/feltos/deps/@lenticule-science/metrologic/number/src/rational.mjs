// rational.mjs — ℚ as ratios, more than one true reading at once.
//
// A rational is a ratio of integers num/den (den ≠ 0). It carries several faces simultaneously, each
// giving real morphisms — the system's habit of one object seen many ways:
//
//   • MULTIPLICATIVE two-sidedness — num and den are the two sides, mirroring ℤ's additive two-sided
//     evidence one level up. `reciprocal` (swap num ↔ den) is the MULTIPLICATIVE INVERSE, and the unit 1
//     is REACHED by balance (a/a, num and den equal) — just as ℤ's 0 is reached by additive balance.
//   • the RESIDUAL ⊸ — division a/b is the residual the floor names but had not built
//     (one-adjunction-three-faces.md: "named, not present"); `divide` is its first concrete instance on
//     numbers, and reciprocal(x) = 1 ⊸ x.
//   • the ADDITIVE face rides up in the numerator: ℤ's reached zero (0/1) and `negate` carry up unchanged.
//
// ℚ is also the carrier the Perron growth-ratios and the spectral reflection coefficients live in.
//
// Built on ℤ (hence ℕ): equality is cross-multiplication a·d = b·c (realised via ℤ), canonicalised by
// gcd-reduction (ℕ.gcd / ℕ.divmod) with den > 0. Slow but honest; scale is a downstream (computer/) concern.

import * as Z from "./integer.mjs";
import * as N from "./natural.mjs";

/** Canonical ratio: reduce by gcd of the magnitudes, carry the sign on the numerator, keep den > 0. */
function canonical(num, den) {
  if (Z.isZero(den)) throw new RangeError("rational: zero denominator");
  const s = Z.sign(num) * Z.sign(den);
  const mNum = Z.magnitude(num), mDen = Z.magnitude(den); // ℕ magnitudes
  if (N.isZero(mNum)) return { num: Z.zero, den: Z.one }; // 0/d = 0/1
  const g = N.gcd(mNum, mDen);
  const n = Z.fromNatural(N.divmod(mNum, g).quotient);
  return { num: s < 0 ? Z.negate(n) : n, den: Z.fromNatural(N.divmod(mDen, g).quotient) };
}

/** The rational num/den (both integers, den ≠ 0). */
export const rational = (num, den) => canonical(num, den);

/** The rational of an integer z — z/1. */
export const fromInteger = (z) => ({ num: z, den: Z.one });

/** 0 = 0/1 — the additive zero, inherited from ℤ's reached zero. */
export const zero = fromInteger(Z.zero);

/** 1 = 1/1 — the multiplicative unit, reached by any balance a/a. */
export const one = fromInteger(Z.one);

/** The additive inverse −q (the additive face, in the numerator). */
export const negate = (q) => ({ num: Z.negate(q.num), den: q.den });

/** The multiplicative inverse 1/q — swap the two multiplicative sides (num ↔ den). Errors on 0. */
export const reciprocal = (q) => canonical(q.den, q.num);

/** Addition a/b + c/d = (ad + cb)/(bd). */
export const add = (a, b) =>
  canonical(Z.add(Z.multiply(a.num, b.den), Z.multiply(b.num, a.den)), Z.multiply(a.den, b.den));

/** Subtraction a − b = a + (−b). */
export const subtract = (a, b) => add(a, negate(b));

/** Multiplication (a/b)(c/d) = ac/bd. */
export const multiply = (a, b) => canonical(Z.multiply(a.num, b.num), Z.multiply(a.den, b.den));

/** Division — the residual a ⊸ b = a / b = a · (1/b). Errors on b = 0. */
export const divide = (a, b) => multiply(a, reciprocal(b));

/** Equality by cross-multiplication: a/b = c/d iff a·d = b·c. */
export const equal = (a, b) => Z.equal(Z.multiply(a.num, b.den), Z.multiply(b.num, a.den));

/** Is q zero? (Its numerator is zero.) */
export const isZero = (q) => Z.isZero(q.num);

/** The sign of q: −1, 0, or +1 (the denominator is canonically positive). */
export const sign = (q) => Z.sign(q.num);

/** Total comparison: −1 if a < b, 0 if equal, +1 if a > b — the sign of a − b. */
export const compare = (a, b) => sign(subtract(a, b));

// ── boundary reads (host ↔ rationals) ─────────────────────────────────────────────────────────────────
// Not part of the construction — conveniences for tests and host code.

/** The rational for a host integer k. */
export const fromInt = (k) => fromInteger(Z.fromInt(k));

/** The rational for a host ratio n/d. */
export const fromRatio = (n, d) => canonical(Z.fromInt(n), Z.fromInt(d));

/** The host floating value of q (num/den). */
export const toNumber = (q) => Z.toInt(q.num) / Z.toInt(q.den);
