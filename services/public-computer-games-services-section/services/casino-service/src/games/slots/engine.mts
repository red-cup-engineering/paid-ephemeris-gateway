/**
 * slots/engine.mts — a pure reducer over two intents (`spin`/`collect`), built entirely from
 * `@red-cup-engineering/parlor-kernel/paylines` (`spinGrid`/`evaluateSpin`) over the house-rules-
 * as-data in `./rules.mts` — the same "rules are data, the reducer only dispatches" idiom
 * `blackjack/engine.mts` establishes for this service, written by hand here rather than via
 * `parlor-kernel/turns.mjs#createTurnReducer` for the identical reason blackjack gives: this game
 * has no multi-seat turn order for that abstraction to generalize (one player, one machine, no
 * opponent with choices of its own).
 *
 * Determinism: `createEngine(seed, configId)` stores `seed` verbatim; every `spin` intent derives
 * its own sub-seed from `seed` and a monotonic `spinSeq` (`${seed}:spin:${spinSeq}`, never the
 * ambient clock), and every free-spin played inside a triggered bonus derives its OWN sub-seed
 * from that same spin's seed and its position in the bonus
 * (`${seed}:spin:${spinSeq}:bonus:${bonusIndex}`) — so the same `(seed, intents)` always replays
 * to byte-identical state, exactly `cartridge.mts`'s replay contract needs, all the way through a
 * multi-spin free-spin bonus.
 *
 * Money never appears here, per blackjack's own precedent: `lineTotal`/`scatterPayout`/
 * `totalPayout` are nominal chip counts computed purely from the rules' own paytable, never an
 * economy call. The one deliberate exception is the jackpot: this module only ever reports
 * `jackpotHit: boolean` (whether the designated all-wild payline landed) — it never invents a
 * jackpot chip AMOUNT, because that amount is the real, mutable jackpot pool balance at the
 * moment of the hit, which is economy state, not game math. `table.mts` (the only module here
 * that imports the economy, exactly like blackjack's own `table.mts`) reads the live pool and
 * pays it out; replaying this engine from a seed reproduces the exact same jackpot HIT
 * deterministically, but not a jackpot AMOUNT frozen in time — precisely how a real progressive
 * works (the hit is yours by the math; the size of the pot you hit is whatever the house has
 * accumulated by the time you hit it).
 */
import { spinGrid, evaluateSpin } from '@red-cup-engineering/parlor-kernel/paylines';
import type { SpinLineWin } from '@red-cup-engineering/parlor-kernel/paylines';
import { makeRng } from '@red-cup-engineering/parlor-kernel/seed';
import type { GameEvent, Intent } from '@red-cup-engineering/cartridge/intent-log';
import type { ApplyResult } from '@red-cup-engineering/cartridge/replay';
import { resolveSlotsRules, freeSpinAwardFor, totalBetFor, type SlotsRules } from './rules.mts';

// ── state shape ─────────────────────────────────────────────────────────────────────────────

export interface SpinOutcome {
  readonly grid: readonly (readonly string[])[]; // grid[reelIndex][rowIndex]
  readonly lineWins: readonly SpinLineWin[];
  readonly scatterCount: number;
  readonly scatterPayout: number;
  readonly lineTotal: number;
  readonly totalPayout: number;
  readonly jackpotHit: boolean;
  readonly isBonusSpin: boolean;
  readonly freeSpinsAwarded: number;
}

export interface SpinRoundResult {
  readonly betPerLine: number;
  readonly totalBet: number;
  readonly base: SpinOutcome;
  readonly bonusSpins: readonly SpinOutcome[];
  readonly totalFreeSpinsAwarded: number;
  readonly totalPayout: number;
  readonly jackpotHit: boolean;
}

export type SlotsPhase = 'ready' | 'result';

export interface SlotsState {
  readonly seed: string;
  readonly configId: string;
  readonly spinSeq: number;
  readonly spinsPlayed: number;
  readonly phase: SlotsPhase;
  readonly lastResult: SpinRoundResult | null;
}

export type SlotsIntent =
  | ({ readonly kind: 'spin'; readonly betPerLine: number } & Intent)
  | ({ readonly kind: 'collect' } & Intent);

// ── engine construction ─────────────────────────────────────────────────────────────────────

