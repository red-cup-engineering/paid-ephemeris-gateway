/**
 * blackjack/table.mts — a live table session: the seam between the pure `engine.mts` and the
 * real chip economy (`../../economy/casino-economy.mts`'s `CasinoEconomy`). This is the only
 * module in the blackjack game that imports the economy — `engine.mts` never does, and would
 * play identically as a free-play engine (see its own header).
 *
 * Money flow, per the house's own `placeWager`/`resolveWager` primitive (see wager.mts): a bet
 * (the initial deal, or the extra stake a double/split adds) is charged *before* the matching
 * engine intent is applied, gated by the engine's own pure `can*` predicates so a chip is never
 * taken for an action the engine would then refuse. A settled round's total payout (already
 * computed by `engine.mts` per hand: win/blackjack/push/loss/surrender) is paid in one
 * `resolveWager` call once `applyIntent` reports `round-over`.
 *
 * `placeWager`/`resolveWager` are pari-mutuel-shaped by default: a table's pot only ever holds
 * what wagers deposited into it, which works when winners are paid out of losers' own stakes.
 * Blackjack is player-vs-house — a win can pay back *more* than the wager that funded it (3:2
 * on a natural) — so this table's own pot needs a real pre-funded bankroll before its first
 * hand can ever pay out a win; `seedPotOnce` does that exactly once per `tableId`, the same
 * "a brand-new pool with a real $0 looks broken" cold-start reasoning `jackpot.mts` documents
 * for the jackpot pool, via `CasinoEconomy#seedTablePot` (see that method's own header).
 */
import type { CasinoEconomy, BalanceStatus } from '../../economy/casino-economy.mts';
import type { AccountId } from '../../economy/accounts.mts';
import { DEFAULT_JACKPOT_RAKE_BPS } from '../../economy/config.mts';
import {
  createEngine,
  applyIntent,
  canDeal,
  canHit,
  canStand,
  canDouble,
  canSplit,
  canSurrender,
  canNextHand,
  activeHandBet,
  type BlackjackState,
  type BlackjackHand,
  type HandOutcome,
} from './engine.mts';
import { resolveRules, type BlackjackRules } from './rules.mts';
import { computeHouseMath, shoeComposition, type HouseMath } from './ev.mts';

/** A table's pot/bankroll is only ever cold-start-seeded once per `tableId`, no matter how many
 *  `BlackjackTable` instances get constructed for it across a process's lifetime (a fresh
 *  in-memory object per request would otherwise re-fund the bankroll every time it's built —
 *  `server.mts` avoids that by keeping one long-lived instance per account, but this guard
 *  makes the invariant true regardless of the caller's own lifecycle discipline). */
const seededPots = new Set<string>();

/** The table bankroll's cold-start size — generous relative to the rules' own `maxBet`/
 *  `defaultBet` so ordinary play (including a run of natural blackjacks) never exhausts it; see
 *  `CasinoEconomy#seedTablePot`. A live-ops top-up seam, not a hard cap: nothing stops calling
 *  `seedTablePot` again later if a table's pot ever runs low from real volume. */
export const TABLE_BANKROLL_SEED = 100_000;

export type ActionKind = 'deal' | 'hit' | 'stand' | 'double' | 'split' | 'surrender' | 'next-hand';

/**
 * A just-settled round's money summary — the seam `src/floor/`'s realtime win broadcasting hooks
 * onto (see this module's own header on why it's additive: an optional constructor callback, not
 * a rewrite of the settlement path itself). Fired exactly once per round, from `payoutIfSettled`,
 * whether or not a chip actually changed hands (`payout` may be `0`, e.g. an all-loss round) —
 * the floor decides win/big-win/jackpot tiering and feed-worthiness from these raw numbers, this
 * module only ever reports what actually happened.
 */
export interface BlackjackSettlement {
  readonly game: 'blackjack';
  readonly tableId: string;
  readonly accountId: AccountId;
  readonly wager: number;
  readonly payout: number;
}

export type SettlementListener = (event: BlackjackSettlement) => void;

/** What a cast persona's blackjack policy needs to price the active hand's exact EV — the same
 *  inputs `publicState()`'s own House Math panel already computes internally, exposed as a small,
 *  additive public method so `src/floor/cast-residency.mts`'s in-process Transport can hand them
 *  straight to `@red-cup-engineering/cast/policy/blackjack#blackjackPolicy` without this table
 *  reaching into the engine's private shoe/round shape itself. `null` when no decision is
 *  pending, exactly mirroring `publicState().houseMath`'s own null case. */
export interface PendingDecisionInputs {
  readonly playerRanks: readonly number[];
  readonly upcardRank: number;
  readonly composition: ReturnType<typeof shoeComposition>;
  readonly options: { readonly hitSoft17: boolean };
}

export interface PublicCard {
  readonly suit: string;
  readonly rank: number;
}

export interface PublicHand {
  readonly cards: readonly PublicCard[];
  readonly bet: number;
  readonly status: BlackjackHand['status'];
}

