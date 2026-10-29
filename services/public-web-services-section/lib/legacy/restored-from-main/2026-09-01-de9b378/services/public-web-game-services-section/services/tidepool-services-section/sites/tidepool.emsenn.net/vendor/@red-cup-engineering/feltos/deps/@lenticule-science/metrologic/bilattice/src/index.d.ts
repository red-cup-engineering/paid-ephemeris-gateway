// Type declarations for @lenticule-science/metrologic/bilattice (the barrel covers every subpath).

/** A charge: a four-valued `value` over a lossless `evidence` carrier. */
export interface Charge {
  value: [boolean, boolean];
  evidence: [unknown[], unknown[]];
}

/** A pair of charges, the argument shape of the binary value-operations. */
export interface ChargePair {
  left: Charge;
  right: Charge;
}

// ── charge — the value-algebra ───────────────────────────────────────────────
export function present(charge: Charge): [boolean, boolean];
export function isTop(charge: Charge): boolean;
export function negate(charge: Charge): Charge;
export function conflate(charge: Charge): Charge;
export function joinKnowledge(pair: ChargePair): Charge;
export function meetKnowledge(pair: ChargePair): Charge;
export function joinTruth(pair: ChargePair): Charge;
export function meetTruth(pair: ChargePair): Charge;
export function leqKnowledge(a: Charge, b: Charge): boolean;
export function compareKnowledge(pair: ChargePair): Charge;
export function aggregate(pair: ChargePair): Charge;

// ── descent — the four-regime descent ────────────────────────────────────────
// The descent threads intricate category structures (fibers, presheaves, traces, valuations); they are
// modelled here as opaque records. The named result shapes (sheaf / verdict / cone / etc.) are surfaced.
export type Utterance = [unknown, unknown];
/** A valuation: `{ base, "fiber-algebras": [...] }` with charged cell assignments. */
export type Valuation = Record<string, unknown>;
/** A descent category at some regime (potential / fiber / presheaf+traces / …). */
export type Category = Record<string, unknown>;

export function articulate(thing: Utterance | { apex: unknown[] }): { potential: unknown[] };
export function predicate(category: Category): Category;
export function cohere(category: Category): { saturated: Category; residue: Category };
export function posit(category: Category): { presheaf: Category; traces: Category[] };
export function commutate(category: Category): { saturated: Category; residue: unknown };
export function raiseKnowledge(valuation: Valuation): Valuation;
export function lowerKnowledge(valuation: Valuation): Valuation;
export function raiseTruth(valuation: Valuation): Valuation;
export function lowerTruth(valuation: Valuation): Valuation;
export function possibilizeKnowledge(category: Category): Category;
export function necessitateKnowledge(category: Category): Category;
export function possibilizeTruth(category: Category): Category;
export function necessitateTruth(category: Category): Category;
export function lastValuation(category: Category): Valuation;
export function settle(category: Category): { sheaf: { base: unknown; section: Valuation } };
export function compare(valuation: Valuation): { consistent: Valuation; paraconsistent: Valuation };

// ── cone — the counit/dual cones ─────────────────────────────────────────────
export function brim(category: Category): { cone: { base: unknown; section: Valuation } };
export function adjudicate(category: Category): { verdict: { base: unknown; section: Valuation } };
export function presume(category: Category): { presumption: { base: unknown; section: Valuation } };

// ── void — the void reads and non-finite duals ───────────────────────────────
export interface Edge {
  subject: unknown;
  predicate: unknown;
  object: unknown;
}
export function saturate(cone: { potential: Edge[] }): { potential: Edge[] };
export function transfer(cone: { potential: Edge[] }): { potential: Edge[] };
export function twistor(potential: { potential: Edge[] }): { saturated: { potential: Edge[] }; reopened: { potential: Edge[] }; residue: unknown[][] };
export function precipitate(cone: { apex: unknown[] }): { saturated: { potential: Edge[] }; residue: unknown[][] };
export function estrange(category: Category): { apex: { source: unknown; target: unknown }[] };
export function gap(pair: { least: Valuation; greatest: Valuation }): { apex: unknown[]; evidence: unknown[] };
export function vanish(category: Category): { apex: unknown[]; evidence: unknown[] };
