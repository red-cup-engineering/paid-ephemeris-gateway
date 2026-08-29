/**
 * `persistence.test` — the regression lock for the live "widget stock: 3.8e23" bug: a brand-new
 * visitor with no save saw ~56 years of phantom offline progress before ever clicking, because the
 * fresh state's clock was anchored at the epoch (`createEngine`'s own fixed, pure `nowTs = 0`) and
 * then ticked straight to a real `Date.now()`. Drives `web/js/persistence.mjs` — the one module
 * that now owns "what does a fresh save's clock start at" — through a fake, in-memory `Storage`,
 * never a real `localStorage`/DOM.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { starterState, type ConsciousState } from "../../src/state.mts";
import { applyIntent } from "../../src/cartridge.mts";
import {
  STORAGE_CREATED_KEY, STORAGE_SEED_KEY, buildState, loadLog, loadOrCreateSeed,
  loadOrStampCreatedTs, saveLog,
} from "../js/persistence.mjs";

function fakeStorage(): Storage {
  const backing = new Map<string, string>();
  return {
    getItem: (key: string) => (backing.has(key) ? backing.get(key)! : null),
    setItem: (key: string, value: string) => { backing.set(key, String(value)); },
    removeItem: (key: string) => { backing.delete(key); },
    clear: () => { backing.clear(); },
    key: () => null,
    get length() { return backing.size; },
  } as unknown as Storage;
}

function play(state: ConsciousState, intent: Parameters<typeof applyIntent>[1]) {
  return applyIntent(state, intent);
}

// ── root cause, demonstrated directly ───────────────────────────────────────────────────────────

test("ROOT CAUSE: ticking a lastSeenTs=0 (epoch-anchored) state straight to a real Date.now() computes decades of phantom offline progress", () => {
  const realNow = Date.UTC(2026, 7, 20); // a real "now", not a test fixture's small integer
  const epochAnchored = starterState(0, "epoch-anchored-demo");
  const { state: afterFirstRealTick } = play(epochAnchored, { kind: "tick", toTs: realNow });
  const widgetStock = afterFirstRealTick.widgets.stocks["widget"] ?? 0;
  assert.ok(
    widgetStock > 1e15,
    `expected the epoch-anchored bug's astronomical widget stock, got ${widgetStock} — ` +
      "this test documents WHY a fresh save must never be anchored at 0 and then ticked to real time",
  );
});

// ── the fix: loadOrCreateSeed / loadOrStampCreatedTs ────────────────────────────────────────────

test("loadOrCreateSeed reports a genuinely new seed as new, and an existing one as not new", () => {
  const storage = fakeStorage();
  const first = loadOrCreateSeed(storage, () => "minted-seed");
  assert.equal(first.seed, "minted-seed");
  assert.equal(first.isNewSeed, true);
  assert.equal(storage.getItem(STORAGE_SEED_KEY), "minted-seed");

  const second = loadOrCreateSeed(storage, () => "would-not-be-used");
  assert.equal(second.seed, "minted-seed");
  assert.equal(second.isNewSeed, false);
});

test("loadOrStampCreatedTs stamps a genuinely new seed's save to the real moment of first visit, not the epoch", () => {
  const storage = fakeStorage();
  const now = Date.UTC(2026, 7, 20);
  const createdTs = loadOrStampCreatedTs(storage, /* isNewSeed */ true, now);
  assert.equal(createdTs, now);
  assert.equal(storage.getItem(STORAGE_CREATED_KEY), String(now));
});

test("loadOrStampCreatedTs falls back to the epoch for a save that predates this fix (existing seed, no stamp on record)", () => {
  const storage = fakeStorage();
  storage.setItem(STORAGE_SEED_KEY, "pre-fix-save");
  const createdTs = loadOrStampCreatedTs(storage, /* isNewSeed */ false, Date.UTC(2026, 7, 20));
  assert.equal(createdTs, 0, "never silently invent a real creation moment for a save that never recorded one");
});

test("loadOrStampCreatedTs is idempotent: once stamped, later calls (any later real 'now') return the same anchor", () => {
  const storage = fakeStorage();
  const firstNow = Date.UTC(2026, 7, 20);
  const stamped = loadOrStampCreatedTs(storage, true, firstNow);
  const reread = loadOrStampCreatedTs(storage, true, firstNow + 86_400_000);
  assert.equal(reread, stamped);
});

// ── the fix, end to end: a brand-new visitor's very first tick ─────────────────────────────────

