/**
 * `engine` — the one rules engine (DESIGN.md, "One rules engine, variant rules as data").
 *
 * Every exported function here reads a `VariantSpec` value and a `GameState` value; none of
 * them ever compares a variant's `id` string or otherwise special-cases a named game. Klondike,
 * FreeCell, and the three Spider suit-counts are all just entries in `VARIANTS` built from the
 * same six generic knobs (`PileSpec`, `BuildRule`, `sequenceMove`, `redeal`, `win`). Where two
 * *mechanisms* genuinely differ (Klondike's stock deals into a single `waste` pile one/three at
 * a time; Spider's stock deals one card face-up onto every tableau pile at once; FreeCell has no
 * stock at all) the dispatch is on the *declared pile shape* — does this variant have a `waste`
 * pile? a `stock` pile? — never on the variant's name. That is the concrete, testable form of
 * the thesis's "never `if (variant === "klondike")`" promise.
 *
 * Two deliberate, documented extensions beyond the `VariantSpec` sketch in DESIGN.md's Decisions
 * section (that sketch is explicitly a "shape", not a final contract):
 *
 *  - `runBuild?: BuildRule` — what a *group* of cards must look like to be picked up and moved
 *    together, as opposed to `tableauBuild`, which is what a single card must look like to be
 *    *dropped* on a pile. For Klondike/FreeCell these coincide (a run is alternating-color
 *    descending, same as any single legal drop) so `runBuild` is omitted and `tableauBuild` is
 *    reused. Spider genuinely needs both to differ: any card may be *dropped* on any next-higher
 *    rank regardless of suit (`tableauBuild.color: "any"`), but only a same-suit descending run
 *    may be picked up and moved as a *group* (`runBuild.color: "same-suit"`) — real Spider rules,
 *    not a corner DESIGN.md's single `tableauBuild` field can express. Folding grouping into
 *    `tableauBuild` would make single-card placement wrongly reject loose-suit drops, or make
 *    group-pickup wrongly accept mixed-suit runs; splitting the two fields is the smallest change
 *    that keeps both correct without a variant-id branch.
 *  - `drawCount?: number` — Klondike's headline knob (draw 1 vs draw 3), read only by the
 *    structural "does this variant have a `waste` pile" branch in `drawFromStock`.
 *
 * Four more data-driven capabilities, added for the discard-style games (Golf, Pyramid, TriPeaks)
 * without a single per-variant branch anywhere in this file — each is a new *value* an existing
 * enum can take, read the same generic way every other value already is:
 *
 *  - `BuildRule.order: 'adjacent'` — Golf/TriPeaks' "one rank away, either direction" sequencing
 *    (`|head.rank - top.rank| === 1`, no wraparound). `BuildRule.order: 'sum-to-13'` — Pyramid's
 *    pairing (`head.rank + top.rank === 13`, or a King discarded alone since nothing pairs with a
 *    13). `BuildRule.order: 'none'` — "this pile is never a legal drop target," for the Golf/
 *    Pyramid/TriPeaks tableau, which players only ever remove *from*, never place onto.
 *  - `PileSpec.blockedBy?: readonly string[]` — pile ids that must all be empty before *this*
 *    pile's card counts as exposed. Read by one `isExposed` gate at the top of `legalTargets`;
 *    every existing variant omits it and is completely unaffected. Pyramid's 7-row triangle and
 *    TriPeaks' three-peaks-over-a-shared-base board are both just `PileSpec[]` built with this
 *    field set per position — no board-shape code lives in the engine, only in each variant's own
 *    builder function.
 *  - `VariantSpec.win: 'tableau-cleared'` — Golf/Pyramid/TriPeaks win the instant every `tableau`
 *    pile is empty; unlike `'all-foundations-full'` the stock/waste are allowed to still hold
 *    cards. A new arm in `checkWin`, gated on this value, same as Spider's arm is gated on
 *    `'all-thirteen-sequences-cleared'`.
 *  - A `kind: 'waste'` pile becomes a legal manual move target — via `variant.foundationBuild` —
 *    exactly when `variant.win === 'tableau-cleared'`. Every other variant's waste stays a pure
 *    draw destination (`acceptsMove`'s default case still rejects it), so this only ever activates
 *    for the three variants that declare the shape it's built for.
 *
 * Pyramid's pairing is deliberately **waste-anchored**: a pair is always "the current waste-top
 * card plus one exposed tableau card," never two tableau cards directly. Two tableau piles pairing
 * directly with each other doesn't fit `applyMove`'s one-source/one-destination shape without both
 * piles vanishing at once (which would silently un-block whatever the *target* pile was blocking,
 * while leaving stale cards sitting in it) — the waste-anchored form sidesteps that because only
 * the *source* pile ever needs to become empty. This is a documented simplification of traditional
 * Pyramid, not the full free-pairing ruleset; see DESIGN.md.
 *
 * `autoFinishAvailable`'s safe-autoplay condition is implemented as the well-known solitaire rule
 * (a card is safe to send to its foundation once *both* opposite-color foundations sit at rank
 * >= this card's rank - 1, which guarantees no opposite-color card of lower rank can still need
 * it as a tableau landing spot) rather than DESIGN.md's prose verbatim, whose "remaining card's
 * rank >= other rank - 1" phrasing inverts the comparison direction of the standard rule and
 * broadens "the other three suits" to all three rather than the two opposite-color ones that are
 * actually load-bearing for the safety argument. Same-color foundation progress is irrelevant to
 * whether a card is still needed underneath a tableau build, so only the two opposite-color
 * foundations gate safety.
 */
