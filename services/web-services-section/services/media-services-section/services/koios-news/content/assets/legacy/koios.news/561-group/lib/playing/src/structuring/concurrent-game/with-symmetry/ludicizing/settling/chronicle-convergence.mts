/**
 * Chronicle-level convergence — the play read step-by-step.
 *
 * The convergence judgment of `orthogonality.mjs` decides $\mathfrak{D} \perp
 * \mathfrak{E} \Downarrow$ globally (a Daimon collision exists somewhere).  This
 * module *refines* that with a per-step trace: it follows the two dual designs'
 * chronicles (corpus, ludics/chronicle, "plays-along-one-branch") in lockstep
 * down a single $\preceq$-chain, recording each meeting, and reports
 * convergence at the *first* step where the play reaches the Daimon — the
 * give-up move that always converges (design note, "Convergence and divergence
 * of plays": "a Daimon move (which always converges)").
 *
 * The trace orders `interactionReport(d1, d2).meetings` along a chronicle's
 * chain using the locus `prefixes` order (root-first), so each `TraceStep`
 * is one move of the dispute.  Convergence = a `daimonized` step is reached;
 * the witness carries the trace up to and including the Daimon and the
 * converging chronicle; the obstruction carries the trace to the point the
 * play got stuck (the chronicle ran out of shared loci before any Daimon).
 *
 * Nothing here recomputes the interaction: it reuses game-algebra's
 * `interactionReport` (the knowledge-join meetings) and `designChronicles`
 * (the branch decomposition), and refines `convergenceJudgment` of
 * `orthogonality.mjs` — the global verdict is the disjunction over chronicles.
 */
import {
  type Chronicle,
  type Design,
  type DesignAct,
  type Locus,
  type MeetingPoint,
  designChronicles,
  interactionReport,
  locusKey,
  prefixes,
} from "../../index.mjs";
import { type ChargeValue } from "@emsenn/relating";

export interface TraceStep {
  readonly kind: "game.chronicle-convergence.step";
  readonly locus: Locus;
  readonly left: DesignAct;
  readonly right: DesignAct;
  readonly joined: ChargeValue;
  /** True at the give-up move: both commit a polarity and collide into $\top$. */
  readonly daimonized: boolean;
}

const stepOf = (m: MeetingPoint): TraceStep =>
  Object.freeze({
    kind: "game.chronicle-convergence.step" as const,
    locus: m.locus,
    left: m.left,
    right: m.right,
    joined: m.joined,
    daimonized: m.daimonized,
  });

/**
 * Order the meetings of an interaction along one chronicle's chain (root-first,
 * by the `prefixes` order on loci), keeping only the meetings whose locus lies
 * on that chronicle.  This is one branch of the dispute, traced move by move.
 */
function traceAlong(chronicle: Chronicle, meetings: readonly MeetingPoint[]): readonly TraceStep[] {
  const chainKeys = new Set<string>(chronicle.actions.map((a) => locusKey(a.locus)));
  const onChain = meetings.filter((m) => chainKeys.has(locusKey(m.locus)));
  const sorted = [...onChain].sort((a, b) => {
    if (prefixes(a.locus, b.locus)) return -1;
    if (prefixes(b.locus, a.locus)) return 1;
    return locusKey(a.locus).localeCompare(locusKey(b.locus));
  });
  return Object.freeze(sorted.map(stepOf));
}

export interface ChronicleConvergenceWitness {
  readonly kind: "game.chronicle-convergence:witness";
  /** The trace down to and including the converging (Daimon) step. */
  readonly trace: readonly TraceStep[];
  /** The chronicle of `d1` along which convergence was reached. */
  readonly chronicle: Chronicle;
  /** The Daimon step at which the play converged. */
  readonly daimonStep: TraceStep;
}

export interface ChronicleConvergenceObstruction {
  readonly kind: "game.chronicle-convergence-obstruction";
  readonly reason: "no-meeting" | "no-daimon";
  /** The longest trace explored before the play got stuck (empty if they never met). */
  readonly trace: readonly TraceStep[];
}

export type ChronicleConvergenceJudgment =
  | ChronicleConvergenceWitness
  | ChronicleConvergenceObstruction;

/**
 * Convergence read at the chronicle level: follow each chronicle of `d1`
 * against `d2`, tracing meetings step by step, and converge at the first
 * Daimon collision.  Refines `convergenceJudgment` (orthogonality.mjs) with the
 * step-by-step dispute; the global convergence verdict is the existence of at
 * least one converging chronicle.
 */
export function chronicleConvergenceJudgment(d1: Design, d2: Design): ChronicleConvergenceJudgment {
  const report = interactionReport(d1, d2);
  const chronicles = designChronicles(d1);

  let bestTrace: readonly TraceStep[] = [];
  let sawMeeting = report.meetings.length > 0;

  for (const c of chronicles) {
    const trace = traceAlong(c, report.meetings);
    if (trace.length > 0) sawMeeting = true;
    const daimonIndex = trace.findIndex((s) => s.daimonized);
    if (daimonIndex >= 0) {
      const daimonStep = trace[daimonIndex] as TraceStep;
      return Object.freeze({
        kind: "game.chronicle-convergence:witness" as const,
        trace: Object.freeze(trace.slice(0, daimonIndex + 1)),
        chronicle: c,
        daimonStep,
      });
    }
    if (trace.length > bestTrace.length) bestTrace = trace;
  }

  return Object.freeze({
    kind: "game.chronicle-convergence-obstruction" as const,
    reason: (sawMeeting ? "no-daimon" : "no-meeting") as "no-meeting" | "no-daimon",
    trace: bestTrace,
  });
}

/** Whether the interaction converges, read chronicle-by-chronicle (some chronicle reaches a Daimon). */
export const convergesByChronicle = (d1: Design, d2: Design): boolean =>
  chronicleConvergenceJudgment(d1, d2).kind === "game.chronicle-convergence:witness";

/** The full step-by-step trace of the play along the chronicle that converges, or the longest explored. */
export function convergenceTrace(d1: Design, d2: Design): readonly TraceStep[] {
  return chronicleConvergenceJudgment(d1, d2).trace;
}
