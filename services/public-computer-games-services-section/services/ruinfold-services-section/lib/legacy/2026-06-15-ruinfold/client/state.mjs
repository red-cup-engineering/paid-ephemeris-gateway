// state — the client's single source of truth + a tiny event bus. It owns the entity/zone maps and
// the local player view, ingests SSE frames, and — crucially — DIFFS each frame to emit SEMANTIC
// events (damage, heal, died, levelup, effect-gain, loot, zone-change, world-event, chat). Every UI
// and render module subscribes to these instead of parsing the network, so juice (a hit flash, a
// coin sound, a level-up flare) triggers from one place and the modules stay decoupled.

export function createState(ME) {
  const entities = new Map(); // id -> latest snap
  const zones = new Map(); // id -> zone snap
  const listeners = new Map(); // event -> Set<fn>
  let myZone = null;
  let targetId = null;
  let latestTick = 0;

  // --- event bus ---------------------------------------------------------------------------------
  function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event)?.delete(fn);
  }
  function emit(event, payload) {
    const set = listeners.get(event);
    if (set) for (const fn of [...set]) { try { fn(payload); } catch (e) { console.error(`[state] listener for ${event}`, e); } }
  }

  // --- reads -------------------------------------------------------------------------------------
  const me = () => entities.get(ME);
  const get = (id) => entities.get(id);
  const zone = (id) => zones.get(id);
  const currentZone = () => myZone;
  const target = () => targetId;
  const tick = () => latestTick;
  function setTarget(id) {
    if (id === targetId) return;
    targetId = id;
    emit("target", id);
  }

  // --- diff one entity: emit the semantic events its change implies -------------------------------
  function diff(id, next, prev) {
    if (!prev) {
      emit("entity-add", { id, snap: next });
      return;
    }
    const dh = (next.health ?? 0) - (prev.health ?? 0);
    // a respawn/heal-to-full reads as a big jump; treat a drop as damage, a rise as heal
    if (dh < 0) emit("damage", { id, amount: -dh, health: next.health, maxHealth: next.maxHealth });
    else if (dh > 0 && prev.status !== "slain" && prev.status !== "ghost") emit("heal", { id, amount: dh });

    const deadNow = next.aliveGlyph === "f" || next.aliveGlyph === "⊥" || ["slain", "vanished", "ghost", "dead"].includes(next.status);
    const deadBefore = prev.aliveGlyph === "f" || prev.aliveGlyph === "⊥" || ["slain", "vanished", "ghost", "dead"].includes(prev.status);
    if (deadNow && !deadBefore) emit("died", { id, rule: next.deathRule, status: next.status, glyph: next.aliveGlyph });
    if (!deadNow && deadBefore) emit("revived", { id });

    if ((next.level ?? 1) > (prev.level ?? 1)) emit("levelup", { id, level: next.level });
    if (next.aliveGlyph === "⊤" && prev.aliveGlyph !== "⊤") emit("rose", { id }); // an undead rising

    // new status effects gained this frame
    const had = new Set((prev.effects ?? []).map((e) => e.name));
    for (const e of next.effects ?? []) if (!had.has(e.name)) emit("effect-gain", { id, name: e.name });

    emit("entity-update", { id, snap: next, prev });
    if (id === ME) emit("me", { snap: next, prev });
  }

  // --- ingest one SSE event ----------------------------------------------------------------------
  function ingestEntity(snap) {
    if (snap.type === "zone") {
      zones.set(snap.id, snap);
      if (snap.id === myZone) emit("zone-data", snap);
      return;
    }
    const prev = entities.get(snap.id);
    entities.set(snap.id, snap);
    if (snap.id === ME && snap.zone && snap.zone !== myZone) {
      myZone = snap.zone;
      emit("zone-change", { zone: myZone, data: zones.get(myZone) });
    }
    if (snap.id === ME && snap.event && snap.event !== prevEvent) {
      prevEvent = snap.event;
      emit("world-event", { name: snap.event });
    }
    diff(snap.id, snap, prev);
  }
  let prevEvent = null;

  function apply(ev) {
    if (typeof ev.tick === "number") latestTick = ev.tick;
    if (ev.type === "full") {
      for (const e of ev.entities) if (e.type === "zone") zones.set(e.id, e);
      for (const e of ev.entities) ingestEntity(e);
      emit("snapshot", { full: true });
    } else if (ev.type === "delta") {
      for (const e of ev.entities) ingestEntity(e);
      for (const id of ev.removed || []) {
        if (entities.delete(id)) emit("entity-remove", { id });
        if (id === targetId) setTarget(null);
      }
      emit("snapshot", { full: false });
    } else if (ev.type === "chat") {
      if (ev.zone === myZone || !myZone) emit("chat", { from: nameOf(ev.from), text: ev.text });
    }
  }

  const nameOf = (id) => entities.get(id)?.name ?? id;

  // entities the local player currently shares a zone with (the renderable set)
  function inZone() {
    const out = [];
    for (const s of entities.values()) if (s.zone === myZone) out.push(s);
    return out;
  }

  return { ME, on, emit, me, get, zone, currentZone, target, setTarget, tick, apply, inZone, nameOf, entities, zones };
}