import type { Card, Rank, Suit } from './cards.mts';
import { cardColor, shuffledDeck } from './cards.mts';

// -------------------------------------------------------------------------------------------
// variant data
// -------------------------------------------------------------------------------------------

export interface PileSpec {
  readonly id: string;
  readonly kind: 'stock' | 'waste' | 'foundation' | 'tableau' | 'freecell';
  readonly dealFaceUp: number; // cards dealt face-up when this pile is initially filled
  readonly dealFaceDown: number; // cards dealt face-down beneath them
  /** Pile ids that must ALL be empty before this pile's card is exposed (pickable). Omitted or
   * empty means always exposed. See module doc — Pyramid/TriPeaks only. */
  readonly blockedBy?: readonly string[];
}

export interface BuildRule {
  readonly order: 'descending' | 'ascending' | 'any' | 'adjacent' | 'sum-to-13' | 'none';
  readonly color: 'alternating' | 'same-suit' | 'any';
  readonly base: 'any-rank' | 'king-only' | 'ace-only' | 'empty-accepts-any';
}

export interface VariantSpec {
  readonly id: string;
  readonly name: string;
  readonly decks: 1 | 2;
  readonly suitsInPlay: 1 | 2 | 4;
  readonly piles: readonly PileSpec[];
  readonly dealOrder: readonly string[];
  readonly tableauBuild: BuildRule;
  /** What counts as a movable group. Defaults to `tableauBuild` when omitted. See module doc. */
  readonly runBuild?: BuildRule;
  readonly foundationBuild: BuildRule;
  readonly sequenceMove: 'single-card' | 'any-legal-run' | 'supermove' | 'any-faceup-group';
  readonly redeal: { readonly stockRecycles: number | 'unlimited' } | null;
  readonly win: 'all-foundations-full' | 'all-thirteen-sequences-cleared' | 'tableau-cleared';
  /** Klondike only: cards drawn from stock to waste per draw. Ignored by every other variant. */
  readonly drawCount?: number;
}

function tableauPiles(n: number, faceDown: (i: number) => number, faceUp: (i: number) => number): PileSpec[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `tableau-${i}`,
    kind: 'tableau' as const,
    dealFaceDown: faceDown(i),
    dealFaceUp: faceUp(i),
  }));
}

function foundationPiles(n: number): PileSpec[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `foundation-${i}`,
    kind: 'foundation' as const,
    dealFaceDown: 0,
    dealFaceUp: 0,
  }));
}

function klondikeVariant(id: string, name: string, drawCount: number): VariantSpec {
  const tableau = tableauPiles(7, (i) => i, () => 1);
  return {
    id,
    name,
    decks: 1,
    suitsInPlay: 4,
    piles: [
      ...tableau,
      { id: 'stock', kind: 'stock', dealFaceUp: 0, dealFaceDown: 0 },
      { id: 'waste', kind: 'waste', dealFaceUp: 0, dealFaceDown: 0 },
      ...foundationPiles(4),
    ],
    dealOrder: tableau.map((p) => p.id),
    tableauBuild: { order: 'descending', color: 'alternating', base: 'king-only' },
    foundationBuild: { order: 'ascending', color: 'same-suit', base: 'ace-only' },
    sequenceMove: 'any-legal-run',
    redeal: { stockRecycles: 'unlimited' },
    win: 'all-foundations-full',
    drawCount,
  };
}

function freecellVariant(): VariantSpec {
  const tableau = tableauPiles(8, () => 0, (i) => (i < 4 ? 7 : 6));
  const freecells = Array.from({ length: 4 }, (_, i) => ({
    id: `freecell-${i}`,
    kind: 'freecell' as const,
    dealFaceUp: 0,
    dealFaceDown: 0,
  }));
  return {
    id: 'freecell',
    name: 'FreeCell',
    decks: 1,
    suitsInPlay: 4,
    piles: [...tableau, ...freecells, ...foundationPiles(4)],
    dealOrder: tableau.map((p) => p.id),
    tableauBuild: { order: 'descending', color: 'alternating', base: 'empty-accepts-any' },
    foundationBuild: { order: 'ascending', color: 'same-suit', base: 'ace-only' },
    sequenceMove: 'supermove',
    redeal: null,
    win: 'all-foundations-full',
  };
}

function spiderVariant(id: string, name: string, suitsInPlay: 1 | 2 | 4): VariantSpec {
  const tableau = tableauPiles(10, (i) => (i < 4 ? 5 : 4), () => 1);
  return {
    id,
    name,
    decks: 2,
    suitsInPlay,
    piles: [...tableau, { id: 'stock', kind: 'stock', dealFaceUp: 0, dealFaceDown: 0 }, ...foundationPiles(8)],
    dealOrder: tableau.map((p) => p.id),
    tableauBuild: { order: 'descending', color: 'any', base: 'empty-accepts-any' },
    runBuild: { order: 'descending', color: 'same-suit', base: 'empty-accepts-any' },
    // Spider's foundation is never a manual drop target (see acceptsMove) — this shape is kept
    // only so the field is present and self-describing; `all-thirteen-sequences-cleared` is what
    // actually gates whether foundation piles accept anything.
    foundationBuild: { order: 'descending', color: 'same-suit', base: 'king-only' },
    sequenceMove: 'any-legal-run',
    redeal: null,
    win: 'all-thirteen-sequences-cleared',
  };
}

