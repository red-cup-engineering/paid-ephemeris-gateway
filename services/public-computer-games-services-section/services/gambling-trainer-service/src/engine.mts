/**
 * `engine` — the bankroll engine: stake application, ruin detection, and per-wager/per-run
 * grading against the Kelly optimum. This is the pure mechanics module `cartridge.mts` wraps
 * (never rewrites) into the `@red-cup-engineering/cartridge` contract, and the module `disclosure.mts`
 * reads its constants and pure helpers from, so the UI's spend labels can never drift from what
 * actually happens on `commit-stake`.
 *
 * **The binary-contract model, tied directly to `kelly.mts`.** A stake at fraction `f` of the
 * current balance, against an offer priced at `cost` (probability-as-cost, per `odds.mts`),
 * resolves exactly the way `kelly.mts#expectedLogGrowth`'s own formula assumes: win multiplier
 * `1 + f(1-cost)/cost`, loss multiplier `1 - f`. Reusing that exact multiplier shape (rather than
 * inventing a separate payout formula) is what lets `paths.mts` and the grading tests compare a
 * played stake's actual outcome against `kelly.mts`'s own expected-log-growth math with no
 * translation layer between them.
 *
 * **Ruin, defined precisely.** `RUIN_THRESHOLD` (in bankroll units) is the balance below which no
 * further wager is practically stakeable — the run is over. A stake's own `computeRuinProbability`
 * is a *single-step* calculation: given the stake would resolve, does the loss outcome alone put
 * the balance under `RUIN_THRESHOLD`? (Documented simplification — see README's honest
 * weaknesses: this is not a full multi-step gambler's-ruin random-walk probability over the rest
 * of the day, which would require assuming a future staking policy that hasn't been chosen yet.)
 *
 * **HARD ECONOMY LINE.** `balance`/`startingBalance` are a practice bankroll only — no `energy`
 * field appears anywhere in this module or in `manifest.mts` (see `manifest.mts`'s header for
 * why that omission is deliberate, not an oversight). `no-real-currency.test.mts`-style coverage
 * lives inline in `engine.test.mts` and `manifest.test.mts` as a structural, not aspirational,
 * check.
 */
import { makeRng } from './seed.mts';
import { kellyFraction, expectedLogGrowth } from './kelly.mts';
import { dailyOffers, wagerConfigById } from './wagers.mts';
import type {
  BankrollState,
  WagerIntent,
  WagerOfferSpec,
  WagerResolution,
} from './types.mts';

export const STARTING_BALANCE = 1000;
export const RUIN_THRESHOLD = 1;
/** Reroll's named, quantified cost — 2% of current balance. */
export const REROLL_FEE_FRACTION = 0.02;

export interface ApplyResult {
  readonly state: BankrollState;
  readonly events: readonly { readonly kind: string; readonly [key: string]: unknown }[];
}

/** Pure function of `(seed, configId)`: identical arguments produce byte-identical state. Builds
 * the day's offer sequence once (via `wagers.mts`) and seats it on a fresh practice bankroll. */
export function createEngine(seed: string, configId?: string): BankrollState {
  const config = wagerConfigById(configId);
  return {
    seed,
    configId: config.id,
    runNumber: 0,
    offers: dailyOffers(seed, config.id),
    offerIndex: 0,
    pendingStakeFraction: 0,
    startingBalance: STARTING_BALANCE,
    balance: STARTING_BALANCE,
    resolutions: [],
    ruined: false,
    finished: false,
  };
}

/** The offer currently up for a decision, or `undefined` once the sequence (or the run) is
 * finished. A pure query — never mutates, never appears in `resolutions`. */
export function currentOffer(state: BankrollState): WagerOfferSpec | undefined {
  if (state.finished) return undefined;
  return state.offers[state.offerIndex];
}

/** The resolved win/lose outcome for `offers[offerIndex]`, as a pure function of
 * `(seed, configId, offerIndex, probability)` — independent of call order, of whether earlier
 * offers were rerolled, and of how many times `gradeStake` was called first. This is what makes
 * `commit-stake` replayable: the outcome is never "rolled" and stored ad hoc, it is recomputed
 * identically every time from data already in `BankrollState`. */
export function resolveOutcome(state: BankrollState, offer: WagerOfferSpec): 'win' | 'lose' {
  const rng = makeRng(`${state.seed}:outcome:${state.configId}:${state.runNumber}:${offer.index}`);
  return rng.chance(offer.probability) ? 'win' : 'lose';
}

