/**
 * blackjack/engine.mts — a pure reducer over intents (`deal`/`hit`/`stand`/`double`/`split`/
 * `surrender`/`next-hand`), built entirely from `@red-cup-engineering/card-table`'s own pieces
 * (`./shoe` for the dealing shoe, `./blackjack` for hand totals/dealer policy/EV) over the
 * house-rules-as-data in `./rules.mts` — the same "rules are data, the reducer only dispatches"
 * idiom `parlor-kernel/turns.mjs#createTurnReducer` establishes for Pig/Farkle/Yacht, applied
 * here without that package as a dependency (blackjack has no multi-seat turn order to
 * generalize — one player acts, the dealer plays a fixed policy with no choices of its own — so
 * a small purpose-built dispatcher matches the kernel's *spirit* exhaustive-by-construction
 * dispatch without importing a turn/player-seating abstraction this game never needs).
 *
 * Determinism: `createEngine(seed, configId)` derives a shoe from `seed`; every reshuffle
 * derives its own sub-seed from `seed` and a monotonic `roundSeq` (never the ambient clock or
 * `Math.random`), so folding the same intent sequence through `applyIntent` from the same
 * `createEngine` call always reaches byte-identical state — exactly what `cartridge.mts`'s
 * `replay`/`createVerifier` depend on.
 *
 * Money never appears here: `Hand.bet` is a nominal chip count carried only so settlement math
 * (win pays `2x`, blackjack pays `2.5x` by default, push returns `1x`, surrender returns `0.5x`)
 * can be computed in the same pure step that finishes a round. Actually moving chips is
 * `table.mts`'s job, via `@red-cup-engineering/casino-economy`'s `placeWager`/`resolveWager` —
 * this module never imports the economy and would work identically as a free-play engine.
 */
import {
  createShoe,
  drawFromShoe,
  needsShuffle,
  reshuffleShoe,
  type Shoe,
} from '@red-cup-engineering/card-table/shoe';
import { withFaceUp, type Card, type Rank } from '@red-cup-engineering/card-table/deck';
import { handTotal, isBlackjack, canSplit as canSplitRanks, dealerShouldHit, playDealerHand, type HandTotal } from '@red-cup-engineering/card-table/blackjack';
import type { GameEvent, Intent } from '@red-cup-engineering/cartridge/intent-log';
import type { ApplyResult } from '@red-cup-engineering/cartridge/replay';
import { resolveRules, type BlackjackRules } from './rules.mts';

// ── state shape ─────────────────────────────────────────────────────────────────────────────

export type HandStatus = 'active' | 'stood' | 'bust' | 'blackjack' | 'surrendered';

export interface BlackjackHand {
  readonly cards: readonly Card[];
  readonly bet: number;
  readonly status: HandStatus;
  readonly fromSplit: boolean;
  readonly isSplitAces: boolean;
}

export type SettlementResult = 'win' | 'blackjack' | 'push' | 'loss' | 'surrender';

export interface HandOutcome {
  readonly handIndex: number;
  readonly result: SettlementResult;
  readonly bet: number;
  /** Total CHIPs returned to the player for this hand — `0` for a loss, `bet` for a push,
   *  `bet * 2` for an ordinary win, `bet + bet * blackjackPayoutNum/Den` for a natural,
   *  `floor(bet / 2)` for a surrender. */
  readonly payout: number;
}

export interface RoundState {
  readonly dealerCards: readonly Card[];
  readonly playerHands: readonly BlackjackHand[];
  readonly activeHandIndex: number;
  readonly phase: 'player-turn' | 'round-over';
  readonly outcomes: readonly HandOutcome[] | null;
}

export interface BlackjackState {
  readonly seed: string;
  readonly configId: string;
  readonly shoe: Shoe;
  readonly roundSeq: number;
  readonly handsPlayed: number;
  readonly round: RoundState | null;
}

