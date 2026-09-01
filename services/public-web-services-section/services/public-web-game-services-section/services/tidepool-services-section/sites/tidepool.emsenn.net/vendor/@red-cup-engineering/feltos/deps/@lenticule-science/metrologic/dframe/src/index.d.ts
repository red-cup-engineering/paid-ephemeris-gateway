// Type declarations for @lenticule-science/metrologic/dframe (the barrel covers every subpath).
//
// The d-frame-valued (bigraded) cohomology of a substitution settling, and the composed-duality
// (strong-MLD) orbit classification, on @lenticule-science/metrologic/{chu,number,verdier}. A firing value is a
// bilattice value (a string label "t"/"f"/"top"/"bot" or a FOUR carrier); the values are opaque here.

export type FiringType = "truth-only" | "falsity-only" | "top-firing" | "bot-firing";

/** Each bilattice value's (L₊, L₋) contribution, read off the floor's charge. */
export const SIDE_CONTRIBUTION: Record<string, [boolean, boolean]>;

export function classifyFiring(value: unknown): FiringType;

export interface PerFiring {
  value: unknown;
  firingType: FiringType;
  lPlus: number;
  lMinus: number;
  consistency: "fails-on-singleton-pair" | "trivial";
}
export function perFiringDframe(values: unknown[]): PerFiring[];

export interface DframeCohomology {
  values: unknown[];
  perFiring: PerFiring[];
  firingCounts: Record<FiringType, number>;
  abRank: number;
  singular: boolean;
  shadow: { truthSide: string; falsitySide: string; lPlus: number; lMinus: number };
  shadowMatchesAbRank: boolean;
}
export function dframeCohomology(M: number[][], values: unknown[]): DframeCohomology;

// ── orbits — the composed-duality (strong-MLD) orbit type ────────────────────────
export interface OrbitType {
  firingCounts: Record<string, number>;
  orbitType: string;
  orbitSize: number | "variable";
  selfDual: boolean;
  negated: unknown[];
}
export function classifyOrbitType(values: string[]): OrbitType;
export function verifyComposedSelfDuality(
  values: string[],
): { composed: boolean; everySymmetric: boolean; negationFixed: boolean; agree: boolean };
