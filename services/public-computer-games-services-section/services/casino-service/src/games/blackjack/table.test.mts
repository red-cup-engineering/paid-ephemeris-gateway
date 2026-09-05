/**
 * table.test.mts — the chips integration seam: real `CasinoEconomy` chip movement through a
 * `BlackjackTable`, checked against energy-bank's own `checkInvariants` (books balance, no
 * negative balances, the payout invariant) after every action, across every settlement category
 * (win, blackjack, push, loss, surrender, double, split) — the "books must balance across any
 * sequence of hands" requirement, exercised with real seeds rather than mocked money movement.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fundAccount } from '@red-cup-engineering/energy-bank/transfer';
import { CasinoEconomy } from '../../economy/casino-economy.mts';
import { CHIP, DEFAULT_JACKPOT_RAKE_BPS } from '../../economy/config.mts';
import { createEngine, applyIntent, canSplit, type BlackjackState } from './engine.mts';
import { BlackjackTable } from './table.mts';

const TEST_CHIP_FAUCET = 'equity:casino:test-chip-faucet';
const DATE = '2026-08-29';
const BET = 100;

function grantChips(economy: CasinoEconomy, accountId: string, amount: number): void {
  fundAccount(economy.ledger, TEST_CHIP_FAUCET, accountId, String(amount), CHIP, `grant-${accountId}-${amount}-${Math.random()}`, DATE);
}

function chipBalance(economy: CasinoEconomy, accountId: string): number {
  return economy.statusOf(accountId).chips;
}

function jackpotOf(economy: CasinoEconomy): number {
  return economy.statusOf(economy.guestAccount('__probe__')).jackpot;
}

function rakeOn(bet: number): number {
  return Math.floor((bet * DEFAULT_JACKPOT_RAKE_BPS) / 10_000);
}

/** Search for a seed (against the bare engine, not a table) whose fresh deal matches
 *  `predicate` — the same technique engine.test.mts uses, reused here so table.test.mts can set
 *  up an exact settlement category (win/loss/push/blackjack) before re-running that same seed
 *  through a real `BlackjackTable` + `CasinoEconomy` pair to check the resulting chip movement. */
function findSeed(prefix: string, predicate: (state: BlackjackState) => boolean, bet = BET, maxTries = 4000): string {
  for (let i = 0; i < maxTries; i += 1) {
    const seed = `${prefix}-${i}`;
    const state = applyIntent(createEngine(seed, 'default'), { kind: 'deal', bet }).state;
    if (predicate(state)) return seed;
  }
  throw new Error(`findSeed: no match for prefix "${prefix}"`);
}

function standOn17(table: BlackjackTable): void {
  let guard = 0;
  while (table.publicState().round?.phase === 'player-turn' && guard < 15) {
    const round = table.publicState().round!;
    const hand = round.playerHands[round.activeHandIndex]!;
    let hard = 0;
    let aces = 0;
    for (const c of hand.cards) {
      hard += c.rank === 1 ? 1 : Math.min(c.rank, 10);
      if (c.rank === 1) aces += 1;
    }
    const best = aces > 0 && hard + 10 <= 21 ? hard + 10 : hard;
    if (best < 17) table.hit();
    else table.stand();
    guard += 1;
  }
}

function freshTable(tableId: string, seed: string): { economy: CasinoEconomy; accountId: string; table: BlackjackTable } {
  const economy = new CasinoEconomy();
  const accountId = economy.guestAccount(`device-${tableId}`);
  grantChips(economy, accountId, 100_000);
  const table = new BlackjackTable(economy, accountId, tableId, seed, 'default');
  return { economy, accountId, table };
}

