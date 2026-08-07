


import type { ChargeCarrier, ChargeValueName } from "@emsenn/relating-experimental";
export type Charge = ChargeCarrier;



export type Tier = "document" | "block" | "sentence" | "clause" | "word" | "rule";

/** A text span: a tier, its absolute byte offsets (null for synthesized rule-spans), and its text. */
export interface Span {
  readonly tier: Tier;
  readonly start: number | null;
  readonly end: number | null;
  readonly text: string;
}

/** Containment edge: child is nested inside parent in the tier hierarchy. */
export interface ContainmentEdge {
  readonly child: Span;
  readonly parent: Span;
}

/** Sequence edge: span follows prev in reading order within the same tier. */
export interface SequenceEdge {
  readonly span: Span;
  readonly prev: Span;
}

/** The result of articulating a text: the 2-D base of containment + sequence edges. */
export interface ArticulateResult {
  readonly text: string;
  readonly document: Span;
  readonly spans: readonly Span[];
  readonly inside: readonly ContainmentEdge[];
  readonly after: readonly SequenceEdge[];
}



/** A word in a sentence, as seen during construal. */
export interface Word {
  readonly i: number;
  readonly id: string;
  readonly span: Span;
  readonly tags: readonly string[];
  readonly feats: readonly string[];
}

/** A dependency arc proposal (before settling). */
export interface Arc {
  readonly head: string;
  readonly rel: string;
  readonly dependent: string;
  readonly headSpan?: Span;
  readonly depSpan?: Span;
}

/** A kernel cell entry: one (subject, predicate[, object]) triple with its initial charge. */
export interface Entry {
  readonly subject: string;
  readonly predicate: string;
  readonly object?: string;
  readonly charge: Charge;
}

/** A specialization edge on predicates: source ⊢ target (charges propagate upward). */
export interface SpecializationEdge {
  readonly source: string;
  readonly target: string;
}

/** A question posed about a word: what predicate is being asked, on what surface text. */
export interface Question {
  readonly subject: string;
  readonly predicate: string;
  readonly label: string;
  readonly on: string;
}

/** Intermediate result of construing a sentence. */
export interface ConstrainedResult {
  readonly words: readonly Word[];
  readonly arcs: readonly Arc[];
  readonly entries: readonly Entry[];
  readonly specialization: readonly SpecializationEdge[];
  readonly questions: readonly Question[];
}



/** The settled descent API: read charges by address. Unmentioned cells return ⊥. */
export interface DescentResult {
  readonly settledCharge: (subject: string, predicate: string) => Charge;
  readonly settledArc: (head: string, rel: string, dep: string) => Charge;
}



export type ChargeValue = ChargeValueName;
export type ChargeStatus = "decided" | "ambiguous" | "void";

export interface ParsedWord {
  readonly i: number;
  readonly id: string;
  readonly text: string;
  readonly tags: readonly string[];
  readonly feats: readonly string[];
  readonly connected: ChargeStatus;
  readonly roles: readonly string[];
}

export interface ParsedArc {
  readonly rel: string;
  readonly head: string;
  readonly dependent: string;
  readonly headText: string;
  readonly depText: string;
  readonly status: ChargeStatus;
  readonly value: ChargeValue;
}

export interface ParsedAnswer {
  readonly question: string;
  readonly on: string;
  readonly status: ChargeStatus;
  readonly value: ChargeValue;
}

export interface FoldPath {
  readonly head: string;
  readonly path: readonly string[];
  readonly dependent: string;
}

export interface FoldTower {
  readonly folds: number;
  readonly fixedPoint: boolean;
  readonly sizes: readonly number[];
}

export interface ParseResult {
  readonly words: readonly ParsedWord[];
  readonly arcs: readonly ParsedArc[];
  readonly answers: readonly ParsedAnswer[];
  readonly compositions: readonly FoldPath[];
  readonly tower: FoldTower;
  readonly conflicts: readonly ParsedAnswer[];
  readonly voids: readonly ParsedAnswer[];
}




export interface CohomologyObstruction {
  readonly kind: "conflict" | "void";
  readonly label: string;
  readonly on: string;
  readonly value: ChargeValue;
}

export interface CohomologyResult {
  readonly glued: boolean;
  readonly h0: 0 | 1;
  readonly h1: number;
  readonly obstructions: readonly CohomologyObstruction[];
  readonly overdetermined: readonly CohomologyObstruction[];
  readonly underdetermined: readonly CohomologyObstruction[];
}







export type {
  BundleMeta, BundleLexicon, SuffixRule, BundleMorphology,
  PronounFeatures, BundleReference, BundleAttachment, BundleSegmentation,
  RawBundle, CompiledBundle,
} from "../algebra/index.mjs";
