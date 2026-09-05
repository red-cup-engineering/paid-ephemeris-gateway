/**
 * `calibration` — tier 7's mechanic: predict another agent's next order, confidence-weighted, and
 * score the prediction with a real proper scoring rule — the Brier score,
 * `(confidence - outcome)^2` — rather than a binary right/wrong. A proper scoring rule is the
 * pedagogy: it is minimized in EXPECTATION exactly by reporting your true belief, so the mini-game
 * cannot be gamed by always hedging at 0.5 (that scores exactly 0.25 every time — better than a
 * confident WRONG guess, worse than a confident RIGHT one, which is the whole lesson DESIGN.md §4
 * asks this mechanic to teach: "cannot be gamed by always saying 50%").
 *
 * **Why each round resolves against a fresh outcome.** `trueOutcome(seed, agentId, round)` is keyed
 * by `round` — the number of predictions already scored — so a player cannot retry the identical
 * question for a better score; every submitted prediction burns its round number permanently,
 * exactly the way `exploration.mts`'s seed-fixed-but-never-redrawn yields keep that tier's own
 * numbers honest.
 */
import { seededFloat } from "./rng.mts";
import { computed, type Tagged } from "./provenance.mts";
import type { CalibrationState } from "./state.mts";

export const AGENT_IDS = ["north-yard", "dock-3", "siding-7"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

/** The hidden, seed-fixed TRUE outcome of one prediction round for one agent: `true` ("the agent
 *  places the larger order") iff the seeded draw lands at or above one-half. Deterministic, never
 *  redrawn for a given `(seed, agentId, round)` triple — but `round` always advances by one on
 *  every real submission (`submitPrediction`), so the SAME question is never askable twice. */
export function trueOutcome(seed: string, agentId: AgentId, round: number): boolean {
  return seededFloat(`${seed}:calibration:${agentId}`, round) >= 0.5;
}

/** The Brier score itself: squared error between the confidence given (a probability the outcome
 *  is `true`, in `[0, 1]`) and the outcome as `0`/`1`. `0` is a perfect prediction; `1` is a
 *  maximally confident, maximally wrong one. */
export function brierScore(confidence: number, outcome: boolean): number {
  if (confidence < 0 || confidence > 1) {
    throw new RangeError(`calibration.brierScore: confidence must be in [0, 1], got ${String(confidence)}`);
  }
  const o = outcome ? 1 : 0;
  return (confidence - o) ** 2;
}

export interface PredictionResult {
  readonly calibration: CalibrationState;
  readonly outcome: boolean;
  readonly score: number;
}

/** Submit one confidence-weighted prediction for `agentId`, resolve it immediately against the
 *  next fresh round's true outcome, and append the score to `brierHistory`. */
export function submitPrediction(
  seed: string,
  calibration: CalibrationState,
  agentId: AgentId,
  confidence: number,
): PredictionResult {
  const round = calibration.brierHistory.length;
  const outcome = trueOutcome(seed, agentId, round);
  const score = brierScore(confidence, outcome);
  return {
    calibration: { pending: null, brierHistory: [...calibration.brierHistory, score] },
    outcome,
    score,
  };
}

/** Mean Brier score across every scored prediction so far — the honest calibration readout: a
 *  player who always guesses `0.5` converges to exactly `0.25`, never lower, which is the number
 *  DESIGN.md §4 promises "cannot be gamed by always saying 50%" made checkable. */
export function averageBrier(calibration: CalibrationState): Tagged<number> | null {
  if (calibration.brierHistory.length === 0) return null;
  const avg = calibration.brierHistory.reduce((s, x) => s + x, 0) / calibration.brierHistory.length;
  return computed(avg, `mean Brier score over ${String(calibration.brierHistory.length)} scored prediction(s)`);
}