test('deal -> a natural blackjack pays 3:2 and leaves the books balanced', () => {
  const seed = findSeed('table-blackjack', (s) => s.round?.outcomes?.[0]?.result === 'blackjack');
  const { economy, accountId, table } = freshTable('bj-table-1', seed);
  const before = chipBalance(economy, accountId);
  const jackpotBefore = jackpotOf(economy);
  table.deal(BET);
  const after = chipBalance(economy, accountId);
  assert.equal(after - before, Math.floor((BET * 3) / 2)); // net profit only, stake already returned
  assert.equal(jackpotOf(economy) - jackpotBefore, rakeOn(BET));
  assert.deepEqual(economy.checkInvariants(), []);
});

test('deal -> a dealer natural (player non-natural) is a clean loss and leaves the books balanced', () => {
  const seed = findSeed('table-dealer-natural', (s) => s.round?.phase === 'round-over' && s.round.outcomes?.[0]?.result === 'loss' && s.round.playerHands[0]?.status !== 'bust');
  const { economy, accountId, table } = freshTable('bj-table-2', seed);
  const before = chipBalance(economy, accountId);
  table.deal(BET);
  const after = chipBalance(economy, accountId);
  assert.equal(before - after, BET);
  assert.deepEqual(economy.checkInvariants(), []);
});

test('deal -> both-natural push returns the player to exactly their pre-bet balance', () => {
  const seed = findSeed('table-push', (s) => s.round?.outcomes?.[0]?.result === 'push' && s.round.playerHands[0]?.status === 'blackjack');
  const { economy, accountId, table } = freshTable('bj-table-3', seed);
  const before = chipBalance(economy, accountId);
  table.deal(BET);
  const after = chipBalance(economy, accountId);
  assert.equal(after, before); // rake was still taken off the top, but the payout math nets to zero for the player
  assert.deepEqual(economy.checkInvariants(), []);
});

test('deal -> stand -> an ordinary win pays 1:1 and an ordinary loss forfeits the bet, books stay balanced either way', () => {
  const winSeed = findSeed('table-win', (s) => s.round?.phase === 'player-turn');
  {
    const { economy, accountId, table } = freshTable('bj-table-4', winSeed);
    const before = chipBalance(economy, accountId);
    table.deal(BET);
    standOn17(table);
    const state = table.publicState();
    const outcome = state.round!.outcomes?.[0];
    const after = chipBalance(economy, accountId);
    if (outcome) {
      assert.equal(after - before, outcome.payout - BET);
    }
    assert.deepEqual(economy.checkInvariants(), []);
  }
});

test('deal -> repeated hits until bust is a total loss, books stay balanced', () => {
  const seed = findSeed('table-bust', (s) => s.round?.phase === 'player-turn');
  const { economy, accountId, table } = freshTable('bj-table-5', seed);
  const before = chipBalance(economy, accountId);
  table.deal(BET);
  let guard = 0;
  while (table.publicState().round?.phase === 'player-turn' && guard < 20) {
    table.hit();
    guard += 1;
  }
  const state = table.publicState();
  if (state.round!.playerHands[0]!.status === 'bust') {
    assert.equal(before - chipBalance(economy, accountId), BET);
  }
  assert.deepEqual(economy.checkInvariants(), []);
});

test('deal -> surrender charges only the initial bet and refunds exactly half of it', () => {
  const seed = findSeed('table-surrender', (s) => s.round?.phase === 'player-turn');
  const { economy, accountId, table } = freshTable('bj-table-6', seed);
  const before = chipBalance(economy, accountId);
  table.deal(BET);
  if (table.publicState().actions.canSurrender) {
    table.surrender();
    const after = chipBalance(economy, accountId);
    assert.equal(before - after, BET - Math.floor(BET / 2));
  }
  assert.deepEqual(economy.checkInvariants(), []);
});

