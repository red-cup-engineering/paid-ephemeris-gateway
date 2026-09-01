/**
 * slots/table.mts — the chips integration seam for "Tideline Treasures", the same role
 * `blackjack/table.mts` plays for that game: the only module in this game that imports the
 * economy (`engine.mts` never does, and would play identically as a free-play engine).
 *
 * Money flow: a spin's `totalBet` (betPerLine x 20 lines) is charged through
 * `CasinoEconomy#placeWager` *before* the engine's own `spin` intent is applied (gated by the
 * engine's own pure `canSpin` predicate first, so a chip is never taken for a refused spin) —
 * `placeWager` itself skims the jackpot rake off the top into the shared pool, exactly the same
 * mechanism blackjack's every wager already feeds. Once the engine reports the round's result
 * (base spin plus every free spin a bonus played out), the non-jackpot total (every line/scatter
 * payout, base and bonus combined) is paid in one `resolveWager` call — mirroring blackjack's own
 * "settle the whole round in one call" shape.
 *
 * Slots is player-vs-house exactly the way blackjack is (a win routinely pays back far more than
 * the wager that funded it — a 5-of-a-kind top-tier line, or an entire free-spin bonus played at
 * zero additional stake), so this machine's own pot needs a real pre-funded bankroll before its
 * first spin can ever pay out a win — `seedPotOnce` does that exactly once per `machineId`, the
 * identical cold-start reasoning `blackjack/table.mts#TABLE_BANKROLL_SEED` documents, scaled up
 * for this machine's much higher payout ceiling (a 5-wild line pays 611x betPerLine, and free
 * spins double every payout on top of that).
 *
 * The jackpot itself is paid from the *separate*, shared jackpot pool account
 * (`../../economy/jackpot.mts`), never from this machine's own pot: `engine.mts` only ever
 * reports `jackpotHit: boolean` (see that module's own header for why the AMOUNT is deliberately
 * not engine math) — this module reads the pool's real live balance the instant a hit is
 * confirmed and pays out the whole thing via the new `CasinoEconomy#payoutJackpot`, then resets
 * the pool back toward zero for the next player's climb. A brand-new jackpot pool sitting at a
 * real $0 looks broken, not exciting — the same reasoning `jackpot.mts#JACKPOT_SEED_ACCOUNT`
 * documents — so this module cold-starts the pool exactly once *per process*, the first time any
 * slots machine is created, via `CasinoEconomy#seedJackpot`. Blackjack's own wagers already feed
 * this same shared pool via their own rake; this is purely about not showing a $0 jackpot before
 * anyone has wagered anything yet.
 */
import type { CasinoEconomy, BalanceStatus } from '../../economy/casino-economy.mts';
import type { AccountId } from '../../economy/accounts.mts';
import { DEFAULT_JACKPOT_RAKE_BPS } from '../../economy/config.mts';
import {
  createEngine,
  applyIntent,
  canSpin,
  canCollect,
  type SlotsState,
  type SpinRoundResult,
} from './engine.mts';
import { resolveSlotsRules, totalBetFor, type SlotsRules } from './rules.mts';
import { computeHouseMath, type HouseMath } from './ev.mts';

const seededPots = new Set<string>();
let jackpotSeeded = false;

/** This machine's own bankroll cold-start size — see this file's header for why it needs to be
 *  generous relative to the paytable's own ceiling. A live-ops top-up seam, not a hard cap,
 *  exactly like blackjack's own `TABLE_BANKROLL_SEED`. */
export const SLOTS_BANKROLL_SEED = 2_000_000;

/** The jackpot pool's one-time cold-start size (see this file's header) — deliberately modest
 *  relative to the pool's own long-run accumulation from real wager rake, purely so the very
 *  first player of the very first process ever run doesn't see a $0 jackpot. */
export const JACKPOT_COLD_START_SEED = 5_000;

/**
 * A just-settled spin round's money summary — the identical seam `blackjack/table.mts`'s own
 * `BlackjackSettlement` documents, additive here too (an optional last constructor argument). Note
 * `wager`/`payout` are the round's non-jackpot totals (base spin plus every bonus spin combined);
 * `jackpotPayout` is reported separately since it is paid from the shared pool, not this machine's
 * own pot.
 */
export interface SlotsSettlement {
  readonly game: 'slots';
  readonly machineId: string;
  readonly accountId: AccountId;
  readonly wager: number;
  readonly payout: number;
  readonly jackpotHit: boolean;
  readonly jackpotPayout: number;
}

