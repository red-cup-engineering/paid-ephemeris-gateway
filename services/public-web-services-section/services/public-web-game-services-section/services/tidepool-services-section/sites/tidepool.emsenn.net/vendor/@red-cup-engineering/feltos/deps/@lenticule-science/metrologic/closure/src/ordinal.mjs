// ordinal.mjs — constructive ordinal notations.
//
// We cannot enumerate the ordinals, but we can NAME them, and that is all a transfinite iteration needs.
// An ordinal is one of three shapes — the same three the transfinite recursion folds over:
//
//   zero                      — 0
//   succ(α)                   — α + 1
//   limit(seq)                — sup of a FUNDAMENTAL SEQUENCE seq: ℕ → Ord with seq(0) < seq(1) < … ↗ this
//
// A limit carries its fundamental sequence as a function (that is what makes it constructive: ω is "the
// sup of 0,1,2,…", presented as `n ↦ fin(n)`). Every ordinal below ε₀ is expressible this way; ω₁ is NOT
// (it has no countable fundamental sequence) — which is exactly why an ω₁-closure cannot be reached, and
// why the iteration over it never halts. The notation makes that boundary precise rather than hand-waved.

/** 0. */
export const zero = () => ({ kind: "zero" });
/** α + 1. */
export const succ = (a) => ({ kind: "succ", pred: a });
/** The limit of a fundamental sequence `seq: ℕ → Ord` (strictly increasing, sup = this ordinal). */
export const limit = (seq, name) => ({ kind: "limit", seq, name });

export const isZero = (a) => a.kind === "zero";
export const isSucc = (a) => a.kind === "succ";
export const isLimit = (a) => a.kind === "limit";

/** The finite ordinal n = succⁿ(0). */
export const fin = (n) => { let a = zero(); for (let i = 0; i < n; i++) a = succ(a); return a; };

/** α + n (n finite). */
export const plusFin = (a, n) => { let r = a; for (let i = 0; i < n; i++) r = succ(r); return r; };

/** ω = sup(0, 1, 2, …). */
export const OMEGA = limit((n) => fin(n), "ω");

/** ω·k = sup(ω·(k−1) + n)ₙ. (ω·0 = 0, ω·1 = ω.) */
export const omegaTimes = (k) =>
  k <= 0 ? zero() : limit((n) => plusFin(omegaTimes(k - 1), n), k === 1 ? "ω" : `ω·${k}`);

/** ω² = sup(ω·n)ₙ. */
export const OMEGA_SQ = limit((n) => omegaTimes(n), "ω²");

/** The finite value of α if α < ω, else Infinity. */
export const toFinite = (a) => { let n = 0, c = a; while (c.kind === "succ") { n++; c = c.pred; } return c.kind === "zero" ? n : Infinity; };

/**
 * A canonical string for an ordinal notation — used as a memo key and for display. Renders finite n,
 * `<limit-name>`, and `<base>+k` for a successor stack over a limit.
 * @param {object} a @returns {string}
 */
export function show(a) {
  if (a.kind === "zero") return "0";
  if (a.kind === "limit") return a.name ?? "lim";
  let n = 0, c = a;
  while (c.kind === "succ") { n++; c = c.pred; }
  return c.kind === "zero" ? String(n) : `${show(c)}+${n}`;
}
