


import type { ChargeCarrier, Mark } from "@emsenn/relating-experimental";
export type Charge = ChargeCarrier;

/** A thematic role frame: the semantic input to realization. */
export interface RoleFrame {
  readonly verb: string;
  readonly agent?: string;
  readonly patient?: string;
  readonly instrument?: string;
  readonly recipient?: string;
  readonly location?: string;
  readonly obliques?: readonly ObliquePP[];
}

/** A prepositional phrase oblique argument. */
export interface ObliquePP {
  readonly prep: string;
  readonly object: string;
}

/** Specification for realizing a clause. */
export interface ClauseSpec {
  readonly subject: string;
  readonly verb: string;
  readonly object?: string;
  readonly negated?: boolean;
  readonly tense?: "past" | "present" | "future";
  readonly obliques?: readonly ObliquePP[];
  readonly charge?: Charge;
}

/** The result of realizing a clause. */
export interface RealizationResult {
  readonly text: string;
  readonly tokens: readonly string[];
  readonly charge?: Charge;
}

/** A text plan: a sequence of clauses to realize, with discourse connectives. */
export interface TextPlan {
  readonly clauses: readonly ClauseSpec[];
  readonly connectives?: Readonly<Record<number, string>>;
}

/** A settled predication cell over one section subject. */
export interface SectionCell {
  readonly predicate: string;
  readonly object?: string | null;
  readonly charge: Charge;
  readonly tense?: ClauseSpec["tense"];
  readonly obliques?: readonly ObliquePP[];
}

/** A settled section: one subject and its charged cells. */
export interface SectionSpec {
  readonly subject: string | null;
  readonly cells: readonly SectionCell[];
  readonly source?: unknown;
}

export interface SectionClause {
  readonly cell: SectionCell;
  readonly regime: "affirmed" | "denied" | "void" | "contradicted";
  readonly text: string;
}

export interface SectionDrop {
  readonly cell: SectionCell;
  readonly reason: "void" | "missing-subject" | "missing-predicate";
}

export interface SectionAudit {
  readonly cell: SectionCell;
  readonly default: string;
  readonly witnesses: {
    readonly positive: readonly Mark[];
    readonly negative: readonly Mark[];
  };
}

export interface SectionRealization {
  readonly prose: string;
  readonly clauses: readonly SectionClause[];
  readonly dropped: readonly SectionDrop[];
  readonly audit: readonly SectionAudit[];
  readonly why: (index: number) => SectionAudit | null;
}

export interface CorpusAssertion {
  readonly id: string;
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
  readonly charge: Charge;
  readonly witness?: unknown;
}

export interface Corpus {
  readonly assertions: readonly CorpusAssertion[];
}

export interface SettledToken {
  readonly token: string | null;
  readonly charge: Charge;
  readonly regime: "affirmed" | "denied" | "void" | "contradicted";
  readonly reason?: "unseen" | "contested";
}

export interface SettlingModel {
  readonly corpus: Corpus;
  readonly assertions: readonly CorpusAssertion[];
  readonly ingest: (text: string, witness?: unknown) => SettlingModel;
  readonly predict: (context: string) => readonly SettledToken[];
  readonly settle: (context: string) => SettledToken;
  readonly generate: (seed: string, opts?: { limit?: number }) => string;
  readonly realizeContinuation: (
    subject: string,
    predicate: string,
    context: string,
  ) => SectionRealization & { readonly settled: SettledToken; readonly contested: boolean };
}