export type SettlementListener = (event: SlotsSettlement) => void;

export interface PublicSpinOutcome {
  readonly grid: readonly (readonly string[])[];
  readonly lineWins: readonly {
    readonly line: number;
    readonly symbol: string;
    readonly count: number;
    readonly multiplier: number;
    readonly payout: number;
  }[];
  readonly scatterCount: number;
  readonly scatterPayout: number;
  readonly lineTotal: number;
  readonly totalPayout: number;
  readonly jackpotHit: boolean;
  readonly isBonusSpin: boolean;
  readonly freeSpinsAwarded: number;
}

export interface PublicSpinRoundResult {
  readonly betPerLine: number;
  readonly totalBet: number;
  readonly base: PublicSpinOutcome;
  readonly bonusSpins: readonly PublicSpinOutcome[];
  readonly totalFreeSpinsAwarded: number;
  readonly totalPayout: number;
  readonly jackpotHit: boolean;
  /** The real chip amount paid from the shared jackpot pool this round, if `jackpotHit` — `0`
   *  otherwise. Never engine math (see `engine.mts`'s own header) — the live pool balance at the
   *  moment of the hit, read and paid out by this module. */
  readonly jackpotPayout: number;
}

export interface PublicRules {
  readonly id: string;
  readonly displayName: string;
  readonly rows: number;
  readonly reelCount: number;
  readonly paylineCount: number;
  readonly scatterTriggerCount: number;
  readonly freeSpinMultiplier: number;
  readonly minBetPerLine: number;
  readonly maxBetPerLine: number;
  readonly defaultBetPerLine: number;
}

export interface PublicState {
  readonly machineId: string;
  readonly rules: PublicRules;
  readonly spinsPlayed: number;
  readonly phase: 'ready' | 'result';
  readonly lastResult: PublicSpinRoundResult | null;
  readonly actions: { readonly canSpin: boolean; readonly canCollect: boolean };
  /** Unlike blackjack's per-decision live EV (gated on a depleting shoe's own composition), this
   *  machine's math is a fixed function of its published reels/paytable — never state-dependent
   *  — so it is always present, not only during a pending decision. See `ev.mts`. */
  readonly houseMath: HouseMath;
  readonly jackpotPool: number;
}

function toPublicOutcome(outcome: SpinRoundResult['base']): PublicSpinOutcome {
  return {
    grid: outcome.grid,
    lineWins: outcome.lineWins,
    scatterCount: outcome.scatterCount,
    scatterPayout: outcome.scatterPayout,
    lineTotal: outcome.lineTotal,
    totalPayout: outcome.totalPayout,
    jackpotHit: outcome.jackpotHit,
    isBonusSpin: outcome.isBonusSpin,
    freeSpinsAwarded: outcome.freeSpinsAwarded,
  };
}

function toPublicRules(rules: SlotsRules): PublicRules {
  return {
    id: rules.id,
    displayName: rules.displayName,
    rows: rules.rows,
    reelCount: rules.reelCount,
    paylineCount: rules.paylines.length,
    scatterTriggerCount: rules.scatterTriggerCount,
    freeSpinMultiplier: rules.freeSpinMultiplier,
    minBetPerLine: rules.minBetPerLine,
    maxBetPerLine: rules.maxBetPerLine,
    defaultBetPerLine: rules.defaultBetPerLine,
  };
}

/**
 * Read the live jackpot pool and, if `jackpotHit`, pay the entire balance to `accountId` and
 * return the amount paid (`0` if there was no hit, or the pool happened to be empty — an edge
 * case that can only occur immediately after a prior payout in the same tick, since the cold-
 * start seed and every wager's rake keep it topped up otherwise). Extracted as its own function
 * (rather than inlined in `spin()` below) so it is directly unit-testable against a real
 * `CasinoEconomy` with a known, seeded pool balance — no need to brute-force a real 1-in-a-
 * million spin to exercise the actual payout code path (see `table.test.mts`).
 */
export function settleJackpotIfHit(economy: CasinoEconomy, accountId: AccountId, jackpotHit: boolean): number {
  if (!jackpotHit) return 0;
  const pool = economy.statusOf(accountId).jackpot;
  if (pool <= 0) return 0;
  economy.payoutJackpot(accountId, pool);
  return pool;
}