/** Yukon: Klondike's tableau shape, only deeper and (per pile) mostly face-up, and no stock at
 * all — the whole deck is dealt out. Pile `i` (0-indexed) gets `i` face-down cards under 5
 * face-up (pile 0 is a single face-up card, no face-down beneath it): totals 1,6,7,8,9,10,11 —
 * 52 cards exactly, nothing left for a stock pile.
 *
 * `sequenceMove: 'any-faceup-group'` is Yukon's real, defining rule: pick up *any* face-up card
 * together with everything dealt on top of it, in whatever order they happen to sit, and move
 * that whole clump as one group onto a pile whose top accepts the group's bottom card — no
 * internal run-shape requirement, unlike every other multi-card move mode this engine has. This
 * was verified empirically, not assumed: an earlier build reused Klondike's `'any-legal-run'`
 * (only a genuinely ordered run may move as a group) for Yukon too, and the 1000-random-legal-
 * move fuzz test exposed it immediately — most seeds stalled out after 0-3 moves with the deal's
 * face-up cards rarely already in run order, a much weaker game than real Yukon. */
function yukonVariant(): VariantSpec {
  const tableau = tableauPiles(
    7,
    (i) => (i === 0 ? 0 : i),
    (i) => (i === 0 ? 1 : 5),
  );
  return {
    id: 'yukon',
    name: 'Yukon',
    decks: 1,
    suitsInPlay: 4,
    piles: [...tableau, ...foundationPiles(4)],
    dealOrder: tableau.map((p) => p.id),
    tableauBuild: { order: 'descending', color: 'alternating', base: 'king-only' },
    foundationBuild: { order: 'ascending', color: 'same-suit', base: 'ace-only' },
    sequenceMove: 'any-faceup-group',
    redeal: null,
    win: 'all-foundations-full',
  };
}

/** Forty Thieves: two decks, ten tableau columns of four cards each (all dealt face up — no
 * hidden cards), the other 64 cards in the stock, drawn one at a time to a waste pile, eight
 * foundations (one pair per suit, since two decks means two of every ace). Strict tradition
 * allows only single-card tableau moves and no redeal at all; this build keeps the no-redeal rule
 * (`redeal: null`) but allows same-suit run moves (`sequenceMove: 'any-legal-run'`, reusing
 * `tableauBuild` as `runBuild` since the two already coincide) — a common, documented "relaxed"
 * house rule, not the single-card-only strict original. */
function fortyThievesVariant(): VariantSpec {
  const tableau = tableauPiles(
    10,
    () => 0,
    () => 4,
  );
  return {
    id: 'forty-thieves',
    name: 'Forty Thieves',
    decks: 2,
    suitsInPlay: 4,
    piles: [
      ...tableau,
      { id: 'stock', kind: 'stock', dealFaceUp: 0, dealFaceDown: 0 },
      { id: 'waste', kind: 'waste', dealFaceUp: 0, dealFaceDown: 0 },
      ...foundationPiles(8),
    ],
    dealOrder: tableau.map((p) => p.id),
    tableauBuild: { order: 'descending', color: 'same-suit', base: 'empty-accepts-any' },
    foundationBuild: { order: 'ascending', color: 'same-suit', base: 'ace-only' },
    sequenceMove: 'any-legal-run',
    redeal: null,
    win: 'all-foundations-full',
    drawCount: 1,
  };
}

/** Golf: seven columns of five cards, all dealt face up, no build-onto-tableau ever
 * (`tableauBuild.order: 'none'`) — a column is only ever a *source*. One "waste" pile starts with
 * a single dealt starter card and accepts any tableau card one rank away in either direction
 * (`foundationBuild.order: 'adjacent'`, no wraparound: Queen-King is legal, King-Ace is not); the
 * rest of the deck sits in the stock, drawn one at a time onto the same waste pile whenever no
 * tableau card is playable. Win is `'tableau-cleared'`: all seven columns empty, stock/waste
 * contents irrelevant. No redeal (a single pass through the stock) — the harder, more common
 * ruleset, documented rather than defaulted into silently. */
function golfVariant(): VariantSpec {
  const tableau = tableauPiles(
    7,
    () => 0,
    () => 5,
  );
  return {
    id: 'golf',
    name: 'Golf',
    decks: 1,
    suitsInPlay: 4,
    piles: [
      ...tableau,
      { id: 'stock', kind: 'stock', dealFaceUp: 0, dealFaceDown: 0 },
      { id: 'waste', kind: 'waste', dealFaceUp: 1, dealFaceDown: 0 },
    ],
    dealOrder: [...tableau.map((p) => p.id), 'waste'],
    tableauBuild: { order: 'none', color: 'any', base: 'any-rank' },
    foundationBuild: { order: 'adjacent', color: 'any', base: 'any-rank' },
    sequenceMove: 'single-card',
    redeal: null,
    win: 'tableau-cleared',
  };
}