export interface PublicRound {
  /** The dealer's cards as the player is allowed to see them right now: the hole card is `null`
   *  until the round settles (or a peeked dealer natural ends it early) — never sent to the
   *  client while genuinely hidden. */
  readonly dealerCards: readonly (PublicCard | null)[];
  readonly playerHands: readonly PublicHand[];
  readonly activeHandIndex: number;
  readonly phase: 'player-turn' | 'round-over';
  readonly outcomes: readonly HandOutcome[] | null;
}

export interface PublicRules {
  readonly id: string;
  readonly displayName: string;
  readonly decks: number;
  readonly hitSoft17: boolean;
  readonly blackjackPayoutNum: number;
  readonly blackjackPayoutDen: number;
  readonly minBet: number;
  readonly maxBet: number;
  readonly defaultBet: number;
}

export interface PublicState {
  readonly tableId: string;
  readonly rules: PublicRules;
  readonly cardsRemaining: number;
  readonly handsPlayed: number;
  readonly round: PublicRound | null;
  readonly actions: {
    readonly canDeal: boolean;
    readonly canHit: boolean;
    readonly canStand: boolean;
    readonly canDouble: boolean;
    readonly canSplit: boolean;
    readonly canSurrender: boolean;
    readonly canNextHand: boolean;
  };
  /** The house signature: exact EV of every currently-legal action on the active hand, or
   *  `null` when no decision is pending (between rounds, or the dealer/settlement phase) — see
   *  ev.mts. Always computed; the client decides whether to show it (off by default). */
  readonly houseMath: HouseMath | null;
}

function toPublicCard(card: { suit: string; rank: number }): PublicCard {
  return { suit: card.suit, rank: card.rank };
}

function toPublicRules(rules: BlackjackRules): PublicRules {
  return {
    id: rules.id,
    displayName: rules.displayName,
    decks: rules.decks,
    hitSoft17: rules.hitSoft17,
    blackjackPayoutNum: rules.blackjackPayoutNum,
    blackjackPayoutDen: rules.blackjackPayoutDen,
    minBet: rules.minBet,
    maxBet: rules.maxBet,
    defaultBet: rules.defaultBet,
  };
}

export class BlackjackTable {
  readonly tableId: string;
  readonly accountId: AccountId;
  private readonly economy: CasinoEconomy;
  private readonly rakeBps: number;
  private readonly onSettlement?: SettlementListener;
  private state: BlackjackState;

  /** `onSettlement` is an optional last argument, purely additive (see `BlackjackSettlement`'s
   *  own header) — every existing caller that never passes it keeps behaving exactly as before. */
  constructor(economy: CasinoEconomy, accountId: AccountId, tableId: string, seed: string, configId?: string, rakeBps: number = DEFAULT_JACKPOT_RAKE_BPS, onSettlement?: SettlementListener) {
    this.economy = economy;
    this.accountId = accountId;
    this.tableId = tableId;
    this.rakeBps = rakeBps;
    this.onSettlement = onSettlement;
    this.state = createEngine(seed, configId);
    if (!seededPots.has(tableId)) {
      seededPots.add(tableId);
      this.economy.seedTablePot(tableId, TABLE_BANKROLL_SEED);
    }
  }

  private rules(): BlackjackRules {
    return resolveRules(this.state.configId);
  }

  /** Pay out a just-settled round's total, if any — safe to call unconditionally after every
   *  intent: it only ever fires the request the transition *into* `round-over` this same call
   *  made, since every path that can reach `round-over` required `round.phase === 'player-turn'`
   *  (or `round === null`, for the deal-time natural-blackjack short-circuit) going in, so a
   *  round already sitting at `round-over` can never be re-settled by a later call. */
  private payoutIfSettled(): void {
    const round = this.state.round;
    if (round === null || round.phase !== 'round-over' || round.outcomes === null) return;
    const total = round.outcomes.reduce((sum, outcome) => sum + outcome.payout, 0);
    if (total > 0) this.economy.resolveWager(this.tableId, this.accountId, total);
    if (this.onSettlement !== undefined) {
      const wager = round.outcomes.reduce((sum, outcome) => sum + outcome.bet, 0);
      this.onSettlement({ game: 'blackjack', tableId: this.tableId, accountId: this.accountId, wager, payout: total });
    }
  }

  deal(bet: number): void {
    if (!canDeal(this.state)) throw new Error('blackjack: a round is already in progress — call next-hand first');
    const rules = this.rules();
    if (!Number.isInteger(bet) || bet < rules.minBet || bet > rules.maxBet) {
      throw new RangeError(`blackjack: bet must be an integer between ${rules.minBet} and ${rules.maxBet}`);
    }
    this.economy.placeWager(this.accountId, this.tableId, bet, new Date(), this.rakeBps);
    this.state = applyIntent(this.state, { kind: 'deal', bet }).state;
    this.payoutIfSettled();
  }

  hit(): void {
    if (!canHit(this.state)) throw new Error('blackjack: no active hand awaiting a decision');
    this.state = applyIntent(this.state, { kind: 'hit' }).state;
    this.payoutIfSettled();
  }

