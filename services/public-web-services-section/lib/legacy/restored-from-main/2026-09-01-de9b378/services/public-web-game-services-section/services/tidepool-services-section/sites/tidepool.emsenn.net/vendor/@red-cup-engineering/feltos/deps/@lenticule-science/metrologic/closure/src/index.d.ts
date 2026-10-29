// Type declarations for @lenticule-science/metrologic/closure (the barrel covers every subpath).
//
// The closure ordinal κ as a typed transfinite-iteration morphism. Ordinals and lattices are modelled
// as opaque records; the four-regime classification is the surfaced result.

/** A constructive ordinal notation — zero / succ / limit-with-fundamental-sequence. */
export type Ordinal = Record<string, unknown>;
/** A lattice `{ bottom, leq, join, eq, sup }`. */
export type Lattice = Record<string, unknown>;
/** A monotone, inflationary operator Φ on a lattice. */
export type Operator = (x: any) => any;
export type Regime = "finite" | "scott" | "transfinite" | "aperiodic";

// ── ordinal — constructive ordinal notations ─────────────────────────────────
export function zero(): Ordinal;
export function succ(a: Ordinal): Ordinal;
export function limit(seq: (n: number) => Ordinal, name?: string): Ordinal;
export function isZero(a: Ordinal): boolean;
export function isSucc(a: Ordinal): boolean;
export function isLimit(a: Ordinal): boolean;
export function fin(n: number): Ordinal;
export function plusFin(a: Ordinal, n: number): Ordinal;
export const OMEGA: Ordinal;
export function omegaTimes(k: number): Ordinal;
export const OMEGA_SQ: Ordinal;
export function toFinite(a: Ordinal): number;
export function show(a: Ordinal): string;

// ── iterate — transfinite iteration of a monotone operator ───────────────────
export function approx(L: Lattice, phi: Operator, alpha: Ordinal, memo?: Map<string, any>): any;
export function orbit(L: Lattice, phi: Operator): Iterator<{ stage: number; value: any }>;
export function stabilizingSup(L: Lattice): (seqFn: (n: number) => any) => any;

// ── closure — the closure ordinal κ and the regime it determines ─────────────
export function closureOrdinal(L: Lattice, phi: Operator, opts?: { finite?: number; limits?: number }):
  { kappa: Ordinal | null; value: any; regime: Regime };
export function leastFixedPoint(L: Lattice, phi: Operator, opts?: { finite?: number; limits?: number }): any;
export function regimeOfOrdinal(kappa: Ordinal | null): Regime;

// ── lattices — witnesses of each regime, and the bridge to settle ────────────
export function reachability(nVertices: number, edges: [number, number][], seed?: number[]): { lattice: Lattice; phi: Operator };
export function omegaPlusOne(): { lattice: Lattice; phi: Operator; rank: (a: any) => number };
export function tower(): { lattice: Lattice; phi: Operator };
export function fromBilattice(category: Record<string, unknown>): { lattice: Lattice; phi: Operator; settledValuation: unknown };
