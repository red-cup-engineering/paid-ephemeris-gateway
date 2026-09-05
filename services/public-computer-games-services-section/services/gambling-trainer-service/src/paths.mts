/**
 * `paths` — the counterfactual bankroll-path simulator: given the same seeded offer sequence and
 * the same seeded win/lose outcomes `engine.mts#resolveOutcome` would produce, replay four
 * policies over it and report the resulting balance trajectories.
 *
 * Nothing here is separately stored — every path is *derived*, recomputed on demand from
 * `BankrollState` alone (the same "one source of truth" discipline crucible-service's movelog
 * draws on for its own undo stack). `yours` is the real path the player actually walked (from
 * `state.resolutions`, which only grows via real `commit-stake` intents); `kelly`/`flat`/`allIn`
 * are hypothetical policies replayed independently over `state.offers`, using
 * `engine.mts#resolveOutcome` — the exact same deterministic outcome function `commit-stake`
 * itself uses — so a counterfactual policy's outcome for offer `i` is always the same win/lose
 * result the player's own run would have seen at offer `i`, whether or not the player actually
 * reached it (reroll or an early ruin can make `yours` shorter than the other three paths; see
 * DESIGN.md's honest-weaknesses note on this).
 *
 * `flat` stakes a fixed 5% of *current* balance each offer (asymptotically approaches zero, never
 * truly ruins). `allIn` stakes 100% each offer (the first loss zeroes the balance permanently;
 * once ruined, later offers are skipped — betting further off a zero balance is meaningless, not
 * a new source of randomness). `kelly` stakes the real, uncapped Kelly optimum
 * (`kelly.mts#kellyFraction`) each offer — notably 0 on a negative-edge trap, which is itself a
 * teaching point the chart makes visible: Kelly's own answer to a trap is to decline it.
 */
import { kellyFraction } from './kelly.mts';
import { resolveOutcome, resolveStake } from './engine.mts';
import type { BankrollState, CounterfactualPaths, PathPoint, WagerOfferSpec } from './types.mts';

export const FLAT_FRACTION = 0.05;
export const ALL_IN_FRACTION = 1;

function replayPolicy(
  state: BankrollState,
  fractionFor: (offer: WagerOfferSpec) => number,
): PathPoint[] {
  const points: PathPoint[] = [{ offerIndex: 0, balance: state.startingBalance }];
  let balance = state.startingBalance;
  for (const offer of state.offers) {
    if (balance <= 0) {
      points.push({ offerIndex: offer.index + 1, balance: 0 });
      continue;
    }
    const fraction = fractionFor(offer);
    if (fraction <= 0) {
      // Kelly declines a negative-edge trap (fraction 0) — balance is unchanged, but still
      // rounded for display consistency with every other pushed point (a real bug this comment
      // replaces: an unrounded balance used to leak through on skip points only).
      points.push({ offerIndex: offer.index + 1, balance: round2(balance) });
      continue;
    }
    const outcome = resolveOutcome(state, offer);
    balance = resolveStake(balance, fraction, offer.cost, outcome);
    if (balance < 0.005) balance = 0; // rounding floor — a near-zero balance IS ruined
    points.push({ offerIndex: offer.index + 1, balance: round2(balance) });
  }
  return points;
}

/** The path the player actually walked, from `state.resolutions` alone — real commits only,
 * never a hypothetical. Shorter than the other three paths if the player rerolled offers, is
 * still mid-run, or was ruined before the offer sequence was exhausted. */
function playerPath(state: BankrollState): PathPoint[] {
  const points: PathPoint[] = [{ offerIndex: 0, balance: state.startingBalance }];
  for (const r of state.resolutions) {
    points.push({ offerIndex: r.offerIndex + 1, balance: r.balanceAfter });
  }
  return points;
}

/** Compute all four counterfactual paths for the current `BankrollState`. Pure — calling this
 * twice on the same state returns identical output (`paths.test.mts`'s determinism test). */
export function computePaths(state: BankrollState): CounterfactualPaths {
  return {
    yours: playerPath(state),
    kelly: replayPolicy(state, (offer) => kellyFraction({ probability: offer.probability, cost: offer.cost })),
    flat: replayPolicy(state, () => FLAT_FRACTION),
    allIn: replayPolicy(state, () => ALL_IN_FRACTION),
  };
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