export type BlackjackIntent =
  | ({ readonly kind: 'deal'; readonly bet: number } & Intent)
  | ({ readonly kind: 'hit' } & Intent)
  | ({ readonly kind: 'stand' } & Intent)
  | ({ readonly kind: 'double' } & Intent)
  | ({ readonly kind: 'split' } & Intent)
  | ({ readonly kind: 'surrender' } & Intent)
  | ({ readonly kind: 'next-hand' } & Intent);

// ── engine construction ─────────────────────────────────────────────────────────────────────

/** Pure function of `(seed, configId)`: identical arguments always produce byte-identical
 *  state, per the cartridge contract. `configId` selects a `./rules.mts` ruleset (defaults to
 *  `'default'`) and is also stored verbatim so every later reshuffle/rule check re-resolves it
 *  the same way. */
export function createEngine(seed: string, configId?: string): BlackjackState {
  const rules = resolveRules(configId);
  const shoe = createShoe({ decks: rules.decks, seed: `${seed}:shoe:0`, penetration: rules.penetration });
  return { seed, configId: rules.id, shoe, roundSeq: 0, handsPlayed: 0, round: null };
}

function rulesOf(state: BlackjackState): BlackjackRules {
  return resolveRules(state.configId);
}

// ── pure predicates (table.mts gates chip movement on these before calling applyIntent) ──────

export function canDeal(state: BlackjackState): boolean {
  return state.round === null;
}

function activeHand(state: BlackjackState): BlackjackHand | null {
  if (state.round === null || state.round.phase !== 'player-turn') return null;
  return state.round.playerHands[state.round.activeHandIndex] ?? null;
}

export function canHit(state: BlackjackState): boolean {
  const hand = activeHand(state);
  return hand !== null && hand.status === 'active';
}

export function canStand(state: BlackjackState): boolean {
  return canHit(state);
}

export function canDouble(state: BlackjackState): boolean {
  const rules = rulesOf(state);
  if (!rules.doubleAllowed) return false;
  const hand = activeHand(state);
  if (hand === null || hand.status !== 'active' || hand.cards.length !== 2) return false;
  if (hand.isSplitAces) return false;
  if (hand.fromSplit && !rules.doubleAfterSplit) return false;
  return true;
}

export function canSplit(state: BlackjackState): boolean {
  const rules = rulesOf(state);
  if (!rules.splitAllowed || state.round === null) return false;
  if (state.round.playerHands.length >= rules.maxSplitHands) return false;
  const hand = activeHand(state);
  if (hand === null || hand.status !== 'active' || hand.cards.length !== 2) return false;
  if (hand.isSplitAces && !rules.resplitAces) return false;
  return canSplitRanks(hand.cards.map((c) => c.rank), { sameRankOnly: false });
}

export function canSurrender(state: BlackjackState): boolean {
  const rules = rulesOf(state);
  if (!rules.surrenderAllowed || state.round === null) return false;
  if (state.round.playerHands.length !== 1) return false;
  const hand = state.round.playerHands[0];
  return hand !== undefined && hand.status === 'active' && hand.cards.length === 2;
}

export function canNextHand(state: BlackjackState): boolean {
  return state.round !== null && state.round.phase === 'round-over';
}

/** The chip amount `table.mts` must additionally place through the economy before calling
 *  `applyIntent` with `double`/`split` — always the active hand's own current bet (doubling
 *  matches it once more; splitting funds a second hand at the same stake). */
export function activeHandBet(state: BlackjackState): number {
  return activeHand(state)?.bet ?? 0;
}

// ── internal helpers ────────────────────────────────────────────────────────────────────────

function draw(shoe: Shoe): { card: Card; shoe: Shoe } {
  return drawFromShoe(shoe);
}

function blackjackPayout(bet: number, rules: BlackjackRules): number {
  return bet + Math.floor((bet * rules.blackjackPayoutNum) / rules.blackjackPayoutDen);
}

/** Settle one finished (non-active) hand against a fully-played dealer hand. Never called for a
 *  hand whose `status` is already `'blackjack'`/`'surrendered'` — those are settled at the point
 *  they're recognized (deal-time peek, or the surrender handler), not here. */
