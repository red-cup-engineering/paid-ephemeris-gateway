/**
 * blackjack/rules.mts — house rules as data, not scattered `if`s in the engine. Every ruleset
 * `engine.mts` ever consults comes from one of the two named entries here, selected by the
 * cartridge `configId` a table is created with — the same "rules-as-data, keyed by configId"
 * shape `parlor-service/src/games/pig/rules.mts` uses for `PIG_RULES`. Changing a number here
 * (say, moving to 6:5 blackjack, or a 5-deck shoe) never touches `engine.mts` itself.
 */

export interface BlackjackRules {
  /** The ruleset's own id — doubles as the cartridge `configId` a table was created with. */
  readonly id: string;
  readonly displayName: string;
  /** Number of standard 52-card decks in the shoe. */
  readonly decks: number;
  /** Fraction of the shoe dealt before `needsShuffle` reports true (advisory — see
   *  `@red-cup-engineering/card-table/shoe`; the table reshuffles between rounds only). */
  readonly penetration: number;
  /** `true` = dealer hits soft 17 (H17, house-favorable); `false` = dealer stands on all 17s
   *  (S17, player-favorable, the more common live-table rule and this ruleset's default). */
  readonly hitSoft17: boolean;
  /** Blackjack pays `blackjackPayoutNum`/`blackjackPayoutDen` times the bet, on top of the
   *  bet itself — the standard house is 3:2; some houses cut this to 6:5. */
  readonly blackjackPayoutNum: number;
  readonly blackjackPayoutDen: number;
  /** Whether the dealer peeks under an Ace/10 upcard for a natural before the player acts —
   *  standard US double-deck-and-up practice, and what makes "player busts into a dealer
   *  blackjack" impossible (the player never gets to act at all in that case). */
  readonly dealerPeek: boolean;
  readonly doubleAllowed: boolean;
  /** Whether a hand created by a split may still double down. */
  readonly doubleAfterSplit: boolean;
  readonly splitAllowed: boolean;
  /** Total hands a player may reach via splitting (the original hand counts as one) — 4 means
   *  up to 3 splits total. */
  readonly maxSplitHands: number;
  /** Whether a pair of split Aces may itself be split again. */
  readonly resplitAces: boolean;
  /** Standard rule: each Ace of a split-Aces pair receives exactly one more card and then the
   *  hand is done — no further hits, no blackjack bonus even if the resulting total is 21. */
  readonly splitAcesOneCardOnly: boolean;
  /** Late surrender: forfeit half the bet instead of playing the hand out, allowed only as the
   *  very first decision on a two-card, unsplit hand. */
  readonly surrenderAllowed: boolean;
  readonly minBet: number;
  readonly maxBet: number;
  readonly defaultBet: number;
}

const BASE: BlackjackRules = {
  id: 'default',
  displayName: 'Blackjack (S17)',
  decks: 6,
  penetration: 0.75,
  hitSoft17: false,
  blackjackPayoutNum: 3,
  blackjackPayoutDen: 2,
  dealerPeek: true,
  doubleAllowed: true,
  doubleAfterSplit: true,
  splitAllowed: true,
  maxSplitHands: 4,
  resplitAces: false,
  splitAcesOneCardOnly: true,
  surrenderAllowed: true,
  minBet: 5,
  maxBet: 1000,
  defaultBet: 25,
};

/** Every ruleset a table may be created with, keyed by the cartridge `configId`. */
export const BLACKJACK_RULESETS: Readonly<Record<string, BlackjackRules>> = {
  default: BASE,
  h17: { ...BASE, id: 'h17', displayName: 'Blackjack (H17)', hitSoft17: true },
};

export const DEFAULT_RULESET_ID = 'default';

/** Resolve a `configId` (as the cartridge contract's `createEngine(seed, configId?)` receives
 *  it) to a concrete ruleset. An unknown id fails loudly rather than silently falling back — the
 *  same "new kind, no handler, fails loudly" discipline `parlor-kernel/turns.mjs`'s
 *  `createTurnReducer` uses for intent dispatch, applied here to ruleset selection. */
export function resolveRules(configId?: string): BlackjackRules {
  const id = configId === undefined || configId.length === 0 ? DEFAULT_RULESET_ID : configId;
  const rules = BLACKJACK_RULESETS[id];
  if (rules === undefined) {
    throw new RangeError(`blackjack: unknown ruleset configId "${id}"`);
  }
  return rules;
}
