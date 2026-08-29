// Type declarations for @lenticule-science/metrologic/spectral (the barrel covers every subpath).
//
// The spectral morphisms of a substitution, over our own integers/rationals. A polynomial is a list of
// our integers (number/integer), low→high; the integers themselves are opaque here.

/** A polynomial — coefficients (our integers) low→high. */
export type Poly = unknown[];

// ── inversion — the duality z ↦ 1/z and the self-dual (on-circle) locus ───────────
export function fromInts(ints: number[]): Poly;
export function toInts(p: Poly): number[];
export function degree(p: Poly): number;
export function equal(p: Poly, q: Poly): boolean;
export function reciprocal(p: Poly): Poly;
export function isSelfReciprocal(p: Poly): boolean;
export function resultant(p: Poly, q: Poly): unknown;
export function sharesRoot(p: Poly, q: Poly): boolean;
export function inversionSymmetric(p: Poly): boolean;

// ── location — root-location via the Cayley map + an owned Routh/Sturm count ───────
/** The expanding/contracting/neutral counts (null when on-circle roots make it degenerate). */
export interface RootLocation {
  expanding: number | null;
  contracting: number | null;
  neutral: number | null;
  degenerate: boolean;
}
export function mobius(p: Poly): Poly;
export function rightHalfPlaneRoots(q: unknown[]): { rhp: number | null; singular: boolean };
export function rootLocation(p: Poly): RootLocation;
export function isPisot(p: Poly): boolean;
