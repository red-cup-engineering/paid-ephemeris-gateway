// iterate.mjs — transfinite iteration of a monotone operator: the closure morphism itself.
//
// A CLOSURE is a pair (L, Φ): a lattice L and a monotone, inflationary operator Φ on it (x ≤ Φx — the
// closure only ever adds). Its ordinal-indexed approximation sequence is the Knaster–Tarski / Kleene
// iteration toward the least fixed point:
//
//   F(0)      = ⊥
//   F(α+1)    = Φ(F(α))
//   F(λ)      = ⋁_{β<λ} F(β)        (the sup of the chain, at a limit ordinal λ)
//
// `approx(L, Φ, α)` is exactly this, as a fold over the ordinal notation α (zero / succ / limit). It is a
// TOTAL morphism on every notation whose limit-sups L can compute — finite α, ω, ω+1, ω·2, … all evaluate.
// The mathematics that can fail to halt lives in ONE place, `L.sup` (computing the sup of an ω-chain):
// for a finite or eventually-stable lattice it terminates; for a chain that genuinely grows forever it
// runs forever — and that non-termination IS the content (the closure ordinal is past ω). The morphism is
// correct either way; halting is a fact about (L, Φ), not a defect of `approx`.
//
// A LATTICE is `{ bottom, leq(a,b), join(a,b), eq(a,b), sup(seqFn) }`:
//   • bottom : ⊥
//   • leq    : the partial order ≤
//   • join   : binary sup a ∨ b
//   • eq     : a = b  (≡ leq both ways)
//   • sup    : the sup of a directed ω-chain, given as `seqFn: ℕ → L` with seqFn(0) ≤ seqFn(1) ≤ ⋯
// An OPERATOR is `Φ: L → L`, monotone and inflationary.

import { show } from "./ordinal.mjs";

/**
 * The transfinite approximant F(α) of the closure (L, Φ) — the fold of Φ over the ordinal notation α.
 * Memoized by the canonical name of each sub-ordinal, so a limit's fundamental sequence reuses work.
 * @param {object} L a lattice @param {(x:any)=>any} phi a monotone inflationary operator @param {object} alpha an ordinal notation
 * @param {Map<string,any>} [memo] @returns {any} F(α)
 */
export function approx(L, phi, alpha, memo = new Map()) {
  const key = show(alpha);
  if (memo.has(key)) return memo.get(key);
  let v;
  if (alpha.kind === "zero") v = L.bottom;
  else if (alpha.kind === "succ") v = phi(approx(L, phi, alpha.pred, memo));
  else v = L.sup((n) => approx(L, phi, alpha.seq(n), memo)); // limit: sup of the fundamental sequence
  memo.set(key, v);
  return v;
}

/**
 * The lazy successor orbit F(0), F(1), F(2), … — the directly runnable ω-part of the closure, as an
 * iterator of `{ stage, value }`. This is the part you can `for…of` and watch; it is infinite exactly
 * when the closure does not stabilize below ω. (The transfinite stages past ω are reached via `approx`.)
 * @param {object} L @param {(x:any)=>any} phi @yields {{ stage: number, value: any }}
 */
export function* orbit(L, phi) {
  let v = L.bottom, stage = 0;
  yield { stage, value: v };
  for (;;) {
    v = phi(v);
    yield { stage: ++stage, value: v };
  }
}

/**
 * A default `sup` for lattices whose ω-chains STABILIZE (eventually constant): step the chain until two
 * successive values are equal, then return it. Terminates iff the chain stabilizes; if it never does, it
 * runs forever — the honest behavior for a non-Scott-continuous-at-this-limit closure.
 * @param {object} L a lattice with `eq` @returns {(seqFn:(n:number)=>any)=>any}
 */
export const stabilizingSup = (L) => (seqFn) => {
  let prev = seqFn(0);
  for (let n = 1; ; n++) {
    const cur = seqFn(n);
    if (L.eq(cur, prev)) return cur;
    prev = cur;
  }
};
