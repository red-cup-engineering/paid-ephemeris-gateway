/**
 * `exploration` — tier 4's mechanic: unlabeled candidate processes with hidden, SEED-FIXED
 * yields (`processYield`, a pure function of `(seed, processId)` — never redrawn per sample, so
 * repeatedly sampling the same process narrows the player's own ESTIMATE without the underlying
 * truth ever moving under them). Cumulative regret is the real, honestly-computed pedagogy
 * number DESIGN.md §1/§4 ask for: `regret(t) = bestTrueYield - yieldOfProcessSampledAtTick(t)`,
 * summed — never flattered when the player's own choice turned out badly, per §4's own promise.
 *
 * "Best known" vs. "best true": regret here is computed against the TRUE best yield (known to
 * this module, not to the player) — the standard bandit-regret definition, and the honest one:
 * a player who never explores and got lucky on their first guess still has zero regret only if
 * their first guess actually was the best process, not merely the one they believed was best.
 */
import { seededFloat } from "./rng.mts";
import type { ExplorationSample, ExplorationState } from "./state.mts";

export const PROCESS_IDS = ["alpha", "beta", "gamma"] as const;
export type ProcessId = (typeof PROCESS_IDS)[number];

/** The hidden, seed-fixed true yield of `processId` under `seed` — deterministic, never redrawn.
 *  Scaled into `[0, 2)` so yields are comparable in size to `attention.mts`'s faculty yields
 *  without ever being literally identical to them (a coincidental equal draw is still possible,
 *  just not privileged). */
export function trueYield(seed: string, processId: ProcessId): number {
  return 2 * seededFloat(seed, PROCESS_IDS.indexOf(processId) + 1000);
}

/** One noisy SAMPLE of `processId` at sample index `k` — jitters around the true yield by a
 *  small, seed-fixed amount so repeated sampling narrows the player's ESTIMATE (the sample mean)
 *  toward `trueYield` without ever handing it to them exactly on the first draw. */
export function sampleOnce(seed: string, processId: ProcessId, k: number): number {
  const jitter = seededFloat(seed, PROCESS_IDS.indexOf(processId) * 100000 + k) - 0.5; // in [-0.5, 0.5)
  return Math.max(0, trueYield(seed, processId) + jitter * 0.4);
}

export function bestTrueYield(seed: string): number {
  return Math.max(...PROCESS_IDS.map((p) => trueYield(seed, p)));
}

export interface SampleResult {
  readonly exploration: ExplorationState;
  readonly observed: number;
}

/** Spend `ticks` samples on `processId`, updating the running estimate and the cumulative regret
 *  against the TRUE best process — honest whether or not `processId` turns out to have been the
 *  right call. */
export function sampleProcess(
  seed: string,
  exploration: ExplorationState,
  processId: ProcessId,
  ticks: number,
): SampleResult {
  if (ticks <= 0) throw new RangeError(`exploration.sampleProcess: ticks must be positive, got ${ticks}`);
  const best = bestTrueYield(seed);
  const prior: ExplorationSample = exploration.samples[processId] ?? { count: 0, totalObserved: 0 };
  let count = prior.count;
  let totalObserved = prior.totalObserved;
  let regretAdded = 0;
  let lastObserved = 0;
  for (let i = 0; i < ticks; i++) {
    const observed = sampleOnce(seed, processId, count);
    totalObserved += observed;
    count += 1;
    regretAdded += Math.max(0, best - observed);
    lastObserved = observed;
  }
  const samples: Record<string, ExplorationSample> = { ...exploration.samples, [processId]: { count, totalObserved } };
  return {
    exploration: {
      samples,
      cumulativeRegret: exploration.cumulativeRegret + regretAdded,
      ticksSpent: exploration.ticksSpent + ticks,
    },
    observed: lastObserved,
  };
}

export function estimatedMean(exploration: ExplorationState, processId: ProcessId): number | null {
  const s = exploration.samples[processId];
  if (s === undefined || s.count === 0) return null;
  return s.totalObserved / s.count;
}