/** TriPeaks: the standard 28-card three-peaks-over-a-shared-base board — three independent small
 * pyramids (rows of 1, 2, 3 cards; `peak{k}-0`, `peak{k}-1-{0,1}`, `peak{k}-2-{0,1,2}`) sitting
 * atop one shared 10-card bottom row (`base-0..9`) that the peaks' third rows overlap into (peak
 * `k`'s three row-2 cards each block a *pair* of adjacent `base` indices starting at `3k`, so
 * `base-3` is shared between peak 0 and peak 1, `base-6` between peak 1 and peak 2 — 3×4 slots
 * minus 2 shared seams = 10, matching the real board's card count). All 28 dealt face up (open
 * information, like Golf); one starter card dealt to the waste; the remaining 23 cards in the
 * stock. Same `'adjacent'`/`'tableau-cleared'` rules as Golf — TriPeaks' one genuinely new
 * ingredient versus Golf is the `blockedBy` exposure gate: a peak/base card can't be played (or
 * even offered as a move source) until every id in its `blockedBy` list is empty. */
function triPeaksVariant(): VariantSpec {
  const piles: PileSpec[] = [];
  const dealOrder: string[] = [];
  const addPile = (id: string, blockedBy?: readonly string[]): void => {
    piles.push({ id, kind: 'tableau', dealFaceUp: 1, dealFaceDown: 0, blockedBy });
    dealOrder.push(id);
  };
  const apex = (k: number): string => `peak${k}-0`;
  const r1 = (k: number, p: number): string => `peak${k}-1-${p}`;
  const r2 = (k: number, p: number): string => `peak${k}-2-${p}`;
  const base = (i: number): string => `base-${i}`;

  for (let k = 0; k < 3; k++) addPile(apex(k), [r1(k, 0), r1(k, 1)]);
  for (let k = 0; k < 3; k++) for (let p = 0; p < 2; p++) addPile(r1(k, p), [r2(k, p), r2(k, p + 1)]);
  for (let k = 0; k < 3; k++) for (let p = 0; p < 3; p++) addPile(r2(k, p), [base(3 * k + p), base(3 * k + p + 1)]);
  for (let i = 0; i < 10; i++) addPile(base(i)); // shared bottom row: nothing left to block it

  piles.push({ id: 'waste', kind: 'waste', dealFaceUp: 1, dealFaceDown: 0 });
  dealOrder.push('waste');
  piles.push({ id: 'stock', kind: 'stock', dealFaceUp: 0, dealFaceDown: 0 });

  return {
    id: 'tripeaks',
    name: 'TriPeaks',
    decks: 1,
    suitsInPlay: 4,
    piles,
    dealOrder,
    tableauBuild: { order: 'none', color: 'any', base: 'any-rank' },
    foundationBuild: { order: 'adjacent', color: 'any', base: 'any-rank' },
    sequenceMove: 'single-card',
    redeal: null,
    win: 'tableau-cleared',
  };
}

/** Pyramid: the standard 7-row triangle, 28 cards (`pyr-{row}-{pos}`, row 0 is the single-card
 * apex, row 6 is the 7-card base), every card dealt face up. Row `r` position `p` is blocked by
 * row `r+1` positions `p` and `p+1` (the two cards it visually rests on); the base row has no
 * blockers and is always exposed. The waste pile starts *empty* (no starter card, unlike Golf/
 * TriPeaks) and the other 24 cards sit in the stock. `foundationBuild.order: 'sum-to-13'` is the
 * pairing rule — see the module doc's note on why pairing here is waste-anchored (always "current
 * waste-top card + one exposed pyramid card," never two pyramid cards directly) rather than
 * traditional Pyramid's free pairing between any two exposed cards. Win is `'tableau-cleared'`:
 * pyramid empty: stock/waste may still hold cards, exactly like real Pyramid. No redeal — a
 * single pass through the stock, the harder/"Vegas-style" ruleset. */
function pyramidVariant(): VariantSpec {
  const piles: PileSpec[] = [];
  const dealOrder: string[] = [];
  const id = (r: number, p: number): string => `pyr-${r}-${p}`;
  for (let r = 0; r < 7; r++) {
    for (let p = 0; p <= r; p++) {
      const blockedBy = r < 6 ? [id(r + 1, p), id(r + 1, p + 1)] : undefined;
      piles.push({ id: id(r, p), kind: 'tableau', dealFaceUp: 1, dealFaceDown: 0, blockedBy });
      dealOrder.push(id(r, p));
    }
  }
  piles.push({ id: 'waste', kind: 'waste', dealFaceUp: 0, dealFaceDown: 0 });
  piles.push({ id: 'stock', kind: 'stock', dealFaceUp: 0, dealFaceDown: 0 });
  return {
    id: 'pyramid',
    name: 'Pyramid',
    decks: 1,
    suitsInPlay: 4,
    piles,
    dealOrder,
    tableauBuild: { order: 'none', color: 'any', base: 'any-rank' },
    foundationBuild: { order: 'sum-to-13', color: 'any', base: 'any-rank' },
    sequenceMove: 'single-card',
    redeal: null,
    win: 'tableau-cleared',
  };
}

export const KLONDIKE_DRAW1: VariantSpec = klondikeVariant('klondike-draw1', 'Klondike (Draw 1)', 1);
export const KLONDIKE_DRAW3: VariantSpec = klondikeVariant('klondike-draw3', 'Klondike (Draw 3)', 3);
export const FREECELL: VariantSpec = freecellVariant();
export const SPIDER_1SUIT: VariantSpec = spiderVariant('spider-1suit', 'Spider (1 Suit)', 1);
export const SPIDER_2SUIT: VariantSpec = spiderVariant('spider-2suit', 'Spider (2 Suit)', 2);
export const SPIDER_4SUIT: VariantSpec = spiderVariant('spider-4suit', 'Spider (4 Suit)', 4);
export const YUKON: VariantSpec = yukonVariant();
export const FORTY_THIEVES: VariantSpec = fortyThievesVariant();
export const GOLF: VariantSpec = golfVariant();
export const TRIPEAKS: VariantSpec = triPeaksVariant();
export const PYRAMID: VariantSpec = pyramidVariant();

