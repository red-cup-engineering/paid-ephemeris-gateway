/**
 * blackjack/ev.mts — the house signature: live EV coaching computed server-side against the
 * table's own real, drawn-down shoe, via `@red-cup-engineering/card-table/blackjack#handEV`'s
 * exact recursive enumeration (never a static basic-strategy lookup table). `table.mts` calls
 * `computeHouseMath` once per state read while a hand is awaiting a decision; the client's
 * "House Math" panel (off by default, remembered per session — see `web/js/blackjack.mjs`)
 * only ever renders what this module actually computed.
 */
import { createShoeComposition, removeRanksFromComposition, handEV, type Composition, type HandEVResult } from '@red-cup-engineering/card-table/blackjack';
import type { Shoe } from '@red-cup-engineering/card-table/shoe';
import type { BlackjackHand } from './engine.mts';
import type { BlackjackRules } from './rules.mts';

export interface HouseMath {
  /** Expected value per unit of the *original* bet: `stand`/`hit` in `[-1, 1]`, `double`/
   *  `split` in `[-2, 2]` (twice the stake is at risk), `null` when the action genuinely is not
   *  on the table right now (already excluded by the current rules, not just by card count). */
  readonly ev: HandEVResult;
  /** Whichever of the still-legal actions has the highest EV — the one basic strategy would
   *  take here, computed fresh rather than memorized. */
  readonly bestAction: 'stand' | 'hit' | 'double' | 'split';
}

/**
 * The composition of every card the shoe has *not yet dealt*. Cards already drawn — visible or
 * not (the dealer's own hole card included) — are excluded: an unseen hole card cannot be
 * redrawn, so counting it as "still out there" would overstate what a real next card could be.
 * `shoe.cards.slice(0, shoe.cursor)` is exactly "every card this shoe has dealt since its last
 * shuffle," which is what `removeRanksFromComposition` wants.
 */
export function shoeComposition(shoe: Shoe, decks: number): Composition {
  const dealtRanks = shoe.cards.slice(0, shoe.cursor).map((c) => c.rank);
  return removeRanksFromComposition(createShoeComposition(decks), dealtRanks);
}

export interface HouseMathOptions {
  /** Whether double is a legal action on this hand under the table's actual rules right now
   *  (not just "exactly 2 cards" — also double-after-split, etc.) — see `engine.mts#canDouble`.
   *  `handEV` itself only knows card-count eligibility, not the house's own rule config, so this
   *  is threaded in from the caller rather than re-derived here. */
  readonly allowDouble: boolean;
  /** Same idea for split — see `engine.mts#canSplit` (also covers `maxSplitHands`, resplit-aces,
   *  and same-value pairing, none of which `handEV` alone knows about). */
  readonly allowSplit: boolean;
}

/** `null` when the hand is not currently awaiting a decision (finished, or busted) — there is
 *  no action to price. Otherwise the exact EV of every action actually available right now. */
export function computeHouseMath(
  hand: BlackjackHand,
  dealerUpcardRank: number,
  shoe: Shoe,
  rules: BlackjackRules,
  options: HouseMathOptions,
): HouseMath | null {
  if (hand.status !== 'active') return null;
  const ranks = hand.cards.map((c) => c.rank);
  const composition = shoeComposition(shoe, rules.decks);
  const raw = handEV(ranks, dealerUpcardRank, composition, { hitSoft17: rules.hitSoft17, sameRankOnly: false });
  const ev: HandEVResult = {
    stand: raw.stand,
    hit: raw.hit,
    double: options.allowDouble ? raw.double : null,
    split: options.allowSplit ? raw.split : null,
  };

  let bestAction: HouseMath['bestAction'] = 'stand';
  let bestValue = ev.stand;
  if (ev.hit > bestValue) {
    bestValue = ev.hit;
    bestAction = 'hit';
  }
  if (ev.double !== null && ev.double > bestValue) {
    bestValue = ev.double;
    bestAction = 'double';
  }
  if (ev.split !== null && ev.split > bestValue) {
    bestValue = ev.split;
    bestAction = 'split';
  }
  return { ev, bestAction };
}