  stand(): void {
    if (!canStand(this.state)) throw new Error('blackjack: no active hand awaiting a decision');
    this.state = applyIntent(this.state, { kind: 'stand' }).state;
    this.payoutIfSettled();
  }

  double(): void {
    if (!canDouble(this.state)) throw new Error('blackjack: double is not available on this hand');
    const extra = activeHandBet(this.state);
    this.economy.placeWager(this.accountId, this.tableId, extra, new Date(), this.rakeBps);
    this.state = applyIntent(this.state, { kind: 'double' }).state;
    this.payoutIfSettled();
  }

  split(): void {
    if (!canSplit(this.state)) throw new Error('blackjack: split is not available on this hand');
    const extra = activeHandBet(this.state);
    this.economy.placeWager(this.accountId, this.tableId, extra, new Date(), this.rakeBps);
    this.state = applyIntent(this.state, { kind: 'split' }).state;
    this.payoutIfSettled();
  }

  surrender(): void {
    if (!canSurrender(this.state)) throw new Error('blackjack: surrender is not available on this hand');
    this.state = applyIntent(this.state, { kind: 'surrender' }).state;
    this.payoutIfSettled();
  }

  nextHand(): void {
    if (!canNextHand(this.state)) throw new Error('blackjack: no settled round to clear — deal first');
    this.state = applyIntent(this.state, { kind: 'next-hand' }).state;
  }

  /** Dispatch by a bare `kind` string, as `server.mts`'s `POST /blackjack/intent` receives it
   *  straight off the request body — a runtime boundary, so `kind` is `string`, not
   *  `ActionKind`, and an unrecognized value fails loudly (`TypeError`) rather than being cast
   *  past the type system. */
  apply(kind: string, bet?: unknown): void {
    switch (kind) {
      case 'deal':
        this.deal(Number(bet));
        return;
      case 'hit':
        this.hit();
        return;
      case 'stand':
        this.stand();
        return;
      case 'double':
        this.double();
        return;
      case 'split':
        this.split();
        return;
      case 'surrender':
        this.surrender();
        return;
      case 'next-hand':
        this.nextHand();
        return;
      default:
        throw new TypeError(`blackjack: unknown intent kind "${String(kind)}"`);
    }
  }

  /** The full status the caller (server.mts) sends back after every intent — real chip
   *  balances from the economy alongside this table's own (never-leaking-future-cards) public
   *  state. */
  statusAndState(): { status: BalanceStatus; table: PublicState } {
    return { status: this.economy.statusOf(this.accountId), table: this.publicState() };
  }

  /** See `PendingDecisionInputs`'s own header — the additive seam a cast persona's blackjack
   *  policy reads instead of `publicState()`'s already-client-shaped `houseMath`. */
  pendingDecisionInputs(): PendingDecisionInputs | null {
    const round = this.state.round;
    if (round === null || round.phase !== 'player-turn') return null;
    const rules = this.rules();
    const activeHand = round.playerHands[round.activeHandIndex];
    const upcard = round.dealerCards[0];
    if (activeHand === undefined || upcard === undefined) return null;
    return {
      playerRanks: activeHand.cards.map((c) => c.rank),
      upcardRank: upcard.rank,
      composition: shoeComposition(this.state.shoe, rules.decks),
      options: { hitSoft17: rules.hitSoft17 },
    };
  }

  publicState(): PublicState {
    const rules = this.rules();
    const round = this.state.round;
    let publicRound: PublicRound | null = null;
    let houseMath: HouseMath | null = null;

    if (round !== null) {
      const dealerCards = round.dealerCards.map((c) => (c.faceUp ? toPublicCard(c) : null));
      const playerHands = round.playerHands.map((hand) => ({ cards: hand.cards.map(toPublicCard), bet: hand.bet, status: hand.status }));
      publicRound = { dealerCards, playerHands, activeHandIndex: round.activeHandIndex, phase: round.phase, outcomes: round.outcomes };

      if (round.phase === 'player-turn') {
        const activeHand = round.playerHands[round.activeHandIndex];
        const upcard = round.dealerCards[0];
        if (activeHand !== undefined && upcard !== undefined) {
          houseMath = computeHouseMath(activeHand, upcard.rank, this.state.shoe, rules, {
            allowDouble: canDouble(this.state),
            allowSplit: canSplit(this.state),
          });
        }
      }
    }

    return {
      tableId: this.tableId,
      rules: toPublicRules(rules),
      cardsRemaining: this.state.shoe.cards.length - this.state.shoe.cursor,
      handsPlayed: this.state.handsPlayed,
      round: publicRound,
      actions: {
        canDeal: canDeal(this.state),
        canHit: canHit(this.state),
        canStand: canStand(this.state),
        canDouble: canDouble(this.state),
        canSplit: canSplit(this.state),
        canSurrender: canSurrender(this.state),
        canNextHand: canNextHand(this.state),
      },
      houseMath,
    };
  }
}
