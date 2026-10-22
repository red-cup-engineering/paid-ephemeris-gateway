// snapshot-manager — the reactive view over the trace. This is the architecture-contract heart of
// qwzspace (L9 realtime): a subscriber sees SETTLED-SECTION frames that re-fold on append. LIFTED
// from apps/games/ruinfold/engine/snapshot.mjs (the bootstrap/resettle/full cache) and merged with
// the per-client INTEREST-FILTERED delta diffing of apps/games/aletheon/server/net/session.mjs's
// sync() — the two games solved the same problem (project the folded world to the wire) two ways,
// and qwzspace lifts the union and drops the game-specific projections.
//
// CONTRACT. The game gives qwzspace one function: `snapOf(id, tick) -> entry | null`. That function
// IS the boundary between the engine (which knows only the settled trace and who-can-see-what) and
// the game (which knows what an entity's render state is). snapOf reads the SETTLED section of a
// subject — `settle`/`section` over the subject's rows, the FOLD of the append-only trace — and
// returns a flat render entry, or null when the subject must not render (vanished, carried, gone).
// qwzspace never inspects the entry; it only caches, diffs, and ships it.
//
// To keep the per-tick cost bounded by the number of subjects a tick TOUCHED (not the world size),
// the manager holds an in-memory cache of every subject's last snap. bootstrap() snaps everything
// once; resettle(dirty) re-snaps ONLY the subjects the tick touched and emits a DELTA (changed +
// removed) — the "engine projects deltas over the settled trace" of the contract; full() hands a
// fresh subscriber the whole cache with no disk reads.
//
// INTEREST FILTERING is optional and per-subscriber. If the game supplies an `interest` predicate
// (id, subscriberId) => boolean, the manager can project a delta for ONE subscriber: only entries
// that subject can see, only what changed for them, plus the ids that LEFT their interest set. This
// is aletheon's VIEW_RADIUS sync() generalized — the game owns the radius/visibility test, qwzspace
// owns the diff bookkeeping (lastView per subscriber).
//
//   const m = createSnapshotManager({ subjectsOf, snapOf, interest })
//   await m.bootstrap(tick)              -> { type:"full",  tick, entities:[...] }
//   await m.resettle(dirtySet, tick)     -> { type:"delta", tick, entities:[changed], removed:[id] }
//   m.full(tick)                         -> { type:"full",  tick, entities:[...cache] }   (cached)
//   await m.subscribe(subscriberId)      -> register a per-subscriber interest view; returns its handle
//   await handle.full(tick)              -> the interest-filtered full set for this subscriber
//   handle.delta(tick, ack)              -> the interest-filtered delta for this subscriber (off cache)
//   handle.drop()                        -> forget this subscriber's diff state

export function createSnapshotManager({ subjectsOf, snapOf, interest = null }) {
  if (typeof subjectsOf !== "function") throw new TypeError("snapshot-manager: subjectsOf(tick) is required");
  if (typeof snapOf !== "function") throw new TypeError("snapshot-manager: snapOf(id, tick) is required");

  const cache = new Map(); // id -> last snapped entry (the global render cache; from ruinfold)
  const subscribers = new Map(); // subscriberId -> { lastView: Map<id, signature> } (from aletheon)

  // bootstrap — snap every subject once and seed the cache. The full opening frame.
  async function bootstrap(tick) {
    cache.clear();
    const all = await subjectsOf(tick);
    for (const id of all) {
      const s = await snapOf(id, tick);
      if (s) cache.set(id, s);
    }
    return { type: "full", tick, entities: [...cache.values()] };
  }

  // resettle — re-snap ONLY the subjects a tick touched, update the cache, and emit the global
  // delta. A subject that snapped before and snaps null now (vanished / carried / gone) is REMOVED:
  // we tell the client to drop it. This is the global stream (every subscriber gets the same delta);
  // for interest-filtered streams, use a subscriber handle's delta() instead.
  async function resettle(dirty, tick) {
    const entities = [];
    const removed = [];
    for (const id of dirty) {
      const s = await snapOf(id, tick);
      if (s) {
        cache.set(id, s);
        entities.push(s);
      } else if (cache.has(id)) {
        cache.delete(id);
        removed.push(id);
      }
    }
    return { type: "delta", tick, entities, removed };
  }

  // full — the whole cache as a fresh full frame, no disk reads (a re-sync / a new global client).
  function full(tick) {
    return { type: "full", tick, entities: [...cache.values()] };
  }

  // --- per-subscriber interest-filtered views (the aletheon path) ------------------------------
  // visibleFor — the cached entries this subscriber may see, by the game's interest predicate. With
  // no predicate, everyone sees everything (the global cache), and the filter is a pass-through.
  function visibleFor(subscriberId) {
    const out = [];
    for (const [id, entry] of cache) {
      if (!interest || interest(id, subscriberId)) out.push([id, entry]);
    }
    return out;
  }

  // subscribe — register a subscriber's diff state and hand back a handle that projects interest-
  // filtered full/delta frames off the SHARED cache (so resettle's per-tick cost is paid once, not
  // per subscriber). The handle re-reads the cache each call — it re-folds on append by construction.
  function subscribe(subscriberId) {
    const state = { lastView: new Map() };
    subscribers.set(subscriberId, state);

    // sig — a cheap change signature for a cached entry. JSON of the entry is exact and matches
    // aletheon's `JSON.stringify(view)` diffing; an entry is small and flat so this stays cheap.
    const sig = (entry) => JSON.stringify(entry);

    return {
      id: subscriberId,
      // full — the interest-filtered opening frame, and it primes the diff state so the next delta
      // only carries changes since this full.
      full(tick) {
        const entities = [];
        state.lastView.clear();
        for (const [id, entry] of visibleFor(subscriberId)) {
          entities.push(entry);
          state.lastView.set(id, sig(entry));
        }
        return { type: "full", tick, entities };
      },
      // delta — only what CHANGED in this subscriber's interest set since the last full/delta, plus
      // the ids that LEFT it (no longer visible, or removed from the world). LIFTED from aletheon
      // session.sync(): seen-set, changed-by-signature, gone-by-absence. `ack` echoes the last
      // processed intent seq for client reconciliation.
      delta(tick, ack = 0) {
        const changed = [];
        const seen = new Set();
        for (const [id, entry] of visibleFor(subscriberId)) {
          seen.add(id);
          const s = sig(entry);
          if (state.lastView.get(id) !== s) {
            changed.push(entry);
            state.lastView.set(id, s);
          }
        }
        const removed = [];
        for (const id of state.lastView.keys()) {
          if (!seen.has(id)) {
            removed.push(id);
            state.lastView.delete(id);
          }
        }
        return { type: "delta", tick, ack: ack | 0, entities: changed, removed };
      },
      drop() {
        subscribers.delete(subscriberId);
      },
    };
  }

  return { bootstrap, resettle, full, subscribe, has: (id) => cache.has(id), size: () => cache.size };
}
