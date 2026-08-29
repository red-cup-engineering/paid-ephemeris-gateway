// closure.mjs — the closure ordinal κ as a morphism, and the regime it determines.
//
// The CLOSURE ORDINAL of (L, Φ) is the least α with F(α+1) = F(α): the stage at which the iteration
// reaches its least fixed point, lfp(Φ). `closureOrdinal` is the morphism that finds it — walking the
// ordinals 0, 1, 2, …, ω, ω+1, …, ω·2, … and testing idempotence at each.
//
// It is HONEST about the boundary. A search to a notation bound either returns κ (with its regime) or
// reports that no fixed point was found below the bound — which, when the closure really is aperiodic
// (κ ≥ ω₁, an ordinal with no countable notation), is what *must* happen: there is no κ to return, and an
// unbounded search would never halt. We do not pretend to decide the undecidable; we expose exactly where
// the iteration would run forever, and let the caller choose how far to look.
//
// REGIME, read off κ — the four-regime dichotomy as a property of where the closure stabilizes:
//   finite      κ < ω         strict / finite
//   scott       κ = ω         Scott-continuous (the ω-limit is already fixed)
//   transfinite ω < κ < ω₁    a non-Scott-continuous firing pushes κ past ω, but it is still countable
//   aperiodic   κ ≥ ω₁        no countable κ — the search never finds one (witnessed, not asserted)

import { zero, succ, fin, omegaTimes, OMEGA_SQ, plusFin, show, toFinite } from "./ordinal.mjs";
import { approx } from "./iterate.mjs";

/** The regime named by a closure ordinal κ (or by its absence). Classified by the SHAPE of κ, not its name. */
export function regimeOfOrdinal(kappa) {
  if (kappa === null) return "aperiodic"; // no countable fixed point found — κ ≥ ω₁
  if (toFinite(kappa) < Infinity) return "finite"; // κ < ω
  // κ = ω iff it is a limit whose fundamental sequence is the finite ordinals.
  if (kappa.kind === "limit" && toFinite(kappa.seq(2)) < Infinity) return "scott"; // κ = ω
  return "transfinite"; // ω < κ < ω₁
}

/**
 * The closure ordinal κ of (L, Φ): the least α (in canonical order) with F(α+1) = F(α). Searches the
 * finite ordinals, then ω-blocks ω·k + i, up to ω·`limits` (and ω²). Returns `{ kappa, value, regime }`
 * with the least fixed point `value = F(κ)`; or `{ kappa: null, … , regime: "aperiodic" }` if none is
 * found within the bound (the closure has not stabilized by any searched ordinal — provisionally, or
 * genuinely, aperiodic).
 * @param {object} L a lattice @param {(x:any)=>any} phi a monotone inflationary operator
 * @param {{ finite?: number, limits?: number }} [opts]
 */
export function closureOrdinal(L, phi, { finite = 64, limits = 4 } = {}) {
  const memo = new Map();
  const at = (a) => approx(L, phi, a, memo);
  const fixedAt = (a) => L.eq(at(succ(a)), at(a)); // F(α+1) = F(α)

  // the ordinals to test, in order: 0,1,…  then ω,ω+1,…  then ω·2,…  …up to ω·limits, then ω².
  const blocks = [zero(), ...Array.from({ length: limits }, (_, k) => omegaTimes(k + 1))];
  for (const base of blocks) {
    if (base.kind === "limit" && fixedAt(base)) {
      return { kappa: base, value: at(base), regime: regimeOfOrdinal(base) };
    }
    for (let i = 0; i < finite; i++) {
      const a = base.kind === "zero" ? fin(i) : plusFin(base, i);
      if (fixedAt(a)) return { kappa: a, value: at(a), regime: regimeOfOrdinal(a) };
    }
  }
  if (fixedAt(OMEGA_SQ)) return { kappa: OMEGA_SQ, value: at(OMEGA_SQ), regime: "transfinite" };
  return { kappa: null, value: at(omegaTimes(limits + 1)), regime: "aperiodic" };
}

/** The least fixed point lfp(Φ) = F(κ), or the best approximant found if the closure is (provisionally) aperiodic. */
export const leastFixedPoint = (L, phi, opts) => closureOrdinal(L, phi, opts).value;