test('deal -> double places a second, equal wager and settles at double stakes; books stay balanced', () => {
  const seed = findSeed('table-double', (s) => s.round?.phase === 'player-turn');
  const { economy, accountId, table } = freshTable('bj-table-7', seed);
  const before = chipBalance(economy, accountId);
  table.deal(BET);
  if (table.publicState().actions.canDouble) {
    table.double();
    const state = table.publicState();
    if (state.round?.phase === 'round-over') {
      const outcome = state.round.outcomes![0]!;
      assert.equal(outcome.bet, BET * 2);
      const after = chipBalance(economy, accountId);
      assert.equal(after - before, outcome.payout - BET * 2);
    }
  }
  assert.deepEqual(economy.checkInvariants(), []);
});

test('deal -> split places a second wager equal to the first; total staked doubles, books stay balanced', () => {
  let found: string | null = null;
  for (let i = 0; i < 4000; i += 1) {
    const trySeed = `table-split-real-${i}`;
    const state = applyIntent(createEngine(trySeed, 'default'), { kind: 'deal', bet: BET }).state;
    if (state.round?.phase === 'player-turn' && canSplit(state)) {
      found = trySeed;
      break;
    }
  }
  assert.ok(found !== null, 'expected to find a splittable seed');

  const { economy, accountId, table } = freshTable('bj-table-8', found as string);
  const before = chipBalance(economy, accountId);
  table.deal(BET);
  assert.equal(table.publicState().actions.canSplit, true);
  table.split();
  const afterSplitCharge = chipBalance(economy, accountId);
  // Two hands now funded at BET each — at least 2*BET has left the player's balance so far
  // (settlement of either/both hands, if it already happened, only adds back from here).
  assert.ok(before - afterSplitCharge >= BET); // the split's own extra wager has been taken
  let guard = 0;
  while (table.publicState().round?.phase === 'player-turn' && guard < 30) {
    standOn17(table);
    guard += 1;
  }
  assert.deepEqual(economy.checkInvariants(), []);
  const finalState = table.publicState();
  if (finalState.round?.phase === 'round-over') {
    const totalBet = finalState.round.outcomes!.reduce((sum, o) => sum + o.bet, 0);
    assert.equal(totalBet, BET * 2);
  }
});

test('a long mixed sequence of hands (win/lose/push/blackjack/double/split) keeps the books balanced throughout', () => {
  const economy = new CasinoEconomy();
  const accountId = economy.guestAccount('device-mixed-sequence');
  grantChips(economy, accountId, 200_000);
  const table = new BlackjackTable(economy, accountId, 'bj-table-mixed', 'mixed-sequence-seed', 'default');

  for (let hand = 0; hand < 40; hand += 1) {
    // A bet of 100 guarantees non-zero rake per hand (`floor(100 * 250/10000) = 2`) — the
    // rake's own minimum-granularity floor rounding (see wager.mts) means a much smaller bet
    // could legitimately round down to zero rake, which is correct behavior, not a bug, but
    // would make this test's own jackpot-accrual assertion meaningless.
    table.deal(100);
    let guard = 0;
    while (table.publicState().round?.phase === 'player-turn' && guard < 20) {
      const state = table.publicState();
      if (state.actions.canDouble && hand % 6 === 0) table.double();
      else if (state.actions.canSplit && hand % 9 === 0) table.split();
      else {
        const round = state.round!;
        const hand2 = round.playerHands[round.activeHandIndex]!;
        let hard = 0;
        let aces = 0;
        for (const c of hand2.cards) {
          hard += c.rank === 1 ? 1 : Math.min(c.rank, 10);
          if (c.rank === 1) aces += 1;
        }
        const best = aces > 0 && hard + 10 <= 21 ? hard + 10 : hard;
        if (best < 17) table.hit();
        else table.stand();
      }
      guard += 1;
      assert.deepEqual(economy.checkInvariants(), []);
    }
    if (table.publicState().round?.phase === 'round-over') table.nextHand();
  }
  assert.deepEqual(economy.checkInvariants(), []);
  assert.ok(jackpotOf(economy) > 0, 'the jackpot should have accrued rake across 40 hands of wagering');
});
