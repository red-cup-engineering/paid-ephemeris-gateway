import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIFE_CAP,
  LIFE_CAP_PASS,
  LIFE_REGEN_MS,
  BOOSTER_PRICES,
  SKUS,
  freshMeta,
  tickLives,
  spendLife,
  refillLives,
  winReward,
  applyStreak,
  buyBooster,
  grantSku,
  skuById,
  fmt,
} from './economy.mts';
import type { LevelResult } from './types.mts';

const T0 = 1_700_000_000_000;

function result(overrides: Partial<LevelResult> = {}): LevelResult {
  return { levelId: 1, won: true, score: 100, stars: 3, movesLeft: 2, chaosSix: false, ...overrides };
}

// ── lives regen across the cap ────────────────────────────────────────────────

test('spendLife arms the regen clock, and tickLives grants exactly one life per elapsed interval', () => {
  let meta = freshMeta();
  assert.equal(meta.lives, LIFE_CAP);
  meta = spendLife(meta, T0);
  assert.equal(meta.lives, LIFE_CAP - 1);
  assert.equal(meta.nextLifeAt, T0 + LIFE_REGEN_MS);

  // Before the interval elapses: no life yet.
  const early = tickLives(meta, T0 + LIFE_REGEN_MS - 1);
  assert.equal(early.lives, LIFE_CAP - 1);

  // Exactly at the interval: one life granted, clock cleared (back at cap).
  const onTime = tickLives(meta, T0 + LIFE_REGEN_MS);
  assert.equal(onTime.lives, LIFE_CAP);
  assert.equal(onTime.nextLifeAt, 0);
});

test('lives never exceed the cap even after a very long idle gap (multi-interval catch-up)', () => {
  let meta = freshMeta();
  for (let i = 0; i < LIFE_CAP; i++) meta = spendLife(meta, T0);
  assert.equal(meta.lives, 0);
  assert.ok(meta.nextLifeAt > 0);

  // Idle for far longer than enough intervals to refill many times over.
  const revived = tickLives(meta, T0 + LIFE_REGEN_MS * 1000);
  assert.equal(revived.lives, LIFE_CAP);
  assert.equal(revived.nextLifeAt, 0);
});

test('pass extends the life cap from 5 to 8, and tickLives regens up to the higher cap', () => {
  const withPass = grantSku(freshMeta(), skuById('pass-7')!, T0);
  assert.ok(withPass.passUntil > T0);

  let meta = withPass;
  for (let i = 0; i < LIFE_CAP_PASS; i++) meta = spendLife(meta, T0);
  assert.equal(meta.lives, 0);

  // 20 regen intervals (10 hours) — comfortably inside the 7-day pass, still well past the
  // higher cap, exercising the same multi-interval catch-up as the plain-cap test above.
  const revived = tickLives(meta, T0 + LIFE_REGEN_MS * 20);
  assert.equal(revived.lives, LIFE_CAP_PASS);

  // Without a pass the same drain only ever refills to the plain cap.
  let bare = freshMeta();
  for (let i = 0; i < LIFE_CAP; i++) bare = spendLife(bare, T0);
  const bareRevived = tickLives(bare, T0 + LIFE_REGEN_MS * 20);
  assert.equal(bareRevived.lives, LIFE_CAP);
});

test('refillLives instantly fills to the current cap and clears the pending clock', () => {
  let meta = freshMeta();
  meta = spendLife(meta, T0);
  meta = spendLife(meta, T0);
  assert.equal(meta.lives, LIFE_CAP - 2);
  const filled = refillLives(meta, T0);
  assert.equal(filled.lives, LIFE_CAP);
  assert.equal(filled.nextLifeAt, 0);
});

// ── streak ─────────────────────────────────────────────────────────────────────