function settleAgainstDealer(hand: BlackjackHand, dealerTotal: HandTotal, rules: BlackjackRules): HandOutcome {
  if (hand.status === 'bust') return { handIndex: -1, result: 'loss', bet: hand.bet, payout: 0 };
  const playerBest = handTotal(hand.cards.map((c) => c.rank)).best;
  if (dealerTotal.isBust || playerBest > dealerTotal.best) {
    return { handIndex: -1, result: 'win', bet: hand.bet, payout: hand.bet * 2 };
  }
  if (playerBest === dealerTotal.best) {
    return { handIndex: -1, result: 'push', bet: hand.bet, payout: hand.bet };
  }
  return { handIndex: -1, result: 'loss', bet: hand.bet, payout: 0 };
}

/** Reindex a settlement's `handIndex: -1` placeholder (see `settleAgainstDealer`) to its real
 *  position — a small ergonomic seam so that function doesn't need the index threaded in. */
function withIndex(outcome: HandOutcome, handIndex: number): HandOutcome {
  return { ...outcome, handIndex };
}

/** Every live hand (not already bust/surrendered/blackjack) is done acting — reveal the hole
 *  card, play the dealer out by policy (unless every hand is already a guaranteed loss, in
 *  which case the dealer never needs to draw further), and settle. */
function runDealerAndSettle(state: BlackjackState, rules: BlackjackRules): ApplyResult<BlackjackState> {
  const round = state.round;
  if (round === null) throw new Error('blackjack: runDealerAndSettle called with no round in progress');

  const events: GameEvent[] = [];
  const revealedHole = round.dealerCards.map((c, i) => (i === 1 ? { ...c, faceUp: true } : c));
  events.push({ kind: 'dealer-reveal', card: { suit: revealedHole[1]?.suit, rank: revealedHole[1]?.rank } });

  const anyLiveHand = round.playerHands.some((h) => h.status !== 'bust');
  let shoe = state.shoe;
  let dealerCards: Card[] = revealedHole;
  let dealerTotal: HandTotal;

  if (anyLiveHand) {
    const drawnCards: Card[] = [];
    const drawRank = (): Rank => {
      const result = draw(shoe);
      shoe = result.shoe;
      drawnCards.push(withFaceUp(result.card, true));
      return result.card.rank;
    };
    const played = playDealerHand(
      dealerCards.map((c) => c.rank),
      drawRank,
      { hitSoft17: rules.hitSoft17 },
    );
    dealerCards = [...dealerCards, ...drawnCards];
    for (const card of drawnCards) events.push({ kind: 'dealer-card', suit: card.suit, rank: card.rank });
    dealerTotal = played.total;
  } else {
    // Every player hand already busted (or surrendered before reaching here — it never does,
    // see handleSurrender) — the dealer's total cannot change the outcome, so policy play is
    // skipped and the hole card's already-known total is used as-is.
    dealerTotal = handTotal(dealerCards.map((c) => c.rank));
  }

  const outcomes = round.playerHands.map((hand, i) => withIndex(settleAgainstDealer(hand, dealerTotal, rules), i));
  events.push({ kind: 'round-settled', outcomes });

  const nextState: BlackjackState = {
    ...state,
    shoe,
    handsPlayed: state.handsPlayed + 1,
    round: { ...round, dealerCards, phase: 'round-over', outcomes },
  };
  return { state: nextState, events };
}

/** After any action that can finish a hand (bust, stand, a completed double, or both halves of
 *  a split-aces pair), advance to the next still-`'active'` hand, or — if none remain — run the
 *  dealer and settle the round. */