export const VARIANT_LIST: readonly VariantSpec[] = [
  KLONDIKE_DRAW1,
  KLONDIKE_DRAW3,
  FREECELL,
  SPIDER_1SUIT,
  SPIDER_2SUIT,
  SPIDER_4SUIT,
  YUKON,
  FORTY_THIEVES,
  GOLF,
  TRIPEAKS,
  PYRAMID,
];

export const VARIANTS: Readonly<Record<string, VariantSpec>> = Object.fromEntries(
  VARIANT_LIST.map((v) => [v.id, v]),
);

function pileSpec(variant: VariantSpec, id: string): PileSpec {
  const spec = variant.piles.find((p) => p.id === id);
  if (!spec) throw new Error(`unknown pile "${id}" for variant "${variant.id}"`);
  return spec;
}

// -------------------------------------------------------------------------------------------
// game state
// -------------------------------------------------------------------------------------------

export interface Move {
  readonly from: string;
  readonly to: string;
  readonly count: number;
}

export interface LogEntry extends Move {
  readonly seq: number;
  readonly kind: 'move' | 'draw' | 'redeal' | 'deal-row';
  readonly ts: number;
}

export interface GameState {
  readonly seed: string;
  readonly variantId: string;
  readonly piles: Readonly<Record<string, readonly Card[]>>;
  readonly log: readonly LogEntry[];
  readonly cursor: number;
  readonly redealsUsed: number;
}

/** `deal(seed, variant): TableState` per DESIGN.md's module map. */
export function dealTable(seed: string, variant: VariantSpec): GameState {
  const deck = shuffledDeck(seed, variant.decks, variant.suitsInPlay);
  const piles: Record<string, Card[]> = {};
  for (const p of variant.piles) piles[p.id] = [];

  const totals = new Map<string, number>();
  const received = new Map<string, number>();
  for (const id of variant.dealOrder) {
    const spec = pileSpec(variant, id);
    totals.set(id, spec.dealFaceDown + spec.dealFaceUp);
    received.set(id, 0);
  }

  let idx = 0;
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const id of variant.dealOrder) {
      const total = totals.get(id)!;
      const got = received.get(id)!;
      if (got < total) {
        piles[id]!.push({ ...deck[idx]! });
        idx++;
        received.set(id, got + 1);
        progressed = true;
      }
    }
  }

  for (const id of variant.dealOrder) {
    const spec = pileSpec(variant, id);
    const arr = piles[id]!;
    for (let i = Math.max(0, arr.length - spec.dealFaceUp); i < arr.length; i++) {
      arr[i] = { ...arr[i]!, faceUp: true };
    }
  }

  const stock = variant.piles.find((p) => p.kind === 'stock');
  if (stock) {
    while (idx < deck.length) {
      piles[stock.id]!.push({ ...deck[idx]! });
      idx++;
    }
  }

  return { seed, variantId: variant.id, piles, log: [], cursor: 0, redealsUsed: 0 };
}

// -------------------------------------------------------------------------------------------
// move legality
// -------------------------------------------------------------------------------------------

function isValidRunOrder(rule: BuildRule, cards: readonly Card[]): boolean {
  for (let i = 0; i < cards.length - 1; i++) {
    const lower = cards[i]!; // deeper in the pile, placed first
    const upper = cards[i + 1]!; // sits on top of `lower`
    const rankOk =
      rule.order === 'descending'
        ? upper.rank === lower.rank - 1
        : rule.order === 'ascending'
          ? upper.rank === lower.rank + 1
          : rule.order === 'adjacent'
            ? Math.abs(upper.rank - lower.rank) === 1
            : rule.order === 'none' || rule.order === 'sum-to-13'
              ? false // neither "never accepts" nor pairwise-summing is a coherent multi-card run
              : true;
    const colorOk =
      rule.color === 'alternating'
        ? cardColor(upper) !== cardColor(lower)
        : rule.color === 'same-suit'
          ? upper.suit === lower.suit
          : true;
    if (!rankOk || !colorOk) return false;
  }
  return true;
}

function buildAccepts(rule: BuildRule, targetPile: readonly Card[], head: Card): boolean {
  if (rule.order === 'none') return false; // Golf/Pyramid/TriPeaks tableau: never a drop target
  if (rule.order === 'sum-to-13') {
    // Pyramid pairing (waste-anchored — see module doc): a King is discarded alone (nothing pairs
    // with a 13), any other rank needs a waste-top partner whose rank completes the sum to 13.
    if (head.rank === 13) return true;
    if (targetPile.length === 0) return false;
    return head.rank + targetPile[targetPile.length - 1]!.rank === 13;
  }
  if (targetPile.length === 0) {
    switch (rule.base) {
      case 'king-only':
        return head.rank === 13;
      case 'ace-only':
        return head.rank === 1;
      case 'any-rank':
      case 'empty-accepts-any':
      default:
        return true;
    }
  }
  const top = targetPile[targetPile.length - 1]!;
  const rankOk =
    rule.order === 'descending'
      ? head.rank === top.rank - 1
      : rule.order === 'ascending'
        ? head.rank === top.rank + 1
        : rule.order === 'adjacent'
          ? Math.abs(head.rank - top.rank) === 1
          : true;
  const colorOk =
    rule.color === 'alternating' ? cardColor(head) !== cardColor(top) : rule.color === 'same-suit' ? head.suit === top.suit : true;
  return rankOk && colorOk;
}

