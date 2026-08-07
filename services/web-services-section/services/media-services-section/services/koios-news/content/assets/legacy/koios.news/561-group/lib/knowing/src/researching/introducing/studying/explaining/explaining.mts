/**
 * explaining — AgentSite → Explanation: a leaf under studying.
 *
 * Third derivative (a leaf). Explaining reads the studied site's settling trace as
 * a PROOF: an ordered chain of derivation steps, each referencing one settling
 * increment (the stage shape it fired at, the cells it added). It does not advance
 * the agency chain; it witnesses that the settlement was reached step by step. The
 * codomain holds the live AgentSite (the trace is never discarded).
 */
import type { SettlingIncrement } from "@emsenn/relating";
import type { KnowingTrace } from "../studying.mjs";

/** One derivation step: a settling increment read as a proof step. */
export interface DerivationStep {
  readonly kind: "knowing.derivation-step";
  readonly stage: string;
  readonly addedCells: number;
  readonly increment: SettlingIncrement;
}

/** The derivation carrier: the studied trace read as a proof. */
export interface Explanation {
  readonly kind: "knowing.explanation";
  readonly trace: KnowingTrace;
  readonly derivation: readonly DerivationStep[];
}

/** explain : KnowingTrace → Explanation. */
export function explaining(trace: KnowingTrace): Explanation {
  const derivation = trace.trace.map((increment) =>
    Object.freeze({
      kind: "knowing.derivation-step" as const,
      stage: increment.source.shape.kind,
      addedCells: increment.added.cells.length,
      increment,
    }),
  );
  return Object.freeze({ kind: "knowing.explanation" as const, trace, derivation: Object.freeze(derivation) });
}