function settleOrAdvance(state: BlackjackState, rules: BlackjackRules, events: GameEvent[]): ApplyResult<BlackjackState> {
  const round = state.round;
  if (round === null) throw new Error('blackjack: settleOrAdvance called with no round in progress');
  const nextActive = round.playerHands.findIndex((h) => h.status === 'active');
  if (nextActive === -1) {
    const settled = runDealerAndSettle(state, rules);
    return { state: settled.state, events: [...events, ...settled.events] };
  }
  return { state: { ...state, round: { ...round, activeHandIndex: nextActive } }, events };
}

// ── intent handlers ─────────────────────────────────────────────────────────────────────────

function handleDeal(state: BlackjackState, intent: Extract<BlackjackIntent, { kind: 'deal' }>, rules: BlackjackRules): ApplyResult<BlackjackState> {
  if (!canDeal(state)) throw new Error('blackjack: cannot deal — a round is already in progress');
  if (!Number.isInteger(intent.bet) || intent.bet < rules.minBet || intent.bet > rules.maxBet) {
    throw new RangeError(`blackjack: bet must be an integer between ${rules.minBet} and ${rules.maxBet}`);
  }

  const events: GameEvent[] = [];
  let shoe = state.shoe;
  let roundSeq = state.roundSeq;
  if (needsShuffle(shoe)) {
    roundSeq += 1;
    shoe = reshuffleShoe(shoe, `${state.seed}:shoe:${roundSeq}`);
    events.push({ kind: 'shoe-reshuffled' });
  }

  // Every card off the shoe is dealt face-down by default (`@red-cup-engineering/card-table
  // /deck`'s own convention); `withFaceUp` is the explicit reveal step every card needs on its
  // way into player-visible state. The player's own two cards are always shown; the dealer's
  // up-card is shown, the hole card stays hidden until a peek/reveal/settlement flips it.
  const playerCards: Card[] = [];
  const dealerCards: Card[] = [];
  for (const target of [playerCards, dealerCards, playerCards, dealerCards]) {
    const result = draw(shoe);
    shoe = result.shoe;
    target.push(withFaceUp(result.card, true));
  }
  dealerCards[1] = withFaceUp(dealerCards[1] as Card, false);
  events.push({
    kind: 'dealt',
    playerCards: playerCards.map((c) => ({ suit: c.suit, rank: c.rank })),
    dealerUpcard: { suit: (dealerCards[0] as Card).suit, rank: (dealerCards[0] as Card).rank },
  });

  const playerRanks = playerCards.map((c) => c.rank);
  const dealerUpcard = dealerCards[0] as Card;
  // A dealer can only ever hold a two-card 21 when the upcard is an Ace or a 10-value card —
  // peeking against any other upcard would find nothing, so it's skipped rather than performed
  // for show.
  const peekEligible = rules.dealerPeek && (dealerUpcard.rank === 1 || dealerUpcard.rank >= 10);
  const playerHasBlackjack = isBlackjack(playerRanks);
  const dealerHasBlackjack = peekEligible && isBlackjack(dealerCards.map((c) => c.rank));

  const baseState: BlackjackState = { ...state, shoe, roundSeq, handsPlayed: state.handsPlayed };

  if (playerHasBlackjack || dealerHasBlackjack) {
    const revealed = dealerCards.map((c, i) => (i === 1 ? { ...c, faceUp: true } : c));
    let result: SettlementResult;
    let payout: number;
    if (playerHasBlackjack && dealerHasBlackjack) {
      result = 'push';
      payout = intent.bet;
    } else if (playerHasBlackjack) {
      result = 'blackjack';
      payout = blackjackPayout(intent.bet, rules);
    } else {
      result = 'loss';
      payout = 0;
    }
    // A hand settled at deal time (a natural on either side) never reaches player-turn — its
    // `status` is `'blackjack'` for the player's own natural, else `'stood'` (a plain loss to a
    // dealer natural, or a push against a dealer natural of its own — neither is a bust and
    // neither took any action, so `'stood'` is the honest label for both).
    const hand: BlackjackHand = {
      cards: playerCards,
      bet: intent.bet,
      status: playerHasBlackjack ? 'blackjack' : 'stood',
      fromSplit: false,
      isSplitAces: false,
    };
    const outcomes: HandOutcome[] = [{ handIndex: 0, result, bet: intent.bet, payout }];
    events.push({ kind: 'natural-settlement', result });
    return {
      state: { ...baseState, handsPlayed: baseState.handsPlayed + 1, round: { dealerCards: revealed, playerHands: [hand], activeHandIndex: 0, phase: 'round-over', outcomes } },
      events,
    };
  }

  const hand: BlackjackHand = { cards: playerCards, bet: intent.bet, status: 'active', fromSplit: false, isSplitAces: false };
  return {
    state: { ...baseState, round: { dealerCards, playerHands: [hand], activeHandIndex: 0, phase: 'player-turn', outcomes: null } },
    events,
  };
}

