/**
 * `types` — the shared vocabulary for the whole engine, one central file (crucible-service's
 * `types.mts` pattern, copied in shape).
 *
 * Kelly's Wager: a daily-seeded sequence of `WagerOfferSpec`s is offered from a practice-only
 * bankroll (`BankrollState.balance`). The player sizes a stake as a *fraction* of their current
 * balance for each offer in turn; committing resolves it against a true, deterministically
 * pre-computed win probability. Nothing here is real currency — see DESIGN.md's HARD ECONOMY
 * LINE section.
 *
 * A note on naming, per the house's plain-domain-names convention (crucible-service's own
 * `types.mts` header makes the same point about its corpus vocabulary): "wager", "stake",
 * "bankroll", "trap" are the game's own plain names, not a themed vocabulary layered over the
 * mechanics — there is no fictional skin here to keep separate from the engine, unlike crucible's
 * waidan/foam framing. The one place plain mechanics and in-game *presentation* diverge on
 * purpose is `WagerOfferSpec.framing`/`pitch` — see below.
 */

/** How a `WagerOfferSpec` is presented to the player. `probability` and `cost` are always the
 * true numbers — nothing in `wagers.mts` or `engine.mts` ever derives math from `framing` (see
 * `wagers.test.mts`'s "framing never leaks into math" coverage test). `framing` controls only the
 * `pitch` copy shown alongside those true numbers:
 *
 *   - `'value'` — a fairly-or-favorably priced offer, pitched plainly. Usually non-negative true
 *     edge, but not guaranteed (a fair-but-negative-edge "long shot", pitched honestly as one, is
 *     still `'value'` framing — `'value'` describes the *pitch's honesty*, not the edge's sign).
 *   - `'trap'` — an adversarially-framed offer: a negative-true-edge wager whose `pitch` text
 *     borrows the "juicy"/urgent language of predatory gacha-style pricing, while
 *     `probability`/`cost` sitting right next to it stay the plain true numbers regulators
 *     increasingly require disclosing (e.g. the EU Digital Fairness Act, the FTC's
 *     Genshin/Cognosphere settlement). The trap is entirely in the copy; the math is never
 *     hidden, obfuscated, or personalized-per-player. */
export type WagerFraming = 'value' | 'trap';

/** One offer in a day's seeded sequence — pure data, "rules as data" (crucible/solitaire's
 * `LevelSpec`/`VariantSpec` discipline): everything about what an offer *is* lives in this
 * record, nothing is inferred from position or hidden in code. */
export interface WagerOfferSpec {
  /** Stable id within one day's sequence, e.g. `"w3"`. */
  readonly id: string;
  /** Position in the day's offer sequence (0-based). */
  readonly index: number;
  /** True win probability in (0, 1) — the caller's honest estimate, per `kelly.mts`'s own
   * "provenance is the consumer's problem" rule; `wagers.mts` is that consumer, and this is
   * where the honesty commitment actually lives. */
  readonly probability: number;
  /** True cost in (0, 1): the price paid per $1-equivalent win contract (kelly.mts/odds.mts's
   * "probabilities-as-costs" convention). */
  readonly cost: number;
  readonly framing: WagerFraming;
  /** Short offer name shown in the UI, e.g. `"Coin flip, plus vig"`. */
  readonly label: string;
  /** The presentation copy — the only field `framing` is allowed to influence. */
  readonly pitch: string;
}

/** What actually happened when a `WagerOfferSpec` was resolved — the durable per-wager record a
 * `BankrollState` accumulates, and what `paths.mts`/grading read to reconstruct history. */
export interface WagerResolution {
  readonly offerIndex: number;
  readonly probability: number;
  readonly cost: number;
  /** Fraction of pre-stake balance committed, in [0, 1]. */
  readonly stakeFraction: number;
  readonly outcome: 'win' | 'lose';
  readonly balanceBefore: number;
  readonly balanceAfter: number;
  /** The true, unfractional Kelly optimum for this offer — the grading reference. */
  readonly kellyOptimalFraction: number;
}

/** The practice bankroll's whole state — a plain JSON `Cartridge` state (per
 * `@red-cup-engineering/cartridge/replay`'s `Cartridge<State, TIntent>` contract). */
export interface BankrollState {
  readonly seed: string;
  readonly configId: string;
  /** Which reseed generation this is, starting at 0. Only `new-run` advances it — see
   * `engine.mts`'s header for why a fresh run still needs to be a pure function of `seed`. */
  readonly runNumber: number;
  readonly offers: readonly WagerOfferSpec[];
  /** Index into `offers` of the wager currently on offer; equals `offers.length` once the day's
   * sequence is exhausted. */
  readonly offerIndex: number;
  /** The stake fraction currently staged for `offers[offerIndex]`, in [0, 1]. Freely reversible
   * (`adjust-stake`) up until `commit-stake`. */
  readonly pendingStakeFraction: number;
  readonly startingBalance: number;
  readonly balance: number;
  readonly resolutions: readonly WagerResolution[];
  readonly ruined: boolean;
  /** True once `offerIndex` has exhausted `offers`, or the bankroll is ruined — no further
   * `commit-stake`/`reroll-offer`/`adjust-stake` intents are legal past this point. */
  readonly finished: boolean;
}

export interface AdjustStakeIntent {
  readonly kind: 'adjust-stake';
  /** The new pending stake, as a fraction of current balance, in [0, 1]. */
  readonly fraction: number;
}

/** Skips `offers[offerIndex]` for the next offer in the seeded sequence, at a named,
 * quantified cost — the one deliberately-priced middle case in the disclosure typing: a named,
 * honest way to skip a trap, unlike predatory catalogs' hidden-odds or grind gates. */
export interface RerollOfferIntent {
  readonly kind: 'reroll-offer';
}

/** The one and only terminal action in the loop — the moment risk becomes real. */
export interface CommitStakeIntent {
  readonly kind: 'commit-stake';
}

/** Starts a fresh run from a new seed generation, zero cost. */
export interface NewRunIntent {
  readonly kind: 'new-run';
}

export type WagerIntent = AdjustStakeIntent | RerollOfferIntent | CommitStakeIntent | NewRunIntent;

/** Every `WagerIntent.kind` this game defines, exhaustively — `disclosure.mts`'s coverage test
 * walks this list, so a new intent kind added to the union above without a matching entry here
 * (and a matching `classify` case) fails CI rather than shipping unclassified. */
export const ALL_INTENT_KINDS = ['adjust-stake', 'reroll-offer', 'commit-stake', 'new-run'] as const;

/** One point on a bankroll trajectory: balance after `offerIndex` offers have been resolved
 * under some policy (0 = starting balance, before any wager). */
export interface PathPoint {
  readonly offerIndex: number;
  readonly balance: number;
}

/** The four counterfactual bankroll paths `paths.mts` produces over one day's offer sequence. */
export interface CounterfactualPaths {
  readonly yours: readonly PathPoint[];
  readonly kelly: readonly PathPoint[];
  readonly flat: readonly PathPoint[];
  readonly allIn: readonly PathPoint[];
}

/** The three-way disclosure typing (`wilder-conceptions-01.md` item 7, "Terminal Bets"). */
export type SpendType = 'reversible' | 'priced' | 'terminal';

/** A priced intent's named, quantified cost — shown as a number, never hidden. */
export interface NamedCost {
  readonly amount: number;
  readonly resource: 'bankroll';
  readonly description: string;
}
