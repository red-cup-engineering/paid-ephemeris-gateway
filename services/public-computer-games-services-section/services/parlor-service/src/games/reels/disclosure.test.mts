import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReels, symbolHitOdds } from '@red-cup-engineering/parlor-kernel/reels';
import { computeSlotRTP as computeSlotRTPDirect } from '@red-cup-engineering/parlor-kernel/odds';
import { REELS, payoutFor, PAYOUT_TABLE } from './data.mts';
import { computeDisclosure, slotDisclosure, spinRuinDisclosure, sessionSummary } from './disclosure.mts';

// ── No dark patterns: the executable proof ──────────────────────────────────────────────────
// The claim under test: no code path in this game can display an odds figure that differs from
// what the kernel's own exact enumeration computes over the machine's real data. This is proven
// two ways below, not one: (1) a direct differential test — feeding computeDisclosure two
// DIFFERENT reel configurations and confirming the output changes to match, which a hardcoded or
// cached number could not do; (2) a structural-identity test — confirming slotDisclosure() (the
// function the real face calls) produces numbers field-for-field equal to an independent,
// from-scratch call to the kernel's own computeSlotRTP/symbolHitOdds over the exact same data,
// so there is no second, hand-typed constant anywhere for the display to have drifted from.

test('no dark patterns (1/2): computeDisclosure output changes when the underlying reel data changes', () => {
  const stingyReels = createReels([
    ['blank', 'blank', 'blank', 'blank', 'cherry'],
    ['blank', 'blank', 'blank', 'blank', 'cherry'],
    ['blank', 'blank', 'blank', 'blank', 'cherry'],
  ]);
  const generousReels = createReels([
    ['cherry', 'cherry', 'cherry', 'cherry', 'blank'],
    ['cherry', 'cherry', 'cherry', 'cherry', 'blank'],
    ['cherry', 'cherry', 'cherry', 'cherry', 'blank'],
  ]);
  const payout = ([a, b, c]) => (a === 'cherry' && b === 'cherry' && c === 'cherry' ? 10 : 0);

  const stingy = computeDisclosure(stingyReels, payout, 1);
  const generous = computeDisclosure(generousReels, payout, 1);

  assert.ok(generous.rtp > stingy.rtp, 'a reel set stacked with the winning symbol must show a higher computed RTP');
  assert.ok(generous.expectedLossPer100Spins < stingy.expectedLossPer100Spins);
  // Exact values, both hand-derivable: stingy has cherry at 1/5 per reel -> P(3 cherries) =
  // (1/5)^3 = 1/125, payout 10 -> RTP = 10/125 = 0.08. Generous has cherry at 4/5 per reel ->
  // P = (4/5)^3 = 64/125, RTP = 640/125 = 5.12.
  assert.ok(Math.abs(stingy.rtp - 0.08) < 1e-12, `stingy.rtp should be exactly 0.08, got ${stingy.rtp}`);
  assert.ok(Math.abs(generous.rtp - 5.12) < 1e-12, `generous.rtp should be exactly 5.12, got ${generous.rtp}`);
});

test('no dark patterns (2/2): slotDisclosure() is field-for-field identical to an independent, fresh call to the kernel over the same real data', () => {
  const bet = 3; // a non-default bet, so this cannot pass by coincidentally matching a cached bet=1 value
  const displayed = slotDisclosure(bet);

  // Recomputed here, independently, calling the kernel directly rather than this game's own
  // computeDisclosure — if slotDisclosure ever grew a second, divergent code path (a hardcoded
  // "look more generous" override, a stale cached figure), this recomputation would not follow it.
  const direct = computeSlotRTPDirect(REELS, payoutFor, bet);
  assert.equal(displayed.rtp, direct.rtp);
  assert.equal(displayed.expectedPayoutPerSpin, direct.expectedPayout);
  assert.equal(displayed.combinations, direct.combinations);
  assert.equal(displayed.expectedLossPer100Spins, 100 * bet * (1 - direct.rtp));

  const directHitOdds = REELS.map((reel) => symbolHitOdds(reel));
  assert.deepEqual(displayed.hitOddsByReel, directHitOdds);
});

test('slotDisclosure rejects a non-positive bet rather than silently displaying odds for a nonsensical stake', () => {
  assert.throws(() => slotDisclosure(0), RangeError);
  assert.throws(() => slotDisclosure(-1), RangeError);
});

test('the published RTP is a real number strictly between 0 and 1 (a realistic, honest machine, not a strawman)', () => {
  const { rtp } = slotDisclosure(1);
  assert.ok(rtp > 0 && rtp < 1, `rtp should be in (0, 1), got ${rtp}`);
  // The exact figure this machine's data actually produces (887 -> now the tuned paytable),
  // pinned so a silent change to data.mts's reels or paytable fails this test rather than
  // drifting the number the README quotes out from under it.
  assert.ok(Math.abs(rtp - 0.9137731481481481) < 1e-12, `rtp should be exactly 0.9137731481481481, got ${rtp}`);
});

test('every PAYOUT_TABLE rule is honored by payoutFor on a hand-built triggering combination', () => {
  assert.equal(payoutFor(['seven', 'seven', 'seven']), 100);
  assert.equal(payoutFor(['star', 'star', 'star']), 75);
  assert.equal(payoutFor(['bell', 'bell', 'bell']), 10);
  assert.equal(payoutFor(['lemon', 'lemon', 'lemon']), 5);
  assert.equal(payoutFor(['cherry', 'cherry', 'cherry']), 3);
  assert.equal(payoutFor(['cherry', 'cherry', 'lemon']), 2);
  assert.equal(payoutFor(['bell', 'lemon', 'star']), 0);
  // PAYOUT_TABLE itself should have exactly one row per distinct nonzero payoutFor branch.
  assert.equal(PAYOUT_TABLE.length, 6);
});

test('spinRuinDisclosure reports a real, computed loss probability (P(payout = 0) over the exact reel combinations)', () => {
  const disclosure = spinRuinDisclosure(5, 5); // stake equals the whole bankroll -> this spin would ruin the run if lost
  // 1166 of 1728 combinations pay 0 (see disclosure.test.mts's RTP pin above / README).
  const expectedLossProbability = 1166 / 1728;
  assert.ok(Math.abs(disclosure.probability - expectedLossProbability) < 1e-12);
  assert.ok(disclosure.text.includes('%'));
});

test('sessionSummary with zero spins reports only the published figures, no divide-by-zero', () => {
  const summary = sessionSummary([], 1);
  assert.equal(summary.spins, 0);
  assert.ok(summary.published.rtp > 0);
  assert.equal(summary.actualRtp, undefined);
});

test('sessionSummary computes real counts from history, not a resampled estimate', () => {
  const history = [
    { symbols: ['cherry', 'cherry', 'cherry'], payout: 3, bet: 1 },
    { symbols: ['bell', 'lemon', 'star'], payout: 0, bet: 1 },
    { symbols: ['seven', 'seven', 'seven'], payout: 100, bet: 1 },
  ];
  const summary = sessionSummary(history, 1);
  assert.equal(summary.spins, 3);
  assert.equal(summary.totalStaked, 3);
  assert.equal(summary.totalPayout, 103);
  assert.equal(summary.netResult, 100);
  assert.ok(Math.abs(summary.actualRtp - 103 / 3) < 1e-12);
  const cherryRow = summary.symbolComparison.find((r) => r.symbol === 'cherry');
  assert.deepEqual(cherryRow.actualHits, [1, 1, 1]);
});
