/**
 * `persistence` — app.mjs's `localStorage` boundary, pulled into its own small, unit-testable
 * module: every function here takes its `storage` (a `Storage`-shaped object — `getItem`/
 * `setItem`) and any real timestamp as an explicit argument, and never itself reads
 * `localStorage` or calls `Date.now()`. `app.mjs` is the only caller that ever supplies the real
 * `localStorage` and the real `Date.now()` — exactly the same "one impure boundary" posture its
 * own header already documents, just with the boundary's logic now sitting somewhere a plain
 * `node --test` can reach it without a DOM.
 *
 * **The fresh-save clock bug, and why the fix lives here.** `cartridge.mts::createEngine` is a
 * pure function of `(seed, configId)` — the cartridge contract's own guarantee, load-bearing for
 * the canonical server-side `replayVerifier` (`cartridge.manifest.mts`) — so it is anchored at a
 * fixed `nowTs = 0` and can never itself carry a real "now". Building a brand-new visitor's live
 * state from `createEngine(seed)` and then ticking straight to a real `Date.now()` computes
 * offline progress across the entire gap since the epoch: a state that never had a REAL prior
 * visit is not owed any offline progress at all, but `advance()`/`doTick()` have no way to tell
 * "0 because this is a fresh save" apart from "0 because a real prior tick legitimately landed on
 * the epoch" — and several existing kernel tests (`intents.test.mts`) deliberately tick a
 * `starterState(0, ...)` forward and assert real growth, so that distinction can never be made
 * inside the kernel without breaking those tests. It has to be made here, before the kernel is
 * ever called: a fresh save's live state is built from `starterState(createdTs, seed)` — the same
 * pure, injected-timestamp constructor `createEngine` itself calls, just handed the real moment of
 * first visit instead of the cartridge's fixed `0` — and that `createdTs` is persisted once,
 * alongside the seed, so every later reload rebuilds from the same real anchor rather than falling
 * back to the epoch. Every subsequent tick still only ever advances from a real, previously-seen
 * timestamp, so real offline progress (a genuine prior visit, then a real gap) still pays out
 * exactly as before — see `offline-progression.test.mts` and `fresh-save-tier2.test.mts`, both
 * untouched by this fix.
 *
 * `createEngine`/`replay` (the generic cartridge-contract pair, anchored at the epoch) are still
 * exactly right for the canonical, seed-plus-log-only `replayVerifier` a server checks — they are
 * deliberately NOT used for this browser save's own reconstruction any more, in favor of
 * `buildState`, which folds the identical intent log over the save's own real `createdTs` instead.
 */

export const STORAGE_SEED_KEY = "yac-seed-v1";
export const STORAGE_CREATED_KEY = "yac-created-ts-v1";
export const STORAGE_LOG_KEY = "yac-intent-log-v1";

/** Loads the persisted seed, or mints one with `makeSeed()` and persists it. Reports whether the
 *  seed was just minted (`isNewSeed`) — the one bit `loadOrStampCreatedTs` needs to tell "this
 *  browser's real first visit, ever" apart from "an existing save reloading, from before this
 *  fix shipped, that has never had a `createdTs` stamped." */
export function loadOrCreateSeed(storage, makeSeed) {
  const existing = storage.getItem(STORAGE_SEED_KEY);
  if (existing) return { seed: existing, isNewSeed: false };
  const seed = makeSeed();
  storage.setItem(STORAGE_SEED_KEY, seed);
  return { seed, isNewSeed: true };
}

/** Loads the persisted creation timestamp, stamping it once if this save has never had one.
 *  A genuinely new seed stamps the real `now` it is handed — the moment of first visit. A save
 *  that already existed before this key existed (`isNewSeed` false, no stored value) falls back
 *  to `0`, exactly `createEngine`'s own pure anchor: it never had a real "moment of creation"
 *  recorded, and inventing one now would silently rewrite the meaning of that save's own already-
 *  logged intents rather than fix anything. */
export function loadOrStampCreatedTs(storage, isNewSeed, now) {
  const existing = storage.getItem(STORAGE_CREATED_KEY);
  if (existing !== null) {
    const parsed = Number(existing);
    if (Number.isFinite(parsed)) return parsed;
  }
  const createdTs = isNewSeed ? now : 0;
  storage.setItem(STORAGE_CREATED_KEY, String(createdTs));
  return createdTs;
}

export function loadLog(storage) {
  try {
    const raw = storage.getItem(STORAGE_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLog(storage, log) {
  storage.setItem(STORAGE_LOG_KEY, JSON.stringify(log));
}

/** The one reconstruction path for a save's live state, used identically at load time and by
 *  "Verify replay" — so the two can never quietly disagree about what a save's own history means.
 *  Anchors on the save's own real `createdTs` (never the cartridge's fixed epoch anchor) and folds
 *  `intentLog` over it through the real reducer, exactly `defaultReplay` would, minus the fixed
 *  `createEngine(seed)` starting point. */
export function buildState(starterState, applyIntent, seed, createdTs, intentLog) {
  let state = starterState(createdTs, seed);
  for (const intent of intentLog) {
    state = applyIntent(state, intent).state;
  }
  return state;
}
