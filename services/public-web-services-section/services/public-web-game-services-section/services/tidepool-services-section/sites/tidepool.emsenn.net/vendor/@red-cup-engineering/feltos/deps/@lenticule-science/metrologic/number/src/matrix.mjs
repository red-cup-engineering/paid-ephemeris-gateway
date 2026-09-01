// matrix.mjs — integer matrices over our integers: determinant, characteristic polynomial, Smith normal
// form, and rank. All exact over number/integer — no host arithmetic, no imported linear-algebra package.
//
// A matrix is a list of rows of our integers. The determinant and the characteristic polynomial share one
// cofactor expansion, instantiated over two rings: ℤ (for det) and ℤ[λ] (for det(λI − M)). Smith normal
// form is integer row/column reduction driven by the gcd, using our ℤ truncated division; the rank is the
// number of nonzero invariant factors (= rank over ℚ, with no field division needed). This is the honest
// replacement for the host-number `verdier/matrix.mjs`.

import * as Z from "./integer.mjs";

// ── ℤ[λ] polynomials (low→high), for the characteristic polynomial ────────────────────────────────────
const PZERO = [Z.zero];
const pnorm = (p) => { let h = p.length - 1; while (h > 0 && Z.isZero(p[h])) h--; return p.slice(0, h + 1); };
const ppad = (a, b, op) => {
  const n = a.length > b.length ? a.length : b.length;
  return pnorm(Array.from({ length: n }, (_, i) => op(a[i] ?? Z.zero, b[i] ?? Z.zero)));
};
const padd = (a, b) => ppad(a, b, Z.add);
const psub = (a, b) => ppad(a, b, Z.subtract);
const pmul = (a, b) => {
  const r = Array.from({ length: a.length + b.length - 1 }, () => Z.zero);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) r[i + j] = Z.add(r[i + j], Z.multiply(a[i], b[j]));
  return pnorm(r);
};

const Zring = { zero: Z.zero, add: Z.add, sub: Z.subtract, mul: Z.multiply };
const Pring = { zero: PZERO, add: padd, sub: psub, mul: pmul };

/** Cofactor (Laplace) determinant over a ring R = {zero, add, sub, mul}. */
function det(M, R) {
  const n = M.length;
  if (n === 1) return M[0][0];
  let acc = R.zero;
  for (let j = 0; j < n; j++) {
    const minor = M.slice(1).map((row) => row.filter((_, k) => k !== j));
    const term = R.mul(M[0][j], det(minor, R));
    acc = j % 2 === 0 ? R.add(acc, term) : R.sub(acc, term);
  }
  return acc;
}

/** Transpose. */
export const transpose = (M) => M[0].map((_, j) => M.map((r) => r[j]));

/** Matrix product over our ℤ. */
export const matmul = (A, B) =>
  A.map((row) => B[0].map((_, j) => row.reduce((s, aik, k) => Z.add(s, Z.multiply(aik, B[k][j])), Z.zero)));

/** Structural equality of two integer matrices. */
export const matEqual = (A, B) =>
  A.length === B.length && A.every((r, i) => r.length === B[i].length && r.every((x, j) => Z.equal(x, B[i][j])));

/** The determinant of a square integer matrix (exact, our ℤ). */
export const determinant = (M) => det(M, Zring);

/** The characteristic polynomial det(λI − M) — coefficients (our ℤ) low→high, monic. */
export function charPoly(M) {
  const lamIminusM = M.map((row, i) => row.map((x, j) => (i === j ? [Z.negate(x), Z.one] : [Z.negate(x)])));
  return det(lamIminusM, Pring);
}

/**
 * The Smith normal form invariant factors |d₁| | |d₂| | … (our ℤ, nonnegative) — M is equivalent over ℤ to
 * diag(d₁, …). Integer row/column reduction driven by the gcd; M and Mᵀ always share these factors.
 */
export function smithNormalForm(M) {
  const A = M.map((r) => r.slice());
  const m = A.length, n = A[0].length;
  const swapRows = (i, j) => { [A[i], A[j]] = [A[j], A[i]]; };
  const swapCols = (i, j) => { for (const r of A) [r[i], r[j]] = [r[j], r[i]]; };
  const addRow = (dst, src, q) => { for (let j = 0; j < n; j++) A[dst][j] = Z.subtract(A[dst][j], Z.multiply(q, A[src][j])); };
  const addCol = (dst, src, q) => { for (let i = 0; i < m; i++) A[i][dst] = Z.subtract(A[i][dst], Z.multiply(q, A[i][src])); };

  const lim = m < n ? m : n;
  for (let t = 0; t < lim; t++) {
    let found = false;
    for (let i = t; i < m && !found; i++) for (let j = t; j < n && !found; j++) {
      if (!Z.isZero(A[i][j])) { swapRows(t, i); swapCols(t, j); found = true; }
    }
    if (!found) break;
    for (;;) {
      let changed = false;
      for (let i = t + 1; i < m; i++) {
        if (Z.isZero(A[i][t])) continue;
        addRow(i, t, Z.quotient(A[i][t], A[t][t]));
        if (!Z.isZero(A[i][t])) { swapRows(t, i); changed = true; }
      }
      for (let j = t + 1; j < n; j++) {
        if (Z.isZero(A[t][j])) continue;
        addCol(j, t, Z.quotient(A[t][j], A[t][t]));
        if (!Z.isZero(A[t][j])) { swapCols(t, j); changed = true; }
      }
      if (!changed) break;
    }
    let fixed = false;
    for (let i = t + 1; i < m && !fixed; i++) for (let j = t + 1; j < n && !fixed; j++) {
      if (!Z.divides(A[t][t], A[i][j])) { addRow(t, i, Z.negate(Z.one)); fixed = true; }
    }
    if (fixed) { t--; continue; }
  }

  const factors = [];
  for (let t = 0; t < lim; t++) factors.push(Z.fromNatural(Z.magnitude(A[t][t] ?? Z.zero)));
  return factors;
}

/** The rank — the number of nonzero invariant factors (= rank over ℚ). A host count. */
export const rank = (M) => smithNormalForm(M).filter((f) => !Z.isZero(f)).length;

/** A matrix from host integers, for inputs and tests. */
export const fromInts = (rows) => rows.map((r) => r.map(Z.fromInt));
