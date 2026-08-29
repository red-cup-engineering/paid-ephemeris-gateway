// Type declarations for @lenticule-science/metrologic/verdier (the barrel covers every subpath).
//
// Verdier duality on substitution settlings, as computable integer linear algebra over our own numbers
// (@lenticule-science/metrologic/number) and the Pisot test over @lenticule-science/metrologic/spectral. A substitution is a rule
// A → A*; its matrix is the abelianization. Matrices and integers are exact carriers, opaque here.

/** An integer of @lenticule-science/metrologic/number — opaque here. */
export type Int = unknown;
/** A matrix of our integers. */
export type Mat = Int[][];

// ── number/matrix — re-exported integer linear algebra (over our ℤ) ──────────────
export function transpose(M: Mat): Mat;
export function determinant(M: Mat): Int;
export function rank(M: Mat): number;
export function smithNormalForm(M: Mat): Int[];
export function matmul(A: Mat, B: Mat): Mat;
export function matEqual(A: Mat, B: Mat): boolean;

// ── substitution — the morphism σ*: A* → A*, its orbit, and its abelianization ───
type Rule = Record<string, string[]>;
export function substitute(rule: Rule, word: string[]): string[];
export function iterate(rule: Rule, word: string[], n: number): string[];
export function orbit(rule: Rule, seed: string[]): Generator<string[]>;
export function fixedPointClosure(
  rule: Rule,
  seed: string[],
): { lattice: object; phi: (w: any) => any };
export function abelianize(rule: Rule, alphabet: string[]): Mat;

// ── spectral — primitivity and the Pisot test (host-integer matrices in/out) ─────
export function charPoly(M: number[][]): number[];
export function isPrimitive(M: number[][]): boolean;
export function isPisot(M: number[][]): { pisot: boolean; outside: number | null };
export function perronPoly(M: number[][]): number[];
export function perronConvergent(M: number[][], iters?: number): unknown;

// ── verdier — the Anderson–Putnam direct-limit colimit and the sheaf↔cosheaf duality
export interface ColimStructure {
  rank: number;
  det: number;
  smith: number[];
  stableDet: number;
  structure: string;
}
export function colimStructure(M: number[][]): ColimStructure;
export function verdierDual(
  M: number[][],
): { sheaf: ColimStructure; cosheaf: ColimStructure; holds: boolean };
export function verdierHolds(M: number[][]): boolean;
export function stepNInvariant(M: number[][]): { rank: number; module: string };

// ── gauge — the Klein-four value-category gauge on FOUR, and self-duality ─────────
export const FOUR: unknown[];
export const GAUGE: Record<string, Record<string, unknown>>;
export function fixedSet(sigma: string): unknown[];
export function firingPatternSelfDual(labeling: string[], sigma: string): boolean;
export function inducedPermutation(labeling: string[], sigma: string): Mat | null;
export function substitutionRuleSelfDual(
  M: number[][],
  labeling: string[],
  sigma: string,
): { selfDual: boolean; trivial: boolean } | null;