function maxSupermoveSize(variant: VariantSpec, state: GameState, destId: string): number {
  const freecellIds = variant.piles.filter((p) => p.kind === 'freecell').map((p) => p.id);
  const tableauIds = variant.piles.filter((p) => p.kind === 'tableau').map((p) => p.id);
  const emptyFreecells = freecellIds.filter((id) => (state.piles[id]?.length ?? 0) === 0).length;
  const emptyTableau = tableauIds.filter((id) => id !== destId && (state.piles[id]?.length ?? 0) === 0).length;
  return (emptyFreecells + 1) * (emptyTableau + 1);
}

function acceptsMove(
  variant: VariantSpec,
  state: GameState,
  targetSpec: PileSpec,
  count: number,
  moving: readonly Card[],
): boolean {
  const target = state.piles[targetSpec.id] ?? [];
  const head = moving[0]!;
  switch (targetSpec.kind) {
    case 'foundation': {
      if (count !== 1) return false;
      // Spider: completed sequences are auto-extracted (see applyAutoClears); foundations are
      // never a legal drop target a player can choose to move a single card onto.
      if (variant.win === 'all-thirteen-sequences-cleared') return false;
      return buildAccepts(variant.foundationBuild, target, head);
    }
    case 'tableau': {
      if (!buildAccepts(variant.tableauBuild, target, head)) return false;
      if (count === 1) return true;
      if (variant.sequenceMove === 'single-card') return false;
      if (variant.sequenceMove === 'supermove') {
        return count <= maxSupermoveSize(variant, state, targetSpec.id);
      }
      return true; // 'any-legal-run': run shape already validated by the caller
    }
    case 'freecell':
      return count === 1 && target.length === 0;
    case 'waste': {
      // Golf/Pyramid/TriPeaks (win: 'tableau-cleared') use the waste pile itself as their single
      // discard/pairing target, built by variant.foundationBuild ('adjacent' or 'sum-to-13'; see
      // module doc). Every other variant's waste pile stays a pure draw destination — this arm is
      // structurally inert for them since their `win` is never 'tableau-cleared'.
      if (variant.win !== 'tableau-cleared') return false;
      if (count !== 1) return false;
      return buildAccepts(variant.foundationBuild, target, head);
    }
    default:
      return false; // stock is never a move target
  }
}

/** Every pile id `count` cards from the top of `from` could legally land on right now. */
export function legalTargets(variant: VariantSpec, state: GameState, from: string, count: number): string[] {
  const pile = state.piles[from];
  if (!pile || count < 1 || count > pile.length) return [];
  const fromSpec = pileSpec(variant, from);
  if (fromSpec.blockedBy && fromSpec.blockedBy.length > 0) {
    const exposed = fromSpec.blockedBy.every((id) => (state.piles[id]?.length ?? 0) === 0);
    if (!exposed) return []; // Pyramid/TriPeaks: a covered card can't be picked up at all
  }
  const moving = pile.slice(pile.length - count);
  if (!moving.every((c) => c.faceUp)) return [];
  // 'any-faceup-group' (Yukon): any contiguous face-up clump moves as a group regardless of its
  // own internal order — the face-up check just above is the only shape constraint. Every other
  // sequenceMove still requires the group to be a genuine build-rule-shaped run.
  if (count > 1 && variant.sequenceMove !== 'any-faceup-group' && !isValidRunOrder(variant.runBuild ?? variant.tableauBuild, moving))
    return [];

  const results: string[] = [];
  for (const p of variant.piles) {
    if (p.id === from) continue;
    if (acceptsMove(variant, state, p, count, moving)) results.push(p.id);
  }
  return results;
}

// -------------------------------------------------------------------------------------------
// applying moves
// -------------------------------------------------------------------------------------------

function revealTop(pile: readonly Card[]): Card[] {
  if (pile.length === 0) return [...pile];
  const top = pile[pile.length - 1]!;
  if (top.faceUp) return [...pile];
  return [...pile.slice(0, -1), { ...top, faceUp: true }];
}

function isCompletedSequence(rule: BuildRule, cards: readonly Card[]): boolean {
  return cards.length === 13 && cards[0]!.rank === 13 && cards[12]!.rank === 1 && isValidRunOrder(rule, cards);
}

/** Spider only: extract any complete K..A same-suit run sitting atop a tableau pile into an
 * empty foundation slot, repeating until none remain. A pure no-op for every other variant. */
function applyAutoClears(variant: VariantSpec, piles: Record<string, Card[]>): Record<string, Card[]> {
  if (variant.win !== 'all-thirteen-sequences-cleared') return piles;
  const runRule = variant.runBuild ?? variant.tableauBuild;
  let result = piles;
  let changed = true;
  while (changed) {
    changed = false;
    const tableauIds = variant.piles.filter((p) => p.kind === 'tableau').map((p) => p.id);
    for (const id of tableauIds) {
      const pile = result[id]!;
      if (pile.length < 13) continue;
      const top13 = pile.slice(-13);
      if (!top13.every((c) => c.faceUp) || !isCompletedSequence(runRule, top13)) continue;
      const foundationIds = variant.piles.filter((p) => p.kind === 'foundation').map((p) => p.id);
      const freeFoundation = foundationIds.find((fid) => (result[fid]?.length ?? 0) === 0);
      if (!freeFoundation) continue;
      result = { ...result, [id]: revealTop(pile.slice(0, -13)), [freeFoundation]: top13 };
      changed = true;
    }
  }
  return result;
}

