/**
 * `economy` — wallets, lives, streaks, boosters, and the SKU ladder, as pure functions over
 * `PlayerMeta`.
 *
 * The v1 scope line in DESIGN.md is explicit: "full economy (shards/prisms, lives cap 5 with
 * regen, streaks, boosters)". Everything here is a pure transform of a `PlayerMeta` snapshot —
 * no clock reads, no I/O — because `scene.mts` is the one stateful module in the whole service
 * and it owns the injected `now`. That split is what makes lives regen, streak math, and SKU
 * grants testable without a fake timer harness: a test just picks `now` values and asserts.
 *
 * The doctrine that matters most here is the bounded-grant rule on `Sku['grant']` in
 * `types.mts`: a SKU can only ever buy currency, consumable boosters, lives, or a time-limited
 * pass — never a level-solvability shortcut, because solvability is a *validated property of
 * the board* (see `validate.mts`) and selling around it would falsify the game's own math
 * claim. `SKUS` below is charm-priced (99c/$4.99/$19.99 tiers) but every grant is a bounded
 * amount, not a cheat.
 */
import type { BoosterKind, LevelResult, PlayerMeta, Sku } from './types.mts';

/** Lives cap for a player with no active pass. */
export const LIFE_CAP = 5;

/** Lives cap while a season pass is active (`meta.passUntil > now`) — the pass's one perk. */
export const LIFE_CAP_PASS = 8;

/** Milliseconds to regenerate one life. */
export const LIFE_REGEN_MS = 30 * 60 * 1000;

/** The empty-boosters record every fresh meta and every `grantSku` booster branch starts from. */
function emptyBoosters(): Record<BoosterKind, number> {
  return { hammer: 0, shuffle: 0, extraMoves: 0, prismStart: 0 };
}

/** A brand-new player: full lives, no stars, level 1 unlocked, empty wallet. */
export function freshMeta(): PlayerMeta {
  return {
    unlocked: 1,
    stars: {},
    wallet: { shards: 0, prisms: 0 },
    boosters: emptyBoosters(),
    lives: LIFE_CAP,
    nextLifeAt: 0,
    streak: 0,
    garden: [],
    passUntil: 0,
  };
}

/** The lives cap in effect for `meta` at `now` — higher while a season pass is active. */
function lifeCapAt(meta: PlayerMeta, now: number): number {
  return meta.passUntil > now ? LIFE_CAP_PASS : LIFE_CAP;
}

/**
 * Advance the regen clock to `now`. `nextLifeAt` is the epoch a *single* pending life is due;
 * on a call that lands after it (including one long-delayed idle catch-up call spanning many
 * regen intervals) this grants every interval that has fully elapsed since then, clamped to
 * cap, and reschedules the remaining fractional interval — never over-grants, never drifts.
 * At or above cap the clock is parked at 0 (nothing pending), which also self-heals the case
 * where a pass expired and `meta.lives` now sits above the shrunk cap: we never claw lives
 * back, we just stop scheduling more.
 */
export function tickLives(meta: PlayerMeta, now: number): PlayerMeta {
  const cap = lifeCapAt(meta, now);
  if (meta.lives >= cap) {
    return meta.nextLifeAt === 0 ? meta : { ...meta, nextLifeAt: 0 };
  }
  if (meta.nextLifeAt === 0 || now < meta.nextLifeAt) return meta;
  const elapsed = now - meta.nextLifeAt;
  const gained = 1 + Math.floor(elapsed / LIFE_REGEN_MS);
  const lives = Math.min(cap, meta.lives + gained);
  const nextLifeAt = lives >= cap ? 0 : meta.nextLifeAt + gained * LIFE_REGEN_MS;
  return { ...meta, lives, nextLifeAt };
}

/**
 * Spend one life for a level start. Ticks the regen clock first so the spend is against a
 * fresh count. A no-op (beyond the tick) at 0 lives — callers that must distinguish "refused"
 * from "spent" (the scene's `start` input) check `meta.lives > 0` before calling this.
 */