function handleHit(state: BlackjackState, rules: BlackjackRules): ApplyResult<BlackjackState> {
  if (!canHit(state)) throw new Error('blackjack: cannot hit — no active hand awaiting a decision');
  const round = state.round as RoundState;
  const idx = round.activeHandIndex;
  const hand = round.playerHands[idx] as BlackjackHand;
  const drawn = draw(state.shoe);
  const shoe = drawn.shoe;
  const card = withFaceUp(drawn.card, true);
  const cards = [...hand.cards, card];
  const total = handTotal(cards.map((c) => c.rank));
  const status: HandStatus = total.isBust ? 'bust' : total.best === 21 ? 'stood' : 'active';
  const nextHand: BlackjackHand = { ...hand, cards, status };
  const playerHands = round.playerHands.map((h, i) => (i === idx ? nextHand : h));
  const events: GameEvent[] = [{ kind: total.isBust ? 'hand-bust' : 'card-dealt', handIndex: idx, suit: card.suit, rank: card.rank }];
  return settleOrAdvance({ ...state, shoe, round: { ...round, playerHands } }, rules, events);
}

function handleStand(state: BlackjackState, rules: BlackjackRules): ApplyResult<BlackjackState> {
  if (!canStand(state)) throw new Error('blackjack: cannot stand — no active hand awaiting a decision');
  const round = state.round as RoundState;
  const idx = round.activeHandIndex;
  const hand = round.playerHands[idx] as BlackjackHand;
  const playerHands = round.playerHands.map((h, i) => (i === idx ? { ...h, status: 'stood' as const } : h));
  return settleOrAdvance({ ...state, round: { ...round, playerHands } }, rules, [{ kind: 'hand-stand', handIndex: idx }]);
}

function handleDouble(state: BlackjackState, rules: BlackjackRules): ApplyResult<BlackjackState> {
  if (!canDouble(state)) throw new Error('blackjack: double is not available on this hand');
  const round = state.round as RoundState;
  const idx = round.activeHandIndex;
  const hand = round.playerHands[idx] as BlackjackHand;
  const drawn = draw(state.shoe);
  const shoe = drawn.shoe;
  const card = withFaceUp(drawn.card, true);
  const cards = [...hand.cards, card];
  const total = handTotal(cards.map((c) => c.rank));
  const status: HandStatus = total.isBust ? 'bust' : 'stood';
  const nextHand: BlackjackHand = { ...hand, cards, bet: hand.bet * 2, status };
  const playerHands = round.playerHands.map((h, i) => (i === idx ? nextHand : h));
  const events: GameEvent[] = [{ kind: 'hand-double', handIndex: idx, suit: card.suit, rank: card.rank }];
  return settleOrAdvance({ ...state, shoe, round: { ...round, playerHands } }, rules, events);
}

