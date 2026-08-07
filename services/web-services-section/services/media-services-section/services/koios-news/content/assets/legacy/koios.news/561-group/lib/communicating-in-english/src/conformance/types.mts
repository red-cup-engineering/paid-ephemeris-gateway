





import type { ChargeCarrier } from "@emsenn/relating-experimental";
import type { ArticulateResult } from "@emsenn/communicating/speaking/listening/parsing";
export type Charge = ChargeCarrier;

export type Severity = "suggestion" | "warning" | "error";

/** A linting rule: a predicate over a text span. */
export interface Rule {
  readonly id: string;
  readonly family: string;
  readonly severity: Severity;
  readonly description: string;
  readonly supersedes?: readonly string[];
  readonly abstract?: boolean;
  readonly run: (text: string, context?: RuleContext) => readonly Finding[];
}

/** Optional context a rule may inspect. */
export interface RuleContext {
  readonly sentenceInitial?: boolean;
  readonly inMarkdown?: boolean;
}

/** A single finding produced by a rule run. */
export interface Finding {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly charge: Charge;
  readonly message: string;
  readonly start: number;
  readonly end: number;
  readonly suggest?: string;
}

/** A cell in the detection result: one finding with its source span offset resolved. */
export interface DetectCell {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly charge: Charge;
  readonly message: string;
  readonly start: number;
  readonly end: number;
  readonly suggest?: string;
}

/** The full detection result for a piece of text. */
export interface DetectResult {
  readonly source: string;
  readonly base: ArticulateResult;
  readonly cells: readonly DetectCell[];
  readonly implications: readonly RuleImplication[];
}

/** A predicate-specialization edge: source findings propagate to target. */
export interface RuleImplication {
  readonly source: string;
  readonly target: string;
}

/** A rendered diagnostic: what a consumer sees. */
export interface Diagnostic {
  readonly severity: Severity | "conflict";
  readonly ruleId: string;
  readonly message: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly suggest?: string;
}

/** Document-level verdict. */
export interface Verdict {
  readonly pass: boolean;
  readonly diagnostics: readonly Diagnostic[];
}
