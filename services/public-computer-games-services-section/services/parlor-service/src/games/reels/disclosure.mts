/**
 * disclosure.mts — Fair Spin's inversion of the slot-machine genre: everything a real machine
 * hides, computed and shown permanently. `slotDisclosure` is the *only* function anywhere in
 * this game that produces the RTP/hit-odds/expected-loss numbers the face displays, and it
 * computes every one of them fresh, from `data.mts`'s reels and paytable, on every call — there
 * is no second, hand-typed copy of these numbers anywhere for a display layer to drift from.
 * `disclosure.test.mts`'s "no dark patterns" test is the executable form of that claim: it
 * proves the numbers `slotDisclosure` returns move exactly when the underlying reel data moves,
 * which a hardcoded or cached display value could not do.
 *
 * `sessionSummary` is the other half of the honesty inversion: a running comparison of this
 * session's *actual* spin counts and *actual* net return against the *published* (computed,
 * not simulated) figures above — real counts, not an estimate. A session with zero spins
 * reports the published figures alone (nothing to compare against yet) rather than a
 * nonsensical 0/0 in a percentage field.
 */
import { computeSlotRTP } from '@red-cup-engineering/parlor-kernel/odds';
import { symbolHitOdds } from '@red-cup-engineering/parlor-kernel/reels';
import { ruinDisclosure } from '@red-cup-engineering/parlor-kernel/disclosure';
import { REELS, payoutFor, PAYOUT_TABLE, SYMBOLS } from './data.mts';

/**
 * The general computation, parameterized over `reels`/`payoutForFn` rather than closed over
 * this game's fixed machine data — the single place both `slotDisclosure` (the real machine,
 * below) and `disclosure.test.mts` (the "no dark patterns" differential test) call, so a test
 * that varies the reels and confirms the output varies to match is exercising the *exact same
 * code path* the real face's numbers come from, not a parallel reimplementation that could
 * silently diverge from it.
 */
export function computeDisclosure(reels, payoutForFn, bet = 1) {
  if (!(bet > 0)) {
    throw new RangeError(`computeDisclosure: bet must be a positive number (got ${bet})`);
  }
  const { rtp, expectedPayout, combinations } = computeSlotRTP(reels, payoutForFn, bet);
  const hitOddsByReel = reels.map((reel) => symbolHitOdds(reel));
  const expectedLossPer100Spins = 100 * bet * (1 - rtp);
  return { rtp, expectedPayoutPerSpin: expectedPayout, combinations, hitOddsByReel, expectedLossPer100Spins, bet };
}

/** The machine's permanent disclosure panel: computed RTP, expected payout per spin, exact
 *  per-symbol hit odds per reel, and expected loss per 100 spins at a given bet size — every
 *  figure derived from `data.mts` via `computeDisclosure` above (the kernel's exact-enumeration
 *  `computeSlotRTP` and `symbolHitOdds` underneath it), nothing asserted. Takes `bet` because
 *  "expected loss per 100 spins" is necessarily in currency units, not RTP's bet-independent
 *  ratio. This is a thin, zero-logic call into `computeDisclosure(REELS, payoutFor, bet)` — the
 *  entirety of "what does the real machine's data actually say" lives in that one shared call,
 *  never duplicated or overridden here. */
export function slotDisclosure(bet = 1) {
  return { ...computeDisclosure(REELS, payoutFor, bet), paytable: PAYOUT_TABLE, symbols: SYMBOLS };
}

/** The pre-commit ruin disclosure for the next spin, at the current `bankroll`/`bet` — the same
 *  `ruinDisclosure` shape `gambling-trainer-service` shows before its terminal `commit-stake`,
 *  computed here from this spin's own `rtp`-derived loss probability (`1 - rtp` is the
 *  probability the spin returns nothing at all only in the degenerate case where every non-zero
 *  payout is impossible; the real "chance this spin loses the whole stake" is the probability of
 *  landing a `payoutFor` result of exactly `0`, computed directly by walking the same reel
 *  combinations `computeSlotRTP` already enumerates, so this stays exact rather than
 *  approximated from `rtp` alone). */
export function spinRuinDisclosure(bankroll, bet) {
  let zeroCombinations = 0;
  let total = 0;
  for (const a of REELS[0]) {
    for (const b of REELS[1]) {
      for (const c of REELS[2]) {
        total += 1;
        if (payoutFor([a, b, c]) === 0) zeroCombinations += 1;
      }
    }
  }
  const lossProbability = zeroCombinations / total;
  return ruinDisclosure(bankroll, bet, lossProbability);
}

/** A running comparison of this session's real recorded spins against the published figures —
 *  never a resampled or theoretical re-derivation, only arithmetic over `history` (the game's own
 *  `state.history`, one entry per resolved spin: `{ symbols, payout, bet }`). Returns `undefined`
 *  fields for "no spins yet" rather than a divide-by-zero placeholder. */
export function sessionSummary(history, bet = 1) {
  const published = slotDisclosure(bet);
  if (history.length === 0) {
    return { spins: 0, published };
  }

  const totalStaked = history.reduce((sum, h) => sum + h.bet, 0);
  const totalPayout = history.reduce((sum, h) => sum + h.payout, 0);
  const actualRtp = totalPayout / totalStaked;

  const symbolHitCounts = Object.fromEntries(SYMBOLS.map((s) => [s, [0, 0, 0]]));
  for (const spin of history) {
    spin.symbols.forEach((symbol, reelIndex) => {
      symbolHitCounts[symbol][reelIndex] += 1;
    });
  }
  const symbolComparison = SYMBOLS.map((symbol) => ({
    symbol,
    actualHits: symbolHitCounts[symbol],
    actualFrequency: symbolHitCounts[symbol].map((count) => count / history.length),
    publishedOdds: published.hitOddsByReel.map((odds) => odds.get(symbol) ?? 0),
  }));

  return {
    spins: history.length,
    totalStaked,
    totalPayout,
    netResult: totalPayout - totalStaked,
    actualRtp,
    published,
    symbolComparison,
  };
}
