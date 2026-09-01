// inversion.mjs — the spectral inversion duality z ↦ 1/z, over our integers.
//
// The conjugate roots of a substitution's characteristic polynomial sit somewhere relative to the unit
// circle, and "where" is not a foreign stability question — it is the inversion duality z ↦ 1/z, the same
// duality the system already runs:
//   • Verdier (verdier.mjs) duals the morphism by transpose (Mᵀ) — H¹ ≅ H₁;
//   • the Anderson–Putnam colimit (colimStructure) makes ×M invertible, so M⁻¹ acts on the limit, and
//     char-poly(M⁻¹) is the RECIPROCAL polynomial p*(z) = zⁿ·p(1/z) — the coefficients reversed.
// So z ↦ 1/z (roots inside ↔ outside) is the colimit's own inversion, read on the polynomial.
//
// Two morphisms here, both pure integer (no roots ever computed, no division):
//   • `reciprocal` — the inversion dual p ↦ p* (reverse the coefficients), an involution.
//   • the SELF-DUAL / ON-CIRCLE locus — p shares a root with its dual p* iff `resultant(p, p*) = 0`
//     (the Sylvester determinant vanishes). That shared-root set is the inversion-symmetric part of the
//     spectrum (reciprocal pairs and unit-circle roots) — the spectral analog of the Klein gauge's
//     self-dual fixed set {⊤, ⊥} (gauge.mjs). Pisot ⟺ this locus is empty (one root strictly broke the
//     duality outward, none neutral on the circle).
//
// A polynomial is a list of our integers (number/integer), low→high, normalized (no high zero padding).
// Built over our ℤ — slow but honest; scale is a downstream (computer/) concern.

import * as Z from "@lenticule-science/metrologic/number/integer";

/** Strip high-degree zero coefficients; the zero polynomial normalizes to [0]. */
function normalize(coeffs) {
  let hi = coeffs.length - 1;
  while (hi > 0 && Z.isZero(coeffs[hi])) hi--;
  return coeffs.slice(0, hi + 1);
}

/** A polynomial from host integers (low→high), for inputs and tests. */
export const fromInts = (ints) => normalize(ints.map(Z.fromInt));

/** A polynomial's coefficients as host integers (low→high). */
export const toInts = (p) => p.map(Z.toInt);

/** The degree of p (the zero polynomial has degree 0 here). */
export const degree = (p) => normalize(p).length - 1;

/** Coefficientwise equality of two polynomials. */
export function equal(p, q) {
  const a = normalize(p), b = normalize(q);
  return a.length === b.length && a.every((c, i) => Z.equal(c, b[i]));
}

/**
 * The inversion dual p ↦ p* = zⁿ·p(1/z): reverse the coefficients. An involution on polynomials with a
 * nonzero constant term (the case for a characteristic polynomial of a non-singular morphism). Its roots
 * are the reciprocals 1/z of p's roots — the spectral face of M ↦ M⁻¹.
 */
export const reciprocal = (p) => normalize([...normalize(p)].reverse());

/** Is p self-dual under inversion — p = p* (palindromic)? Then its spectrum is inversion-symmetric. */
export const isSelfReciprocal = (p) => equal(p, reciprocal(p));

// ── the resultant (Sylvester determinant), pure integer — the shared-root morphism ─────────────────────

/** Cofactor (Laplace) determinant of a square matrix of our integers — exact, no division. */
function determinant(M) {
  const n = M.length;
  if (n === 1) return M[0][0];
  let acc = Z.zero;
  for (let j = 0; j < n; j++) {
    const minor = M.slice(1).map((row) => row.filter((_, k) => k !== j));
    const term = Z.multiply(M[0][j], determinant(minor));
    acc = j % 2 === 0 ? Z.add(acc, term) : Z.subtract(acc, term);
  }
  return acc;
}

/** The Sylvester matrix of p (degree n) and q (degree m): an (n+m)×(n+m) matrix of our integers. */
function sylvester(p, q) {
  const a = normalize(p), b = normalize(q);
  const n = a.length - 1, m = b.length - 1;
  const P = [...a].reverse(), Q = [...b].reverse(); // high→low
  const size = n + m;
  const S = Array.from({ length: size }, () => Array.from({ length: size }, () => Z.zero));
  for (let i = 0; i < m; i++) for (let j = 0; j <= n; j++) S[i][i + j] = P[j];
  for (let i = 0; i < n; i++) for (let j = 0; j <= m; j++) S[m + i][i + j] = Q[j];
  return S;
}

/** The resultant res(p, q) — the Sylvester determinant; zero iff p and q share a root. */
export const resultant = (p, q) => determinant(sylvester(p, q));

/** Do p and q share a root? (res(p, q) = 0.) */
export const sharesRoot = (p, q) => Z.isZero(resultant(p, q));

/**
 * Is the SELF-DUAL / ON-CIRCLE locus non-empty — does p share a root with its inversion dual p*? True iff
 * p has a reciprocal pair (z, 1/z) or a root on the unit circle (the inversion-symmetric spectrum). A
 * Pisot polynomial gives false (one root strictly outside, all conjugates strictly inside, none neutral).
 */
export const inversionSymmetric = (p) => sharesRoot(p, reciprocal(p));
