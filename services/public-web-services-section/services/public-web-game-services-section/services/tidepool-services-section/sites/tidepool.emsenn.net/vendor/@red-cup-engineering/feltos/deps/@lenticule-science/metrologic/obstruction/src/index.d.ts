// Type declarations for @lenticule-science/metrologic/obstruction (the barrel covers every subpath).
//
// The temporal firing cohomology of settlings. A settling carries arbitrary data in its cells; the
// reading is finite ℤ-linear and data-agnostic, so cells are typed as `unknown`.

/** A stage of a settling: the cumulative cells designated through it, and whether it is a limit ordinal. */
export interface Stage {
  designated: unknown[];
  limit: boolean;
}

/** A settling: a monotone sequence of stages, optionally declared ω₁-cofinal (the aperiodic regime). */
export interface Settling {
  stages: Stage[];
  cofinal?: string;
}

/** An increment Δ⁺_τ at one stage — the cells newly designated there. */
export interface Increment {
  stage: number;
  limit: boolean;
  added: unknown[];
}

/** A cohomology generator — a cell first designated at a given (limit) stage. */
export interface Generator {
  stage: number;
  cell: unknown;
}

/** The H¹ reading: its generators, rank, degree, and whether it vanishes. */
export interface H1 {
  generators: Generator[];
  rank: number;
  degree: 1;
  vanishes: boolean;
}

/** The four-regime static classification of a settling. */
export interface Classification {
  depth: number;
  regime: "finite" | "scott" | "transfinite" | "aperiodic";
}

// ── settling — the temporal firing cohomology (pure) ─────────────────────────
export function settling(
  stages: Array<{ designated: unknown[]; limit?: boolean }>,
  opts?: { cofinal?: "uncountable" },
): Settling;
export function increments(v: Settling): Increment[];
export function firings(v: Settling): Increment[];
export function nscFirings(v: Settling): Increment[];
export function h1(v: Settling): H1;
export function clInv(v: Settling): string;
export function mldEquivalent(a: Settling, b: Settling): boolean;
export function classify(v: Settling): Classification;
export function depth(v: Settling): number;

// ── floor — the bridge to the bilattice floor, and the void-dual read ────────
export function designatedCells(valuation: Record<string, unknown>): unknown[];
export function settlingOf(category: Record<string, unknown>): Settling;
export function voidCone(category: Record<string, unknown>): { apex: unknown[]; evidence: unknown[] };
export function gradedVoid(v: Settling): { lost: Generator[]; rank: number };
export function apexVoidMatch(v: Settling): boolean;

// ── cochain — the cellular cohomology of the settled relation (combinatorial) ─
export interface Cell { subject: unknown; predicate: unknown; object: unknown; }
export function cohomologyOfRelation(cells: Cell[]): {
  entities: string[];
  cells: Cell[];
  d0: number[][];
  H0: { rank: number; cocycles: number[][] };
  H1: { rank: number; vanishes: boolean };
};
export function settledRelation(category: Record<string, unknown>): Cell[];
export function cohomologyOf(utterance: [unknown, unknown]): ReturnType<typeof cohomologyOfRelation>;