test("FIX: a brand-new visitor's first tick reflects zero (or one tick's) elapsed time, never offline progress since the epoch", () => {
  const storage = fakeStorage();
  const now = Date.UTC(2026, 7, 20);
  const { seed, isNewSeed } = loadOrCreateSeed(storage, () => "fresh-visitor-seed");
  assert.equal(isNewSeed, true);
  const createdTs = loadOrStampCreatedTs(storage, isNewSeed, now);

  const fresh = buildState(starterState, applyIntent, seed, createdTs, []);
  assert.equal(fresh.widgets.stocks["widget"], 0, "before ever clicking, widget stock is 0 — not 3.8e23");

  // the app's real startup calls tickToNow() immediately, one tick loop after creation.
  const { state: firstTick } = play(fresh, { kind: "tick", toTs: now + 1000 });
  assert.equal(firstTick.widgets.stocks["widget"], 0, "still 0: one tick's worth of a starter graph with no growth loop yet");
  assert.equal(firstTick.widgets.stocks["material"], 1, "exactly one tick of material's own base generation, not ~1.76 billion ticks' worth");

  // one click produces exactly one widget's worth.
  const { state: afterClick } = play(firstTick, { kind: "click" });
  assert.equal(afterClick.widgets.stocks["widget"], 1);
});

test("FIX survives a reload: rebuilding from the persisted seed + createdTs + log reproduces the same small, honest state, never re-derives the epoch-anchored bug", () => {
  const storage = fakeStorage();
  const now = Date.UTC(2026, 7, 20);
  const { seed, isNewSeed } = loadOrCreateSeed(storage, () => "reload-seed");
  const createdTs = loadOrStampCreatedTs(storage, isNewSeed, now);

  let state = buildState(starterState, applyIntent, seed, createdTs, []);
  let log: unknown[] = [];
  const tick1 = { kind: "tick", toTs: now + 1000 } as const;
  state = play(state, tick1).state;
  log = [...log, tick1];
  saveLog(storage, log);

  // simulate closing the tab and reopening it: nothing but storage survives.
  const reloadedSeedInfo = loadOrCreateSeed(storage, () => { throw new Error("must not mint a new seed on reload"); });
  assert.equal(reloadedSeedInfo.isNewSeed, false);
  const reloadedCreatedTs = loadOrStampCreatedTs(storage, reloadedSeedInfo.isNewSeed, now + 5000);
  assert.equal(reloadedCreatedTs, createdTs, "the real anchor must survive a reload unchanged");
  const reloadedLog = loadLog(storage);
  const rebuilt = buildState(starterState, applyIntent, reloadedSeedInfo.seed, reloadedCreatedTs, reloadedLog);

  assert.deepEqual(rebuilt, state, "reload must reproduce the exact live state, not a fresh epoch-anchored one");
  assert.equal(rebuilt.widgets.stocks["widget"], 0);
});

// ── the existing promise this fix must not break ────────────────────────────────────────────────

test("real offline progress still pays out: a genuine prior visit, then a real gap, still simulates that whole gap honestly", () => {
  const storage = fakeStorage();
  const t0 = Date.UTC(2026, 7, 1);
  const { seed, isNewSeed } = loadOrCreateSeed(storage, () => "returning-player-seed");
  const createdTs = loadOrStampCreatedTs(storage, isNewSeed, t0);

  // a real, honest first session: created, ticked forward a few seconds, closed.
  let state = buildState(starterState, applyIntent, seed, createdTs, []);
  const firstSession = { kind: "tick", toTs: t0 + 5000 } as const;
  state = play(state, firstSession).state;
  const stockBeforeGap = state.widgets.stocks["material"] ?? 0;
  assert.equal(stockBeforeGap, 5, "five real ticks of material's own base generation");

  // three real days pass with the tab closed, then the player returns.
  const threeDaysLater = t0 + 5000 + 3 * 24 * 60 * 60 * 1000;
  const returned = play(state, { kind: "tick", toTs: threeDaysLater });
  const stockAfterGap = returned.state.widgets.stocks["material"] ?? 0;
  // three days = 259,200 real ticks of material's base generation of 1/tick, on top of the five
  // already banked before the gap — an honest, linear payout for a linear (no self-loop) node.
  assert.equal(stockAfterGap, stockBeforeGap + 259_200, "a real three-day absence must pay out exactly that many real ticks of offline progress");
});
