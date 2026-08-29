// spectral.mjs — the spectral tests a substitution matrix's regime turns on: primitivity and Pisot.
//
// Step 2 of the computation protocol classifies a substitution settling's regime from its matrix M. The
// decision turns on two spectral facts:
//   • PRIMITIVE — some power Mᵏ is strictly positive (the substitution mixes every letter into every
//     other). Non-negative + primitive ⇒ a simple dominant Perron eigenvalue.
//   • PISOT — the Perron eigenvalue λ is a real algebraic integer > 1 all of whose conjugates lie
//     strictly inside the unit circle. This is the hallmark of an aperiodic substitution tiling.
//
// Everything here is exact over OUR numbers (number/integer, number/rational, number/matrix) — no host
// arithmetic in a math step, no BigInt, no Math.*, no imported algorithm:
//   • the characteristic polynomial is `number/matrix.charPoly` (det(λI − M) over our ℤ[λ]);
//   • primitivity is strict-positivity of matrix powers (number/matrix.matmul) over our ℤ;
//   • the Perron eigenvalue is carried as `perronPoly` (its char-poly) plus `perronConvergent`, the exact
//     rational ratio of successive row-sum totals of Mᵏ over number/rational;
//   • the Pisot test delegates to spectral/location.isPisot (the Cayley map + our owned Routh/Sturm count).
// Host integers enter only at the public boundary (a matrix of numbers in), read in via Z.fromInt; the
// reported coefficients are read back out via Z.toInt. The math in between is all ours.

import * as Z from "@lenticule-science/metrologic/number/integer";
import * as Q from "@lenticule-science/metrologic/number/rational";
import { charPoly as charPolyZ, matmul as matmulZ } from "@lenticule-science/metrologic/number/matrix";
import { rootLocation } from "@lenticule-science/metrologic/spectral/location";

const liftMat = (M) => M.map((row) => row.map(Z.fromInt));

/**
 * The characteristic polynomial of M — integer coefficients [a₀, …, a_{n-1}, 1] of
 * p(λ) = λⁿ + a_{n-1}λⁿ⁻¹ + … + a₀ (low-degree first), monic. Computed exactly over our ℤ[λ] by
 * `number/matrix.charPoly` (det(λI − M)); the host-integer input is lifted at the boundary and the
 * coefficients are read back to host integers for the caller.
 * @param {number[][]} M @returns {number[]}
 */
export function charPoly(M) {
  return charPolyZ(liftMat(M)).map(Z.toInt);
}

/** The characteristic polynomial as a polynomial of OUR integers (low→high) — for owned spectral steps. */
export const charPolyOver = (M) => charPolyZ(liftMat(M));

/** Whether a non-negative matrix is primitive: some power Mᵏ (k ≤ (n−1)²+1) is strictly positive (our ℤ). */
export function isPrimitive(M) {
  const n = M.length;
  if (M.some((r) => r.some((x) => x < 0))) return false;
  const Mz = liftMat(M);
  const allPositive = (P) => P.every((r) => r.every((x) => Z.isPositive(x)));
  let P = Mz;
  for (let k = 1; k <= (n - 1) * (n - 1) + 1; k++) {
    if (allPositive(P)) return true;
    P = matmulZ(P, Mz);
  }
  return allPositive(P);
}

/**
 * The Perron eigenvalue, represented EXACTLY: it is the dominant root of `perronPoly(M)` — an algebraic
 * number, not a decimal. `perronPoly` is the characteristic polynomial (the construction λ comes from);
 * `perronConvergent` gives exact rational approximations to λ as fine as you like.
 */
export const perronPoly = (M) => charPoly(M);

/**
 * An exact rational convergent to the Perron eigenvalue: the ratio of successive row-sum totals of Mᵏ.
 * For a primitive non-negative M these climb to λ. Exact over number/rational throughout — no floats, no
 * BigInt. Returns a rational `{ num, den }` (number/rational). Iterations are kept SMALL by default: the
 * row-sum totals of Mᵏ grow like λᵏ, and our (unary von-Neumann) naturals make large magnitudes slow, so a
 * handful of steps already pins the ratio. The host matrix is lifted to our ℤ at the boundary.
 * @param {number[][]} M @param {number} [iters]
 */
export function perronConvergent(M, iters = 4) {
  const n = M.length;
  const Mz = liftMat(M);
  let v = Array(n).fill(Z.one);
  const total = (w) => w.reduce((s, x) => Z.add(s, x), Z.zero);
  for (let k = 0; k < iters; k++) {
    const w = Mz.map((row) => row.reduce((s, a, j) => Z.add(s, Z.multiply(a, v[j])), Z.zero));
    if (k === iters - 1) return Q.rational(total(w), total(v));
    v = w;
  }
  return Q.one;
}

/**
 * Whether M's Perron eigenvalue is a Pisot number — decided EXACTLY (no floats) by the root-location
 * descent in spectral/location: the Cayley map of the unit disk to the half-plane plus the owned
 * Routh/Sturm count. Returns `{ pisot, outside }` where `outside` is the number of characteristic roots
 * strictly outside the unit disk (Pisot ⟺ exactly 1, with none on the circle).
 * @param {number[][]} M
 */
export function isPisot(M) {
  const cp = charPolyOver(M); // our-ℤ polynomial, low→high — exactly location's expected input
  const loc = rootLocation(cp);
  if (loc.degenerate) return { pisot: false, outside: null }; // a root on the unit circle
  return { pisot: loc.expanding === 1 && loc.neutral === 0, outside: loc.expanding };
}