function appendEntry(
  variant: VariantSpec,
  state: GameState,
  piles: Record<string, Card[]>,
  kind: LogEntry['kind'],
  from: string,
  to: string,
  count: number,
  ts: number,
): GameState {
  const finalPiles = applyAutoClears(variant, piles);
  const baseLog = state.log.slice(0, state.cursor);
  const entry: LogEntry = { seq: baseLog.length, kind, from, to, count, ts };
  return { ...state, piles: finalPiles, log: [...baseLog, entry], cursor: baseLog.length + 1 };
}

/** Apply one player move (`count` cards from the top of `from` onto `to`). Pure: returns a new
 * `GameState`, throws if the move is not in `legalTargets(variant, state, from, count)`. */
export function applyMove(variant: VariantSpec, state: GameState, move: Move, now = 0): GameState {
  const targets = legalTargets(variant, state, move.from, move.count);
  if (!targets.includes(move.to)) {
    throw new Error(`illegal move: ${move.count}x ${move.from} -> ${move.to}`);
  }
  const fromPile = state.piles[move.from]!;
  const moving = fromPile.slice(fromPile.length - move.count);
  const piles: Record<string, Card[]> = { ...state.piles };
  piles[move.from] = revealTop(fromPile.slice(0, fromPile.length - move.count));
  piles[move.to] = [...piles[move.to]!, ...moving];
  return appendEntry(variant, state, piles, 'move', move.from, move.to, move.count, now);
}

/** Draw from stock. Structurally dispatches on the variant's declared pile *shape*, never its
 * name: a variant with a `waste` pile draws Klondike-style (stock -> waste, `drawCount` cards,
 * face up); a variant with a `stock` but no `waste` deals Spider-style (one card face up onto
 * every tableau pile at once). FreeCell has neither and can never legally call this. */
export function drawFromStock(variant: VariantSpec, state: GameState, now = 0): GameState {
  const hasWaste = variant.piles.some((p) => p.kind === 'waste');
  if (hasWaste) {
    const stock = state.piles['stock'] ?? [];
    if (stock.length === 0) throw new Error('stock is empty; redeal first');
    const n = Math.min(variant.drawCount ?? 1, stock.length);
    const drawn = stock.slice(stock.length - n).map((c) => ({ ...c, faceUp: true }));
    const piles: Record<string, Card[]> = { ...state.piles };
    piles['stock'] = stock.slice(0, stock.length - n);
    piles['waste'] = [...(state.piles['waste'] ?? []), ...drawn];
    return appendEntry(variant, state, piles, 'draw', 'stock', 'waste', n, now);
  }

  const stockPile = variant.piles.find((p) => p.kind === 'stock');
  if (!stockPile) throw new Error(`variant "${variant.id}" has no stock to draw from`);
  const stock = state.piles[stockPile.id] ?? [];
  const tableauIds = variant.piles.filter((p) => p.kind === 'tableau').map((p) => p.id);
  if (stock.length < tableauIds.length) throw new Error('not enough cards in stock to deal a row');
  if (tableauIds.some((id) => (state.piles[id]?.length ?? 0) === 0)) {
    throw new Error('cannot deal a row while a tableau pile is empty');
  }
  const dealt = stock.slice(stock.length - tableauIds.length);
  const piles: Record<string, Card[]> = { ...state.piles };
  piles[stockPile.id] = stock.slice(0, stock.length - tableauIds.length);
  variant.dealOrder.forEach((id, k) => {
    piles[id] = [...(piles[id] ?? state.piles[id] ?? []), { ...dealt[k]!, faceUp: true }];
  });
  return appendEntry(variant, state, piles, 'deal-row', stockPile.id, '*', tableauIds.length, now);
}

/** Recycle waste back into stock, face down, respecting `variant.redeal.stockRecycles`. */
export function redealStock(variant: VariantSpec, state: GameState, now = 0): GameState {
  if (!variant.redeal) throw new Error(`variant "${variant.id}" has no redeal`);
  const stock = state.piles['stock'] ?? [];
  const waste = state.piles['waste'] ?? [];
  if (stock.length !== 0) throw new Error('cannot redeal: stock is not empty');
  if (waste.length === 0) throw new Error('cannot redeal: waste is empty');
  if (variant.redeal.stockRecycles !== 'unlimited' && state.redealsUsed >= variant.redeal.stockRecycles) {
    throw new Error('redeal limit reached');
  }
  const newStock = waste
    .slice()
    .reverse()
    .map((c) => ({ ...c, faceUp: false }));
  const piles: Record<string, Card[]> = { ...state.piles, stock: newStock, waste: [] };
  const next = appendEntry(variant, state, piles, 'redeal', 'waste', 'stock', newStock.length, now);
  return { ...next, redealsUsed: state.redealsUsed + 1 };
}

// -------------------------------------------------------------------------------------------
// undo/redo, replay
// -------------------------------------------------------------------------------------------