/** Pure function of `(seed, configId)`: identical arguments always produce byte-identical state,
 *  per the cartridge contract — mirrors `blackjack/engine.mts#createEngine` exactly. */
export function createEngine(seed: string, configId?: string): SlotsState {
  const rules = resolveSlotsRules(configId);
  return { seed, configId: rules.id, spinSeq: 0, spinsPlayed: 0, phase: 'ready', lastResult: null };
}

function rulesOf(state: SlotsState): SlotsRules {
  return resolveSlotsRules(state.configId);
}

// ── pure predicates (table.mts gates chip movement on these before calling applyIntent) ──────

export function canSpin(state: SlotsState): boolean {
  return state.phase === 'ready';
}

export function canCollect(state: SlotsState): boolean {
  return state.phase === 'result';
}

// ── internal helpers ────────────────────────────────────────────────────────────────────────

function isJackpotHit(grid: readonly (readonly string[])[], rules: SlotsRules): boolean {
  return rules.jackpotPattern.every((row, reelIndex) => grid[reelIndex]?.[row] === rules.jackpotSymbol);
}

/** Play exactly one spin (base or bonus) from a fully-seeded `Rng` stream — pure, deterministic,
 *  and the only place `spinGrid`/`evaluateSpin` are called. A bonus spin is priced identically to
 *  a base spin except every payout scales by `rules.freeSpinMultiplier` (passed straight through
 *  `evaluateSpin`'s own `betPerLine`/`totalBet` scaling — no separate multiply step needed, and
 *  no additional bet is ever placed for it, that being the whole point of a free spin). */
export function playOneSpin(
  rng: ReturnType<typeof makeRng>,
  rules: SlotsRules,
  betPerLine: number,
  totalBet: number,
  isBonusSpin: boolean,
): SpinOutcome {
  const grid = spinGrid(rng, rules.reels, rules.rows);
  const scale = isBonusSpin ? rules.freeSpinMultiplier : 1;
  const spin = evaluateSpin(grid, rules.paylines, rules.paytable, {
    wilds: rules.wilds,
    scatter: rules.scatter,
    scatterPaytable: rules.scatterPaytable,
    betPerLine: betPerLine * scale,
    totalBet: totalBet * scale,
  });
  const freeSpinsAwarded = spin.scatterCount >= rules.scatterTriggerCount ? freeSpinAwardFor(rules, spin.scatterCount) : 0;
  return {
    grid,
    lineWins: spin.lineWins,
    scatterCount: spin.scatterCount,
    scatterPayout: spin.scatterPayout,
    lineTotal: spin.lineTotal,
    totalPayout: spin.totalPayout,
    jackpotHit: isJackpotHit(grid, rules),
    isBonusSpin,
    freeSpinsAwarded,
  };
}

/** A defensive cap on how many free spins one round may ever play out, independent of the
 *  paytable's own math. `ev.mts#computeHouseMath`'s `expectedFreeSpinsPerTrigger` is only finite
 *  because the *default* ruleset's own scatter distribution keeps its expected new-spins-per-
 *  spin-played below 1 (see that module's header) — a future ruleset that got this wrong (ES >= 1)
 *  would otherwise retrigger without bound. This never fires for any ruleset actually tuned the
 *  way `ev.mts` requires; it exists so a misconfigured one fails loudly with a real error instead
 *  of hanging the process. */
export const MAX_BONUS_SPINS_PER_ROUND = 5000;

/**
 * Play one full round — the base spin, plus every free spin a triggered (and possibly
 * retriggered) bonus plays out — from an explicit `(seed, spinSeq, rules)`, with no dependency on
 * `SlotsState`/the ruleset registry at all. This is the pure engine at its core, split out from
 * `handleSpin` below for two reasons: `handleSpin` becomes a thin state-transition wrapper around
 * it, and — just as importantly — a test can call this directly with a hand-crafted `SlotsRules`
 * object (tiny, fully deterministic reels) to exercise jackpot detection and free-spin
 * trigger/retrigger arithmetic exactly, without needing to brute-force-search real seeds for a
 * rare event (see `engine.test.mts`).
 */
