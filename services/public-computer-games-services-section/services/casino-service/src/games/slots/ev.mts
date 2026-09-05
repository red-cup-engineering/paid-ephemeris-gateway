/**
 * slots/ev.mts — the House Math seam, blackjack's own signature move applied to a slot machine:
 * every number this module reports is *computed* from `./rules.mts`'s own data, never a
 * hand-typed constant, so a paytable change can never silently drift out of sync with what the
 * machine's disclosure panel claims.
 *
 * Three genuinely different computation methods are used here, and each figure below is labeled
 * with which one produced it — the honest-disclosure discipline the build brief asks for
 * ("EXACT math... by enumeration where tractable, and where a component is only tractably
 * computed by simulation say so honestly"):
 *
 * 1. **Exact full-grid enumeration** (`@red-cup-engineering/parlor-kernel/paylines
 *    #computeMultiLineSlotRTP`) — `reelRTP`, `combinations`, `scatterTriggerProbability`, and
 *    `scatterCountDistribution` are walked over every one of the reel strip's
 *    `16**5 = 1,048,576` equally-likely stop combinations, exactly, not sampled. This is
 *    genuinely tractable at this reel length (a couple of seconds of enumeration — see
 *    `computeHouseMath`'s own lazy-memoization below, since paying that cost on every HTTP
 *    request would be dishonest in a different way: technically exact, practically unusable).
 * 2. **Exact per-reel odds** (`computeJackpotOdds`) — the jackpot's published odds are the exact
 *    product of five independent per-reel probabilities (`symbolAtRowOdds`), not sampled either;
 *    with the shared strip's single `wild` occurrence this reduces to `(1/16)**5` exactly.
 * 3. **Closed-form analytic compounding, built on (1)'s exact numbers, NOT simulated** — a free-
 *    spin bonus can retrigger indefinitely (in principle), so this module does not simulate a
 *    bonus round to estimate its value. Instead: let `ES` (exact, from the scatter-count
 *    distribution `computeMultiLineSlotRTP` already enumerated) be the expected number of *new*
 *    free spins awarded per free spin played. Because every free spin is an independent draw from
 *    the identical reel set, the expected total number of free spins triggered by one base-game
 *    trigger (branching-process expectation, exact by linearity — no simulation, no Monte Carlo)
 *    is `initialAward / (1 - ES)`. Multiplying that by one free spin's own exact expected payout
 *    (scaled by the free-spin multiplier) gives the bonus's exact expected contribution to RTP.
 *    This is exact GIVEN the stated model (same reel set in the bonus, i.i.d. spins, no additional
 *    house edge inside the bonus beyond the published multiplier) — a genuinely different
 *    guarantee than (1)'s brute-force enumeration, and this module says so rather than blurring
 *    the two together under one "exact" label.
 *
 * The jackpot pool's own rake (config.mts's `DEFAULT_JACKPOT_RAKE_BPS`, taken off every wager
 * before either the paytable or the bonus ever sees it — see `table.mts`) is not part of the
 * reel machine's own math at all; it is a transfer to a shared pool this module has no view into.
 * `effectiveRTPWithJackpotRecycling` is offered purely as an honestly-labeled STEADY-STATE
 * estimate — "if every chip ever raked into the jackpot pool is eventually paid back out to
 * *some* player, in the long run", which is the only way a rake can be said to "return" anything
 * — not a live, per-spin-exact figure the way `reelRTP` is.
 */
import { computeMultiLineSlotRTP, computeJackpotOdds } from '@red-cup-engineering/parlor-kernel/paylines';
import { symbolHitOdds } from '@red-cup-engineering/parlor-kernel/reels';
import { DEFAULT_JACKPOT_RAKE_BPS } from '../../economy/config.mts';
import { freeSpinAwardFor, type SlotsRules } from './rules.mts';

export interface SymbolOdds {
  readonly symbol: string;
  readonly probability: number;
}

export interface ScatterCountOdds {
  readonly count: number;
  readonly probability: number;
}

export interface HouseMath {
  readonly method: {
    readonly reelRTP: 'exact-enumeration';
    readonly jackpotOdds: 'exact-per-reel-product';
    readonly freeSpinContribution: 'exact-closed-form-given-iid-bonus-model';
    readonly effectiveRTPWithJackpotRecycling: 'steady-state-estimate-not-per-spin-exact';
  };
  readonly combinations: number;
  readonly perSymbolOdds: readonly SymbolOdds[];
  readonly scatterTriggerProbability: number;
  readonly scatterCountDistribution: readonly ScatterCountOdds[];
  readonly reelRTP: number;
  readonly expectedFreeSpinsPerTrigger: number;
  readonly freeSpinRTPContribution: number;
  readonly overallRTP: number;
  readonly jackpotRakeBps: number;
  readonly effectiveRTPWithJackpotRecycling: number;
  readonly jackpotOdds: number;
  readonly jackpotOddsOneIn: number;
  readonly expectedLossPer100SpinsAtDefaultBet: number;
}

