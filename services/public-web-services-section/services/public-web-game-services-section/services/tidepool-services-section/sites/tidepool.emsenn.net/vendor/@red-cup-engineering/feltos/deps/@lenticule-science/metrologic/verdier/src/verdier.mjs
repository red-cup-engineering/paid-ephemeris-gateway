// verdier.mjs — Verdier duality on substitution settlings, as Anderson–Putnam direct-limit homology.
//
// A substitution settling is presented by its substitution matrix M (n×n, non-negative integer). Its
// cohomology is the Anderson–Putnam direct limit of ℤⁿ under M:
//
//   H¹ (sheaf side)   = colim(ℤⁿ, Mᵀ)      — the direct limit on cochains
//   H₁ (cosheaf side) = colim(ℤⁿ, M)       — the direct limit on chains
//
// VERDIER DUALITY is the statement H¹ ≅ H₁ as ℤ-modules. It holds because M and Mᵀ have the same Smith
// normal form (rank, determinant, invariant factors) — a theorem of integer linear algebra. This module
// computes both sides and checks the isomorphism; the genuine categorical content (the derived
// equivalence of sheaves and cosheaves) stays out of scope and is the family's one real open gap. What
// is computed here is the part that actually classifies: the ℤ-module-level duality.
//
// All linear algebra is exact over OUR integers via number/matrix (charPoly, determinant, smithNormalForm,
// rank). The host-integer matrix is lifted to our ℤ at the public boundary, and the reported det / Smith
// factors / stable determinant are read back to host integers; the math in between is all ours. The only
// remaining host steps are the integer-factorization of the stable determinant μ for the structure label
// (a presentation detail, μ small), and the structure STRING itself.

import * as Z from "@lenticule-science/metrologic/number/integer";
import { transpose, determinant, rank, smithNormalForm } from "@lenticule-science/metrologic/number/matrix";
import { charPolyOver } from "./spectral.mjs";

const liftMat = (M) => M.map((row) => row.map(Z.fromInt));

// trial-division prime factorization of a (small) positive integer, over our ℤ — for the structure label.
// Ascending by construction; returns our integers (the label renders them to host strings at the boundary).
const primeFactors = (x) => {
  const ps = [];
  let m = x, p = Z.fromInt(2);
  while (!Z.isNegative(Z.subtract(m, Z.multiply(p, p)))) { // while p·p ≤ m
    while (Z.divides(p, m)) {
      if (!ps.some((q) => Z.equal(q, p))) ps.push(p);
      m = Z.quotient(m, p);
    }
    p = Z.add(p, Z.one);
  }
  if (!Z.equal(m, Z.one)) ps.push(m); // the remaining prime factor, if any
  return ps;
};

/**
 * The structure of the Anderson–Putnam direct limit colim(ℤⁿ, M), DERIVED (not labelled).
 *
 * In the colimit of ℤⁿ ──×M──▶ ℤⁿ ──×M──▶ ⋯ the structure map ×M becomes an isomorphism, so M acts
 * INVERTIBLY on the limit. Hence the **stable determinant** μ — the product of M's nonzero eigenvalues —
 * acts invertibly, and the colimit is a module over the PID ℤ[1/μ]. It is torsion-free of rank
 *   r = #{nonzero eigenvalues} = n − (multiplicity of the eigenvalue 0),
 * so over that PID it is FREE:  colim(ℤⁿ, M) ≅ ℤ[1/μ]^r,  localized at the primes of μ.
 *
 * Both r and μ are read EXACTLY off the (exact) characteristic polynomial: writing p(λ) = λ^{n−r}·q(λ)
 * with q(0) ≠ 0, the eigenvalue-0 multiplicity is n−r (the trailing zero coefficients) and μ = |q(0)| =
 * |the first nonzero coefficient|. (Unimodular M: μ = 1 ⇒ ℤⁿ; singular M: r < n.)
 *
 * @param {number[][]} M @returns {{ rank: number, det: number, smith: number[], stableDet: number, structure: string }}
 */
export function colimStructure(M) {
  const n = M.length;
  const Mz = liftMat(M);
  const cpZ = charPolyOver(M); // the char-poly as a polynomial of our integers (low→high)
  // The eigenvalue-0 multiplicity is found over our ℤ (Z.isZero); r is a host COUNT of nonzero eigenvalues.
  const j = cpZ.findIndex((x) => !Z.isZero(x)); // multiplicity of the eigenvalue 0 (trailing zeros of p)
  const r = n - j;                              // stable rank = number of nonzero eigenvalues (a count)
  // μ — the stable determinant |product of nonzero eigenvalues| — over our ℤ: = |cpZ[j]|, the first
  // nonzero char-poly coefficient. Only the human-readable label crosses to host strings (Z.toInt).
  const muZ = Z.fromNatural(Z.magnitude(cpZ[j]));
  const structure = Z.equal(muZ, Z.one)
    ? `Z^${r}`                                  // M invertible over ℤ ⇒ colim = ℤ^r
    : `${primeFactors(muZ).map((p) => `Z[1/${Z.toInt(p)}]`).join(" ⊗ ")}^${r}`;
  return {
    rank: r,
    det: Z.toInt(determinant(Mz)),
    smith: smithNormalForm(Mz).map(Z.toInt),
    stableDet: Z.toInt(muZ),
    structure,
  };
}

/**
 * The Verdier dual of a substitution settling: the sheaf-side H¹ = colim(ℤⁿ, Mᵀ), the cosheaf-side
 * H₁ = colim(ℤⁿ, M), and whether the duality holds (the two are isomorphic ℤ-modules — equal rank,
 * determinant, and Smith invariant factors). `holds` is true for every substitution matrix.
 * @param {number[][]} M @returns {{ sheaf: object, cosheaf: object, holds: boolean }}
 */
export function verdierDual(M) {
  const Mt = transpose(liftMat(M)).map((row) => row.map(Z.toInt)); // Mᵀ as a host matrix
  const sheaf = colimStructure(Mt);   // H¹ = colim(ℤⁿ, Mᵀ)
  const cosheaf = colimStructure(M);  // H₁ = colim(ℤⁿ, M)
  const holds =
    sheaf.rank === cosheaf.rank &&
    sheaf.det === cosheaf.det &&
    JSON.stringify(sheaf.smith) === JSON.stringify(cosheaf.smith);
  return { sheaf, cosheaf, holds };
}

/** Whether Verdier duality holds for M — H¹ ≅ H₁ as ℤ-modules. */
export const verdierHolds = (M) => verdierDual(M).holds;

/** The step-n classifying invariant cl-inv⁽ⁿ⁾ ∈ ℤ^rank for a substitution settling — the AP rank. */
export const stepNInvariant = (M) => ({ rank: rank(liftMat(M)), module: colimStructure(M).structure });
