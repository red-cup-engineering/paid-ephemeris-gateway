// identity.mjs — a persistent per-browser actor id, kept in localStorage. Generated once with the
// Web Crypto API's `crypto.randomUUID()` — NOT Math.random() — purely as a storage/bookkeeping id,
// the same non-game-logic allowance server.mts documents for its own `randomUUID()` use (a unique
// key, never an input the engine computes anything from). Must match server/guard.mts's
// SAFE_ID_RE (`^[a-z0-9][a-z0-9_-]{0,63}$`) since it round-trips through URL path segments.

const KEY = "ruinfold:actor-id";

export function getActorId(storage = window.localStorage) {
  let id = storage.getItem(KEY);
  if (!id) {
    const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
    id = `wanderer-${rand}`;
    storage.setItem(KEY, id);
  }
  return id;
}

export function setActorId(id, storage = window.localStorage) {
  storage.setItem(KEY, id);
}