function applyLogPrimitive(variant: VariantSpec, state: GameState, entry: LogEntry): GameState {
  switch (entry.kind) {
    case 'move':
      return applyMove(variant, state, { from: entry.from, to: entry.to, count: entry.count });
    case 'draw':
    case 'deal-row':
      return drawFromStock(variant, state);
    case 'redeal':
      return redealStock(variant, state);
  }
}

/** Rebuild the `GameState` at `cursor` by replaying `fullLog[0..cursor)` from a fresh deal, then
 * re-attaching `fullLog[cursor..]` as the (re-doable) tail. The single implementation backing
 * `undo`, `redo`, and full-log `replay` — all three are just this at a different cursor. */
export function replayTo(seed: string, variant: VariantSpec, fullLog: readonly LogEntry[], cursor: number): GameState {
  let state = dealTable(seed, variant);
  for (let i = 0; i < cursor; i++) {
    state = applyLogPrimitive(variant, state, fullLog[i]!);
  }
  return { ...state, log: [...state.log, ...fullLog.slice(cursor)], cursor };
}

/** `replay(seed, variant, log)` per DESIGN.md — deterministically reproduces the final
 * `GameState` a log of moves produces, from nothing but the seed. The trust anchor for
 * undo/redo *and* for reading the log as proof-of-play. */
export function replay(seed: string, variant: VariantSpec, log: readonly LogEntry[]): GameState {
  return replayTo(seed, variant, log, log.length);
}

export function undo(variant: VariantSpec, state: GameState): GameState {
  if (state.cursor <= 0) return state;
  return replayTo(state.seed, variant, state.log, state.cursor - 1);
}

export function redo(variant: VariantSpec, state: GameState): GameState {
  if (state.cursor >= state.log.length) return state;
  return replayTo(state.seed, variant, state.log, state.cursor + 1);
}

// -------------------------------------------------------------------------------------------
// win / auto-finish
// -------------------------------------------------------------------------------------------

export function checkWin(variant: VariantSpec, state: GameState): boolean {
  if (variant.win === 'all-foundations-full') {
    const total = variant.decks * 52;
    const foundationIds = variant.piles.filter((p) => p.kind === 'foundation').map((p) => p.id);
    const sum = foundationIds.reduce((s, id) => s + (state.piles[id]?.length ?? 0), 0);
    return sum === total;
  }
  const tableauIds = variant.piles.filter((p) => p.kind === 'tableau').map((p) => p.id);
  if (variant.win === 'tableau-cleared') {
    // Golf/Pyramid/TriPeaks: the tableau alone decides the game — stock/waste may still hold
    // cards (real Pyramid is routinely won with cards left in the stock).
    return tableauIds.every((id) => (state.piles[id]?.length ?? 0) === 0);
  }
  const stockLen = state.piles['stock']?.length ?? 0;
  return stockLen === 0 && tableauIds.every((id) => (state.piles[id]?.length ?? 0) === 0);
}

function foundationRankBySuit(variant: VariantSpec, state: GameState): Record<Suit, number> {
  const ranks: Record<Suit, number> = { C: 0, D: 0, H: 0, S: 0 };
  for (const p of variant.piles) {
    if (p.kind !== 'foundation') continue;
    const pile = state.piles[p.id] ?? [];
    if (pile.length > 0) ranks[pile[pile.length - 1]!.suit] = pile.length; // ace-only base => length === rank
  }
  return ranks;
}

const OPPOSITE_SUITS: Record<Suit, readonly [Suit, Suit]> = {
  C: ['D', 'H'],
  S: ['D', 'H'],
  D: ['C', 'S'],
  H: ['C', 'S'],
};

/** True once every remaining card can be walked to its foundation automatically without risk —
 * see the module doc for why this uses the standard opposite-color-foundations rule. */
export function autoFinishAvailable(variant: VariantSpec, state: GameState): boolean {
  if (variant.win !== 'all-foundations-full') return false;
  const anyFaceDown = Object.values(state.piles).some((pile) => pile.some((c) => !c.faceUp));
  if (anyFaceDown) return false;

  const ranks = foundationRankBySuit(variant, state);
  const remaining: Card[] = [];
  for (const p of variant.piles) {
    if (p.kind === 'foundation') continue;
    for (const c of state.piles[p.id] ?? []) remaining.push(c);
  }
  if (remaining.length === 0) return false; // already won
  for (const c of remaining) {
    const [a, b] = OPPOSITE_SUITS[c.suit];
    const minOpposite = Math.min(ranks[a], ranks[b]);
    if (c.rank > minOpposite + 1) return false;
  }
  return true;
}

/** Play the deterministic foundation-completing sequence as an ordinary batch of logged moves —
 * not a distinct end-state jump (DESIGN.md, "Auto-finish detection"). */
export function autoFinishSequence(variant: VariantSpec, state: GameState): GameState {
  if (!autoFinishAvailable(variant, state)) return state;
  let current = state;
  let progressed = true;
  while (progressed && !checkWin(variant, current)) {
    progressed = false;
    for (const p of variant.piles) {
      if (p.kind === 'foundation') continue;
      const pile = current.piles[p.id] ?? [];
      if (pile.length === 0) continue;
      const targets = legalTargets(variant, current, p.id, 1);
      const foundationTarget = targets.find((t) => variant.piles.find((x) => x.id === t)?.kind === 'foundation');
      if (foundationTarget) {
        current = applyMove(variant, current, { from: p.id, to: foundationTarget, count: 1 });
        progressed = true;
      }
    }
  }
  return current;
}