test('applyStreak increments on a win and resets to 0 on a loss', () => {
  let meta = freshMeta();
  meta = applyStreak(meta, true);
  meta = applyStreak(meta, true);
  meta = applyStreak(meta, true);
  assert.equal(meta.streak, 3);
  meta = applyStreak(meta, false);
  assert.equal(meta.streak, 0);
});

// ── reward monotonicity ──────────────────────────────────────────────────────

test('winReward shards are strictly monotone increasing in stars, streak held fixed', () => {
  const rewards = ([0, 1, 2, 3] as const).map((stars) => winReward(result({ stars }), 4).shards);
  for (let i = 1; i < rewards.length; i++) {
    assert.ok((rewards[i] as number) > (rewards[i - 1] as number), `stars ${i} reward should exceed stars ${i - 1}`);
  }
});

test('winReward shards are monotone non-decreasing in streak and cap out at streak 10', () => {
  const at = (streak: number): number => winReward(result({ stars: 2 }), streak).shards;
  assert.ok(at(1) < at(5));
  assert.ok(at(5) < at(10));
  // Beyond the 10-win window the bonus is capped, so reward stops growing.
  assert.equal(at(10), at(25));
});

test('winReward grants a prism only on a 3-star result, never on 0/1/2 stars', () => {
  for (const stars of [0, 1, 2] as const) assert.equal(winReward(result({ stars }), 0).prisms, 0);
  assert.equal(winReward(result({ stars: 3 }), 0).prisms, 1);
});

// ── boosters ─────────────────────────────────────────────────────────────────

test('buyBooster deducts the listed price and is a no-op when unaffordable', () => {
  let meta = freshMeta();
  meta = { ...meta, wallet: { ...meta.wallet, shards: BOOSTER_PRICES.hammer } };
  const bought = buyBooster(meta, 'hammer');
  assert.equal(bought.wallet.shards, 0);
  assert.equal(bought.boosters.hammer, 1);

  const broke = buyBooster(bought, 'hammer');
  assert.equal(broke.wallet.shards, 0);
  assert.equal(broke.boosters.hammer, 1, 'unaffordable purchase must not grant the booster');
});

// ── SKU ladder round-trip ────────────────────────────────────────────────────

test('every SKU grant round-trips through grantSku into a visible, bounded meta change', () => {
  for (const sku of SKUS) {
    const before = freshMeta();
    const after = grantSku(before, sku, T0);
    switch (sku.grant.kind) {
      case 'prisms':
        assert.equal(after.wallet.prisms, before.wallet.prisms + sku.grant.amount, sku.id);
        break;
      case 'booster':
        assert.equal(
          after.boosters[sku.grant.booster],
          before.boosters[sku.grant.booster] + sku.grant.amount,
          sku.id,
        );
        break;
      case 'lives':
        assert.equal(after.lives, LIFE_CAP, sku.id);
        break;
      case 'pass':
        assert.equal(after.passUntil, T0 + sku.grant.days * 24 * 60 * 60 * 1000, sku.id);
        break;
      default:
        assert.fail(`unhandled grant kind for ${sku.id}`);
    }
  }
});

test('a second pass purchase stacks onto the remaining time rather than resetting it', () => {
  const first = grantSku(freshMeta(), skuById('pass-7')!, T0);
  const second = grantSku(first, skuById('pass-7')!, T0 + 1000);
  assert.equal(second.passUntil, first.passUntil + 7 * 24 * 60 * 60 * 1000);
});

test('skuById resolves every listed id and nothing else', () => {
  for (const sku of SKUS) assert.equal(skuById(sku.id), sku);
  assert.equal(skuById('not-a-real-sku'), undefined);
});

// ── formatting ───────────────────────────────────────────────────────────────

test('fmt renders small numbers plainly and large ones with a compact suffix', () => {
  assert.equal(fmt(0), '0');
  assert.equal(fmt(950), '950');
  assert.equal(fmt(1200), '1.20K');
  assert.equal(fmt(3_400_000), '3.40M');
  assert.equal(fmt(-500), '-500');
});