export function spendLife(meta: PlayerMeta, now: number): PlayerMeta {
  const ticked = tickLives(meta, now);
  if (ticked.lives <= 0) return ticked;
  const lives = ticked.lives - 1;
  // Only arm the regen clock if it wasn't already running (spending below a level that was
  // already mid-regen must not push the next grant further out).
  const nextLifeAt = ticked.nextLifeAt === 0 ? now + LIFE_REGEN_MS : ticked.nextLifeAt;
  return { ...ticked, lives, nextLifeAt };
}

/** Instantly fill lives to the current cap (the life-refill SKU and any future reward path). */
export function refillLives(meta: PlayerMeta, now: number): PlayerMeta {
  const ticked = tickLives(meta, now);
  return { ...ticked, lives: lifeCapAt(ticked, now), nextLifeAt: 0 };
}

/**
 * Shard/prism reward for a finished level: `shards = 25 + 5*stars^2 + min(streak,10)*5` — a
 * bounded quadratic-in-stars curve (so 3-star play is meaningfully better than 1-star, not
 * just linearly) plus a streak bonus capped at a 10-win window (so streak farming plateaus
 * instead of compounding forever). `prisms` is 1 whenever the result is a 3-star clear; the
 * *first-clear* half of "3-star first-clear" is a stateful fact this pure function cannot see
 * (it would need the player's prior best on this level), so `progression.applyResult` — which
 * does hold that history — is the gate that keeps the prism component only on the level's
 * first 3-star win. Called with a losing `result`, still returns a shape; callers only add it
 * to the wallet on a win.
 */
export function winReward(result: LevelResult, streak: number): { shards: number; prisms: number } {
  const shards = 25 + 5 * result.stars * result.stars + Math.min(streak, 10) * 5;
  const prisms = result.stars === 3 ? 1 : 0;
  return { shards, prisms };
}

/** Advance the consecutive-win streak: +1 on a win, reset to 0 on a loss (or abandon). */
export function applyStreak(meta: PlayerMeta, won: boolean): PlayerMeta {
  return { ...meta, streak: won ? meta.streak + 1 : 0 };
}

/**
 * Shard prices for consumable boosters. Ordered roughly by in-run power: a shuffle is the
 * cheapest safety valve, a hammer removes one problem cell, extraMoves and prismStart change a
 * level's outcome the most and cost the most.
 */
export const BOOSTER_PRICES: Readonly<Record<BoosterKind, number>> = {
  shuffle: 40,
  hammer: 60,
  extraMoves: 90,
  prismStart: 140,
};

/**
 * Buy `count` of a booster with shards. A silent no-op when the wallet can't cover the price
 * (mirrors `spendLife`'s refusal-by-inaction style) — callers that must report failure compare
 * `meta.wallet.shards` before/after, or check affordability themselves first.
 */
export function buyBooster(meta: PlayerMeta, booster: BoosterKind, count = 1): PlayerMeta {
  if (count <= 0) return meta;
  const price = BOOSTER_PRICES[booster] * count;
  if (meta.wallet.shards < price) return meta;
  return {
    ...meta,
    wallet: { ...meta.wallet, shards: meta.wallet.shards - price },
    boosters: { ...meta.boosters, [booster]: meta.boosters[booster] + count },
  };
}

/**
 * Prism (hard currency) prices for the same boosters `BOOSTER_PRICES` sells for shards. This
 * is the only redemption path for prisms: without it, a player who buys or 3-star-earns
 * prisms has no way to ever spend them (a real-money charge for a currency the game can never
 * redeem is a broken purchase flow regardless of intent). Priced far below the shard cost
 * since prisms are the rarer/paid currency — the exchange rate itself is a design choice, not
 * a doctrine requirement, and stays well inside the bounded-grant rule (currency spent on
 * ordinary consumable boosters, never a solvability shortcut).
 */
export const PRISM_BOOSTER_PRICES: Readonly<Record<BoosterKind, number>> = {
  shuffle: 2,
  hammer: 3,
  extraMoves: 5,
  prismStart: 7,
};