export class SlotsTable {
  readonly machineId: string;
  readonly accountId: AccountId;
  private readonly economy: CasinoEconomy;
  private readonly rakeBps: number;
  private readonly onSettlement?: SettlementListener;
  private state: SlotsState;
  private lastJackpotPayout = 0;

  /** `onSettlement` is an optional last argument, purely additive — see `SlotsSettlement`'s own
   *  header, mirroring `blackjack/table.mts`'s identical seam. */
  constructor(economy: CasinoEconomy, accountId: AccountId, machineId: string, seed: string, configId?: string, rakeBps: number = DEFAULT_JACKPOT_RAKE_BPS, onSettlement?: SettlementListener) {
    this.economy = economy;
    this.accountId = accountId;
    this.machineId = machineId;
    this.rakeBps = rakeBps;
    this.onSettlement = onSettlement;
    this.state = createEngine(seed, configId);
    if (!seededPots.has(machineId)) {
      seededPots.add(machineId);
      this.economy.seedTablePot(machineId, SLOTS_BANKROLL_SEED);
    }
    if (!jackpotSeeded) {
      jackpotSeeded = true;
      this.economy.seedJackpot(JACKPOT_COLD_START_SEED);
    }
  }

  private rules(): SlotsRules {
    return resolveSlotsRules(this.state.configId);
  }

  spin(betPerLine: number): void {
    if (!canSpin(this.state)) throw new Error('slots: cannot spin — collect the last result first');
    const rules = this.rules();
    if (!Number.isInteger(betPerLine) || betPerLine < rules.minBetPerLine || betPerLine > rules.maxBetPerLine) {
      throw new RangeError(`slots: betPerLine must be an integer between ${rules.minBetPerLine} and ${rules.maxBetPerLine}`);
    }
    const totalBet = totalBetFor(rules, betPerLine);
    this.economy.placeWager(this.accountId, this.machineId, totalBet, new Date(), this.rakeBps);
    this.state = applyIntent(this.state, { kind: 'spin', betPerLine }).state;

    const result = this.state.lastResult;
    if (result === null) throw new Error('slots: engine reported no result after a spin intent — invariant violated');
    if (result.totalPayout > 0) {
      this.economy.resolveWager(this.machineId, this.accountId, result.totalPayout);
    }
    this.lastJackpotPayout = settleJackpotIfHit(this.economy, this.accountId, result.jackpotHit);
    if (this.onSettlement !== undefined) {
      this.onSettlement({
        game: 'slots',
        machineId: this.machineId,
        accountId: this.accountId,
        wager: totalBet,
        payout: result.totalPayout,
        jackpotHit: result.jackpotHit,
        jackpotPayout: this.lastJackpotPayout,
      });
    }
  }

  collect(): void {
    if (!canCollect(this.state)) throw new Error('slots: no pending result to collect — spin first');
    this.state = applyIntent(this.state, { kind: 'collect' }).state;
  }

  apply(kind: string, betPerLine?: unknown): void {
    switch (kind) {
      case 'spin':
        this.spin(Number(betPerLine));
        return;
      case 'collect':
        this.collect();
        return;
      default:
        throw new TypeError(`slots: unknown intent kind "${String(kind)}"`);
    }
  }

  statusAndState(): { status: BalanceStatus; machine: PublicState } {
    return { status: this.economy.statusOf(this.accountId), machine: this.publicState() };
  }

  publicState(): PublicState {
    const rules = this.rules();
    const result = this.state.lastResult;
    const lastResult: PublicSpinRoundResult | null =
      result === null
        ? null
        : {
            betPerLine: result.betPerLine,
            totalBet: result.totalBet,
            base: toPublicOutcome(result.base),
            bonusSpins: result.bonusSpins.map(toPublicOutcome),
            totalFreeSpinsAwarded: result.totalFreeSpinsAwarded,
            totalPayout: result.totalPayout,
            jackpotHit: result.jackpotHit,
            jackpotPayout: this.lastJackpotPayout,
          };
    return {
      machineId: this.machineId,
      rules: toPublicRules(rules),
      spinsPlayed: this.state.spinsPlayed,
      phase: this.state.phase,
      lastResult,
      actions: { canSpin: canSpin(this.state), canCollect: canCollect(this.state) },
      houseMath: computeHouseMath(rules),
      jackpotPool: this.economy.statusOf(this.accountId).jackpot,
    };
  }
}