/** Balance after resolving a stake of fraction `f` against `cost`, given the outcome — the one
 * payout formula shared by `applyIntent`'s real `commit-stake` path and `paths.mts`'s
 * counterfactual replays, so the two can never compute different numbers for the same inputs. */
export function resolveStake(balance: number, fraction: number, cost: number, outcome: 'win' | 'lose'): number {
  if (outcome === 'win') return balance * (1 + (fraction * (1 - cost)) / cost);
  return balance * (1 - fraction);
}

/** Named, quantified reroll fee in bankroll units — what the UI shows before the player commits
 * to rerolling ("costs 2% of your practice bankroll (X coins)"). */
export function rerollCost(balance: number): number {
  return round2(balance * REROLL_FEE_FRACTION);
}

/** Single-step ruin probability for a proposed stake — see this module's header for the precise,
 * documented-simplification definition. Pure function of pre-commit values only: `balance` and
 * `offer` come from the current `BankrollState`, `stakeFraction` from the player's pending
 * choice — nothing here requires having already committed, which is exactly the property
 * `disclosure.test.mts`'s "ruin disclosure precedes ruin" test exploits. */
export function computeRuinProbability(balance: number, offer: Pick<WagerOfferSpec, 'probability' | 'cost'>, stakeFraction: number): number {
  if (stakeFraction <= 0) return 0;
  const balanceIfLost = resolveStake(balance, stakeFraction, offer.cost, 'lose');
  return balanceIfLost < RUIN_THRESHOLD ? 1 - offer.probability : 0;
}

export interface StakeGrade {
  readonly kellyOptimalFraction: number;
  readonly playerFraction: number;
  /** Positive: over-staked relative to Kelly. Negative: under-staked. Zero: exactly Kelly. */
  readonly deviation: number;
  readonly trueEdge: number;
  readonly expectedValue: number;
  readonly ruinProbability: number;
}

/** Pure query — "show me the math", never logged as an intent: freely reversible, because
 * nothing about calling this touches `BankrollState`. Grades a *proposed*
 * stake fraction against the real Kelly optimum for the current offer, computed via the vendored
 * `kelly.mts` directly — no silent re-derivation, so this can never drift from what `kelly.mts`
 * itself would say. */
export function gradeStake(state: BankrollState, proposedFraction: number): StakeGrade {
  const offer = currentOffer(state);
  if (offer === undefined) throw new RangeError('gradeStake: no offer is currently on the table');
  const kellyOptimalFraction = kellyFraction({ probability: offer.probability, cost: offer.cost });
  return {
    kellyOptimalFraction,
    playerFraction: proposedFraction,
    deviation: proposedFraction - kellyOptimalFraction,
    trueEdge: offer.probability - offer.cost,
    expectedValue: proposedFraction * (offer.probability - offer.cost),
    ruinProbability: computeRuinProbability(state.balance, offer, proposedFraction),
  };
}

/** Per-run grading summary: how the player's actual sizing tracked the Kelly optimum across
 * every wager they committed this run, plus the expected-log-growth the player's actual choices
 * realized versus what playing exact Kelly would have realized on the same offers (not the same
 * outcomes — see `paths.mts` for the outcome-level counterfactual). */
export interface RunGrade {
  readonly wagersCommitted: number;
  readonly meanAbsoluteDeviation: number;
  readonly meanPlayerExpectedLogGrowth: number;
  readonly meanKellyExpectedLogGrowth: number;
}

export function gradeRun(state: BankrollState): RunGrade {
  const commits = state.resolutions;
  if (commits.length === 0) {
    return { wagersCommitted: 0, meanAbsoluteDeviation: 0, meanPlayerExpectedLogGrowth: 0, meanKellyExpectedLogGrowth: 0 };
  }
  let devSum = 0;
  let playerGrowthSum = 0;
  let kellyGrowthSum = 0;
  for (const r of commits) {
    devSum += Math.abs(r.stakeFraction - r.kellyOptimalFraction);
    playerGrowthSum += expectedLogGrowth({ probability: r.probability, cost: r.cost, fraction: clampBelowOne(r.stakeFraction) });
    kellyGrowthSum += expectedLogGrowth({ probability: r.probability, cost: r.cost, fraction: clampBelowOne(r.kellyOptimalFraction) });
  }
  return {
    wagersCommitted: commits.length,
    meanAbsoluteDeviation: devSum / commits.length,
    meanPlayerExpectedLogGrowth: playerGrowthSum / commits.length,
    meanKellyExpectedLogGrowth: kellyGrowthSum / commits.length,
  };
}

