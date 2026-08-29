// location.mjs — root-location relative to the unit circle, via the Cayley map and an owned Routh/Sturm count.
//
// The inversion dual (inversion.mjs) detects the self-dual / on-circle locus but does not count which side
// the roots fall on. The direct unit-circle descent (Schur–Cohn/Jury) is the WRONG tool here: its first
// reflection coefficient is constant/leading, which for a monic characteristic polynomial with constant
// ±det = ±1 (every canonical unimodular substitution) has modulus 1 — so it reads "on the circle" at step 0
// and breaks, unable to tell Pisot from on-circle. So we go through the HALF-PLANE instead:
//
//   Cayley map  z = (1+w)/(1−w):  |z|<1 ↔ Re w < 0 (left half-plane),  |z|=1 ↔ Re w = 0 (axis),
//                                  |z|>1 ↔ Re w > 0 (right half-plane).
//   `mobius` carries p to q(w) = Σ p[k](1+w)^k(1−w)^{n−k} (a degree drop ⇒ a root at z = −1, on the circle).
//
// Then the right-half-plane root count of q is the Routh array — which we OWN, not cite: it is the signed
// polynomial-remainder (Sturm) sequence of q's even and odd parts, and the sign changes down its first
// column are the Cauchy index of that ratio over ℝ, which by the argument principle counts the RHP roots.
// The arithmetic that needs division lives here, in ℚ (our number/rational).
//
//   expanding  = #RHP roots of q  = #roots of p with |z| > 1
//   contracting = #LHP roots of q = #roots of p with |z| < 1
//   neutral    = #axis roots of q + #dropped (z = −1) = #roots of p with |z| = 1
//
// The non-degenerate case (no axis roots) is exact and covers Pisot. The axis-singular case (Salem,
// cyclotomic — on-circle roots present) is detected and flagged `degenerate`; its exact neutral split is a
// follow-up (the auxiliary-polynomial singular handling). Built over our ℤ/ℚ — slow but honest.

import * as Z from "@lenticule-science/metrologic/number/integer";
import * as Q from "@lenticule-science/metrologic/number/rational";

// ── ℤ polynomials (low→high, our integers) ────────────────────────────────────────────────────────────
const znorm = (p) => { let h = p.length - 1; while (h > 0 && Z.isZero(p[h])) h--; return p.slice(0, h + 1); };
const zdeg = (p) => znorm(p).length - 1;
const zadd = (a, b) => {
  const n = a.length > b.length ? a.length : b.length; // host length bookkeeping, not a math value
  return znorm(Array.from({ length: n }, (_, i) => Z.add(a[i] ?? Z.zero, b[i] ?? Z.zero)));
};
const zmul = (a, b) => {
  const r = Array.from({ length: a.length + b.length - 1 }, () => Z.zero);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) r[i + j] = Z.add(r[i + j], Z.multiply(a[i], b[j]));
  return znorm(r);
};
const zscale = (s, p) => p.map((c) => Z.multiply(s, c));
const zpow = (base, k) => { let r = [Z.one]; for (let i = 0; i < k; i++) r = zmul(r, base); return r; };

const ONE_PLUS = [Z.one, Z.one];                 // 1 + w
const ONE_MINUS = [Z.one, Z.negate(Z.one)];      // 1 − w

/**
 * The Cayley/Möbius image q(w) = Σ p[k](1+w)^k(1−w)^{n−k} of an integer polynomial p (low→high). Sends the
 * unit disk to the left half-plane. A degree drop (deg q < deg p) signals a root at z = −1 (on the circle).
 */
export function mobius(p) {
  const a = znorm(p), n = a.length - 1;
  let q = [Z.zero];
  for (let k = 0; k <= n; k++) q = zadd(q, zscale(a[k], zmul(zpow(ONE_PLUS, k), zpow(ONE_MINUS, n - k))));
  return znorm(q);
}

/**
 * The right-half-plane root count of a ℚ polynomial q (low→high), by the Routh array — the even/odd Sturm
 * sequence, whose first-column sign changes are the Cauchy index = #RHP roots. Returns `{ rhp, singular }`;
 * `singular` (a zero in the first column) means a root on the imaginary axis — an on-circle root of p.
 */
export function rightHalfPlaneRoots(q) {
  const d = q.length - 1;
  const c = [...q].reverse(); // high→low
  const rows = [[], []];
  for (let j = 0; 2 * j <= d; j++) rows[0].push(c[2 * j]);
  for (let j = 0; 2 * j + 1 <= d; j++) rows[1].push(c[2 * j + 1]);
  for (let i = 2; i <= d; i++) {
    const a = rows[i - 1], b = rows[i - 2];
    if (!a.length || Q.isZero(a[0])) return { rhp: null, singular: true };
    const row = [];
    for (let j = 0; j + 1 < b.length; j++) {
      const term = Q.subtract(Q.multiply(a[0], b[j + 1]), Q.multiply(b[0], a[j + 1] ?? Q.zero));
      row.push(Q.divide(term, a[0]));
    }
    rows.push(row.length ? row : [Q.zero]);
  }
  const col = rows.map((r) => r[0] ?? Q.zero);
  if (col.some(Q.isZero)) return { rhp: null, singular: true };
  let changes = 0;
  for (let i = 1; i < col.length; i++) if (Q.sign(col[i - 1]) !== Q.sign(col[i])) changes++;
  return { rhp: changes, singular: false };
}

/**
 * Root-location of an integer polynomial p relative to the unit circle: how many roots expand (|z|>1),
 * contract (|z|<1), or sit neutral on the circle (|z|=1). Exact in the non-degenerate case (no roots
 * strictly on the circle other than z = −1). When on-circle roots make the Routh array singular it returns
 * `{ degenerate: true }` (neutral roots present; their exact split is a follow-up).
 * @param {object[]} p an integer polynomial (our integers, low→high)
 * @returns {{ expanding: number|null, contracting: number|null, neutral: number|null, degenerate: boolean }}
 */
export function rootLocation(p) {
  const n = zdeg(p);
  const q = mobius(p);
  const dq = zdeg(q);
  const dropped = n - dq; // roots at z = −1 (on the circle)
  const { rhp, singular } = rightHalfPlaneRoots(q.map(Q.fromInteger));
  if (singular) return { expanding: null, contracting: null, neutral: null, degenerate: true };
  return { expanding: rhp, contracting: dq - rhp, neutral: dropped, degenerate: false };
}

/** Pisot: exactly one expanding root, none neutral on the circle (so all conjugates strictly inside). */
export function isPisot(p) {
  const loc = rootLocation(p);
  return !loc.degenerate && loc.expanding === 1 && loc.neutral === 0;
}