export function playRound(
  seed: string,
  spinSeq: number,
  rules: SlotsRules,
  betPerLine: number,
  totalBet: number,
): { result: SpinRoundResult; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const baseRng = makeRng(`${seed}:spin:${spinSeq}`);
  const base = playOneSpin(baseRng, rules, betPerLine, totalBet, false);
  events.push({ kind: 'spin', betPerLine, totalBet, scatterCount: base.scatterCount, lineWinCount: base.lineWins.length });
  if (base.jackpotHit) events.push({ kind: 'jackpot-hit', spin: 'base' });

  const bonusSpins: SpinOutcome[] = [];
  let remaining = base.freeSpinsAwarded;
  if (remaining > 0) events.push({ kind: 'free-spins-triggered', count: remaining });
  let bonusIndex = 0;
  while (remaining > 0) {
    if (bonusIndex >= MAX_BONUS_SPINS_PER_ROUND) {
      throw new Error(`slots: exceeded MAX_BONUS_SPINS_PER_ROUND (${MAX_BONUS_SPINS_PER_ROUND}) — ruleset's free-spin math never converges (ES >= 1)`);
    }
    bonusIndex += 1;
    remaining -= 1;
    const bonusRng = makeRng(`${seed}:spin:${spinSeq}:bonus:${bonusIndex}`);
    const bonusOutcome = playOneSpin(bonusRng, rules, betPerLine, totalBet, true);
    bonusSpins.push(bonusOutcome);
    if (bonusOutcome.jackpotHit) events.push({ kind: 'jackpot-hit', spin: `bonus-${bonusIndex}` });
    if (bonusOutcome.freeSpinsAwarded > 0) {
      remaining += bonusOutcome.freeSpinsAwarded;
      events.push({ kind: 'free-spins-retriggered', count: bonusOutcome.freeSpinsAwarded, atBonusSpin: bonusIndex });
    }
  }

  const totalFreeSpinsAwarded = base.freeSpinsAwarded + bonusSpins.reduce((sum, s) => sum + s.freeSpinsAwarded, 0);
  const totalPayout = base.totalPayout + bonusSpins.reduce((sum, s) => sum + s.totalPayout, 0);
  const jackpotHit = base.jackpotHit || bonusSpins.some((s) => s.jackpotHit);

  const result: SpinRoundResult = { betPerLine, totalBet, base, bonusSpins, totalFreeSpinsAwarded, totalPayout, jackpotHit };
  return { result, events };
}

// ── intent handlers ─────────────────────────────────────────────────────────────────────────

function handleSpin(state: SlotsState, intent: Extract<SlotsIntent, { kind: 'spin' }>, rules: SlotsRules): ApplyResult<SlotsState> {
  if (!canSpin(state)) throw new Error('slots: cannot spin — collect the last result first');
  const { betPerLine } = intent;
  if (!Number.isInteger(betPerLine) || betPerLine < rules.minBetPerLine || betPerLine > rules.maxBetPerLine) {
    throw new RangeError(`slots: betPerLine must be an integer between ${rules.minBetPerLine} and ${rules.maxBetPerLine}`);
  }
  const totalBet = totalBetFor(rules, betPerLine);
  const spinSeq = state.spinSeq + 1;
  const { result, events } = playRound(state.seed, spinSeq, rules, betPerLine, totalBet);
  return {
    state: { ...state, spinSeq, spinsPlayed: state.spinsPlayed + 1, phase: 'result', lastResult: result },
    events,
  };
}

function handleCollect(state: SlotsState): ApplyResult<SlotsState> {
  if (!canCollect(state)) throw new Error('slots: no pending result to collect — spin first');
  return { state: { ...state, phase: 'ready', lastResult: null }, events: [{ kind: 'collected' }] };
}

// ── dispatch ────────────────────────────────────────────────────────────────────────────────

/**
 * `applyIntent` — the cartridge contract's required domain method. Exhaustive dispatch by
 * `intent.kind`, same discipline as `blackjack/engine.mts`. Pure: never mutates `state`, always
 * returns a fresh object.
 */
export function applyIntent(state: SlotsState, intent: SlotsIntent): ApplyResult<SlotsState> {
  const rules = rulesOf(state);
  switch (intent.kind) {
    case 'spin':
      return handleSpin(state, intent, rules);
    case 'collect':
      return handleCollect(state);
    default: {
      const exhaustive: never = intent;
      throw new TypeError(`slots: no handler registered for intent kind "${(exhaustive as { kind: string }).kind}"`);
    }
  }
}