const cache = new Map<string, HouseMath>();

/**
 * Compute (once per `rules.id` — see the module header on why this is memoized rather than
 * called fresh per request) every published math figure for `rules`. Every number is derived
 * from `rules` itself; nothing here is asserted independently of the reel/paytable data.
 */
export function computeHouseMath(rules: SlotsRules): HouseMath {
  const cached = cache.get(rules.id);
  if (cached !== undefined) return cached;

  const enumerated = computeMultiLineSlotRTP(rules.reels, rules.rows, rules.paylines, rules.paytable, {
    wilds: rules.wilds,
    scatter: rules.scatter,
    scatterPaytable: rules.scatterPaytable,
    betPerLine: 1,
    scatterTriggerCount: rules.scatterTriggerCount,
  });

  const scatterCountDistribution: ScatterCountOdds[] = [...enumerated.scatterCountDistribution.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([count, probability]) => ({ count, probability }));

  // Closed-form free-spin compounding — see method (3) in this file's header.
  let expectedNewFreeSpinsPerSpinPlayed = 0; // ES
  let triggerProbability = 0;
  let expectedInitialAwardGivenTrigger = 0;
  for (const { count, probability } of scatterCountDistribution) {
    if (count < rules.scatterTriggerCount) continue;
    const award = freeSpinAwardFor(rules, count);
    expectedNewFreeSpinsPerSpinPlayed += probability * award;
    expectedInitialAwardGivenTrigger += probability * award;
    triggerProbability += probability;
  }
  expectedInitialAwardGivenTrigger = triggerProbability > 0 ? expectedInitialAwardGivenTrigger / triggerProbability : 0;
  const expectedFreeSpinsPerTrigger =
    expectedNewFreeSpinsPerSpinPlayed < 1 ? expectedInitialAwardGivenTrigger / (1 - expectedNewFreeSpinsPerSpinPlayed) : Infinity;

  // One base spin's own exact expected payout, expressed per unit of total bet (== reelRTP,
  // since `enumerated` was computed at betPerLine=1) — a free spin pays this same rate, scaled by
  // `rules.freeSpinMultiplier`, at zero additional stake.
  const freeSpinRTPContribution = triggerProbability * expectedFreeSpinsPerTrigger * enumerated.rtp * rules.freeSpinMultiplier;
  const overallRTP = enumerated.rtp + freeSpinRTPContribution;

  const rakeFraction = DEFAULT_JACKPOT_RAKE_BPS / 10_000;
  const effectiveRTPWithJackpotRecycling = overallRTP * (1 - rakeFraction) + rakeFraction;

  const jackpotOdds = computeJackpotOdds(rules.reels, rules.rows, rules.jackpotPattern, rules.jackpotSymbol);

  const perSymbolOdds: SymbolOdds[] = [...symbolHitOdds(rules.reels[0] as readonly string[])]
    .sort((a, b) => b[1] - a[1])
    .map(([symbol, probability]) => ({ symbol, probability }));

  const expectedLossPer100SpinsAtDefaultBet =
    (1 - overallRTP) * 100 * (rules.defaultBetPerLine * rules.paylines.length);

  const result: HouseMath = {
    method: {
      reelRTP: 'exact-enumeration',
      jackpotOdds: 'exact-per-reel-product',
      freeSpinContribution: 'exact-closed-form-given-iid-bonus-model',
      effectiveRTPWithJackpotRecycling: 'steady-state-estimate-not-per-spin-exact',
    },
    combinations: enumerated.combinations,
    perSymbolOdds,
    scatterTriggerProbability: enumerated.scatterTriggerProbability ?? 0,
    scatterCountDistribution,
    reelRTP: enumerated.rtp,
    expectedFreeSpinsPerTrigger,
    freeSpinRTPContribution,
    overallRTP,
    jackpotRakeBps: DEFAULT_JACKPOT_RAKE_BPS,
    effectiveRTPWithJackpotRecycling,
    jackpotOdds,
    jackpotOddsOneIn: jackpotOdds > 0 ? Math.round(1 / jackpotOdds) : Infinity,
    expectedLossPer100SpinsAtDefaultBet,
  };
  cache.set(rules.id, result);
  return result;
}