function refused(state: BankrollState, action: string, reason: string): ApplyResult {
  return { state, events: [{ kind: 'action-refused', action, reason }] };
}

/** Pure. Never mutates `state`. See `types.mts`'s `WagerIntent` doc for each kind's meaning, and
 * `disclosure.mts` for how each kind is typed on screen. */
export function applyIntent(state: BankrollState, intent: WagerIntent): ApplyResult {
  switch (intent.kind) {
    case 'adjust-stake': {
      if (state.finished) return refused(state, 'adjust-stake', 'run-finished');
      if (!Number.isFinite(intent.fraction) || intent.fraction < 0 || intent.fraction > 1) {
        throw new RangeError(`adjust-stake: fraction must be in [0, 1], got ${intent.fraction}`);
      }
      return { state: { ...state, pendingStakeFraction: intent.fraction }, events: [{ kind: 'stake-adjusted', fraction: intent.fraction }] };
    }
    case 'reroll-offer': {
      if (state.finished) return refused(state, 'reroll-offer', 'run-finished');
      const offer = currentOffer(state);
      if (offer === undefined) return refused(state, 'reroll-offer', 'no-offer');
      const fee = rerollCost(state.balance);
      if (fee >= state.balance) return refused(state, 'reroll-offer', 'insufficient-balance');
      const balance = state.balance - fee;
      const nextIndex = state.offerIndex + 1;
      const finished = nextIndex >= state.offers.length;
      return {
        state: { ...state, balance, offerIndex: nextIndex, pendingStakeFraction: 0, finished },
        events: [
          { kind: 'offer-rerolled', skipped: offer.id, fee },
          ...(finished ? [{ kind: 'run-finished', reason: 'offers-exhausted' as const }] : []),
        ],
      };
    }
    case 'commit-stake': {
      if (state.finished) return refused(state, 'commit-stake', 'run-finished');
      const offer = currentOffer(state);
      if (offer === undefined) return refused(state, 'commit-stake', 'no-offer');
      const fraction = state.pendingStakeFraction;
      if (fraction <= 0) return refused(state, 'commit-stake', 'zero-stake');
      const outcome = resolveOutcome(state, offer);
      const balanceBefore = state.balance;
      const balanceAfter = round2(resolveStake(balanceBefore, fraction, offer.cost, outcome));
      const kellyOptimalFraction = kellyFraction({ probability: offer.probability, cost: offer.cost });
      const resolution: WagerResolution = {
        offerIndex: offer.index,
        probability: offer.probability,
        cost: offer.cost,
        stakeFraction: fraction,
        outcome,
        balanceBefore,
        balanceAfter,
        kellyOptimalFraction,
      };
      const nextIndex = state.offerIndex + 1;
      const ruined = balanceAfter < RUIN_THRESHOLD;
      const finished = ruined || nextIndex >= state.offers.length;
      const next: BankrollState = {
        ...state,
        balance: ruined ? 0 : balanceAfter,
        offerIndex: nextIndex,
        pendingStakeFraction: 0,
        resolutions: [...state.resolutions, resolution],
        ruined,
        finished,
      };
      const events: { kind: string; [key: string]: unknown }[] = [
        { kind: 'wager-resolved', outcome, balanceAfter: next.balance, offerId: offer.id },
      ];
      if (ruined) events.push({ kind: 'ruin', offerId: offer.id });
      else if (finished) events.push({ kind: 'run-finished', reason: 'offers-exhausted' });
      return { state: next, events };
    }
    case 'new-run': {
      const runNumber = state.runNumber + 1;
      const seed = state.seed;
      const config = wagerConfigById(state.configId);
      const offers = dailyOffers(`${seed}:run${runNumber}`, config.id);
      return {
        state: {
          seed,
          configId: config.id,
          runNumber,
          offers,
          offerIndex: 0,
          pendingStakeFraction: 0,
          startingBalance: STARTING_BALANCE,
          balance: STARTING_BALANCE,
          resolutions: [],
          ruined: false,
          finished: false,
        },
        events: [{ kind: 'run-started', runNumber }],
      };
    }
    default: {
      const never: { kind: string } = intent;
      throw new TypeError(`applyIntent: unknown intent kind "${never.kind}"`);
    }
  }
}

function clampBelowOne(f: number): number {
  return Math.max(0, Math.min(0.999999, f));
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