/** Buy `count` of a booster with prisms. Mirrors `buyBooster`'s silent-no-op-when-unaffordable
 * style exactly, just against `wallet.prisms`/`PRISM_BOOSTER_PRICES` instead. */
export function buyBoosterWithPrisms(meta: PlayerMeta, booster: BoosterKind, count = 1): PlayerMeta {
  if (count <= 0) return meta;
  const price = PRISM_BOOSTER_PRICES[booster] * count;
  if (meta.wallet.prisms < price) return meta;
  return {
    ...meta,
    wallet: { ...meta.wallet, prisms: meta.wallet.prisms - price },
    boosters: { ...meta.boosters, [booster]: meta.boosters[booster] + count },
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The charm-priced shop ladder. Every entry's `grant` is one of the bounded kinds `types.mts`
 * allows — no entry here may ever grant board-solvability, only currency/boosters/lives/pass.
 * Booster bundle sells hammers (the single most broadly useful booster) five at a time rather
 * than a mixed assortment, because `Sku['grant']` carries exactly one booster kind per SKU.
 */
export const SKUS: readonly Sku[] = [
  { id: 'prisms-small', title: '100 Prisms', cents: 99, grant: { kind: 'prisms', amount: 100 } },
  { id: 'prisms-medium', title: '575 Prisms', cents: 499, grant: { kind: 'prisms', amount: 575 } },
  { id: 'prisms-large', title: '2,600 Prisms', cents: 1999, grant: { kind: 'prisms', amount: 2600 } },
  { id: 'booster-bundle', title: 'Hammer Bundle x5', cents: 199, grant: { kind: 'booster', booster: 'hammer', amount: 5 } },
  { id: 'life-refill', title: 'Life Refill', cents: 99, grant: { kind: 'lives', refill: true } },
  { id: 'pass-7', title: '7-Day Pass', cents: 499, grant: { kind: 'pass', days: 7 } },
  { id: 'pass-30', title: '30-Day Pass', cents: 999, grant: { kind: 'pass', days: 30 } },
];

const SKU_BY_ID: ReadonlyMap<string, Sku> = new Map(SKUS.map((s) => [s.id, s]));

/** Look up a shop SKU by id (what `server.mts`'s `/pay` route resolves an order's `skuId` to). */
export function skuById(id: string): Sku | undefined {
  return SKU_BY_ID.get(id);
}

/** Apply a cleared order's SKU grant to `meta`. Pure — `payments.mts` decides when this fires. */
export function grantSku(meta: PlayerMeta, sku: Sku, now: number): PlayerMeta {
  const grant = sku.grant;
  switch (grant.kind) {
    case 'prisms':
      return { ...meta, wallet: { ...meta.wallet, prisms: meta.wallet.prisms + grant.amount } };
    case 'booster':
      return {
        ...meta,
        boosters: { ...meta.boosters, [grant.booster]: meta.boosters[grant.booster] + grant.amount },
      };
    case 'lives':
      return refillLives(meta, now);
    case 'pass': {
      // Stack onto whichever is later: an unexpired pass extends, an expired/absent one starts
      // fresh from now — buying a pass never shortens the time already owned.
      const base = Math.max(meta.passUntil, now);
      return { ...meta, passUntil: base + grant.days * DAY_MS };
    }
    default: {
      const exhaustive: never = grant;
      return exhaustive;
    }
  }
}

const FMT_SUFFIXES = ['', 'K', 'M', 'B', 'T'];

/** Compact number formatting for wallet/HUD display: `950`, `1.20K`, `3.40M`, … */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : '';
  const x = Math.abs(n);
  if (x < 1000) return sign + String(Math.round(x));
  const tier = Math.min(FMT_SUFFIXES.length - 1, Math.floor(Math.log10(x) / 3));
  const scaled = x / Math.pow(10, tier * 3);
  const suffix = FMT_SUFFIXES[tier] ?? '';
  return `${sign}${scaled.toFixed(2)}${suffix}`;
}