function handleSplit(state: BlackjackState, rules: BlackjackRules): ApplyResult<BlackjackState> {
  if (!canSplit(state)) throw new Error('blackjack: split is not available on this hand');
  const round = state.round as RoundState;
  const idx = round.activeHandIndex;
  const hand = round.playerHands[idx] as BlackjackHand;
  const originalCards = hand.cards;
  const wasAces = originalCards[0]?.rank === 1;

  let shoe = state.shoe;
  const draw1 = draw(shoe);
  shoe = draw1.shoe;
  const card1 = withFaceUp(draw1.card, true);
  const draw2 = draw(shoe);
  shoe = draw2.shoe;
  const card2 = withFaceUp(draw2.card, true);

  const acesOneCardOnly = wasAces && rules.splitAcesOneCardOnly;
  function finish(cards: Card[]): { cards: Card[]; status: HandStatus } {
    if (!acesOneCardOnly) return { cards, status: 'active' };
    const total = handTotal(cards.map((c) => c.rank));
    return { cards, status: total.isBust ? 'bust' : 'stood' };
  }
  const first = finish([originalCards[0] as Card, card1]);
  const second = finish([originalCards[1] as Card, card2]);

  const handA: BlackjackHand = { cards: first.cards, bet: hand.bet, status: first.status, fromSplit: true, isSplitAces: wasAces };
  const handB: BlackjackHand = { cards: second.cards, bet: hand.bet, status: second.status, fromSplit: true, isSplitAces: wasAces };

  const playerHands = [...round.playerHands.slice(0, idx), handA, handB, ...round.playerHands.slice(idx + 1)];
  const events: GameEvent[] = [
    { kind: 'hand-split', handIndex: idx, cardA: { suit: card1.suit, rank: card1.rank }, cardB: { suit: card2.suit, rank: card2.rank } },
  ];
  return settleOrAdvance({ ...state, shoe, round: { ...round, playerHands, activeHandIndex: idx } }, rules, events);
}

function handleSurrender(state: BlackjackState, rules: BlackjackRules): ApplyResult<BlackjackState> {
  if (!canSurrender(state)) throw new Error('blackjack: surrender is not available on this hand');
  const round = state.round as RoundState;
  const hand = round.playerHands[0] as BlackjackHand;
  const payout = Math.floor(hand.bet / 2);
  const revealed = round.dealerCards.map((c, i) => (i === 1 ? { ...c, faceUp: true } : c));
  const outcomes: HandOutcome[] = [{ handIndex: 0, result: 'surrender', bet: hand.bet, payout }];
  const nextHand: BlackjackHand = { ...hand, status: 'surrendered' };
  return {
    state: { ...state, handsPlayed: state.handsPlayed + 1, round: { dealerCards: revealed, playerHands: [nextHand], activeHandIndex: 0, phase: 'round-over', outcomes } },
    events: [{ kind: 'hand-surrender', handIndex: 0, payout }],
  };
}

function handleNextHand(state: BlackjackState): ApplyResult<BlackjackState> {
  if (!canNextHand(state)) throw new Error('blackjack: no settled round to clear — deal first');
  return { state: { ...state, round: null }, events: [{ kind: 'next-hand' }] };
}

// ── dispatch ────────────────────────────────────────────────────────────────────────────────

/**
 * `applyIntent` — the cartridge contract's required domain method. Exhaustive dispatch by
 * `intent.kind`; an unrecognized kind throws immediately rather than silently no-opping, the
 * same discipline `parlor-kernel/turns.mjs#createTurnReducer` documents for its own dispatch.
 * Pure: never mutates `state`, always returns a fresh object.
 */
export function applyIntent(state: BlackjackState, intent: BlackjackIntent): ApplyResult<BlackjackState> {
  const rules = rulesOf(state);
  switch (intent.kind) {
    case 'deal':
      return handleDeal(state, intent, rules);
    case 'hit':
      return handleHit(state, rules);
    case 'stand':
      return handleStand(state, rules);
    case 'double':
      return handleDouble(state, rules);
    case 'split':
      return handleSplit(state, rules);
    case 'surrender':
      return handleSurrender(state, rules);
    case 'next-hand':
      return handleNextHand(state);
    default: {
      const exhaustive: never = intent;
      throw new TypeError(`blackjack: no handler registered for intent kind "${(exhaustive as { kind: string }).kind}"`);
    }
  }
}
