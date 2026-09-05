// zones — places, and the portals between them. A zone is a square ground (half-extent `bound`)
// with a spawn point and `exit-<dir>` predications pointing at neighbouring zones. Moving through
// a portal is just `changing` an entity's `located-in` — the dual-filed relational+functional
// predicate that says where a thing is. Settle takes the latest-t `located-in`, so a player is in
// exactly one zone at a time; the trace of where they have been is every superseded row beneath.
// Nothing here special-cases a player vs a monster: a mover is wherever its `located-in` last
// settled. The world is the trace; a zone is a place in it; a portal moves the place-cell.
//
//   spawnPlayer(root, playerId, t, dirty) -> { spawned, at }    stand a new player up at the gate
//   portal(root, subject, dir, t, dirty)  -> { moved, to? }     traverse subject's zone's exit
//   exitsOf(root, zoneId)  -> { north: dest, ... }              the zone's held exits, by direction
//   boundOf(root, zoneId)  -> number                            half-extent movement clamp
//   spawnOf(root, zoneId)  -> { x, z }                          the zone's spawn point
//
//   t     : a () => string clock thunk (orders sub-events within the tick)
//   dirty : a Set the caller collects touched subjects in (for the snapshot)

import doing from "#doing";
import changing from "#changing";
import { view, valOf, numOf, zoneOf } from "#engine/_world.mjs";

const GATE = "the-gate";
const EXIT_PREFIX = "exit-";

// spawnPlayer — initialize a NEW player entity, or just stand it back up if it already exists as a
// player. The relational/identity facts (kind, naming, mover, alive) are `doing` — they are not
// single-valued-over-time, they ARE the entity. The stateful facts (located-in, position, health,
// level, …) are `changing` — FUNCTIONAL, so each respawn supersedes the last value at settle.
export async function spawnPlayer(root, playerId, t, dirty) {
  const me = await view(root, playerId);
  const fresh = valOf(me, "kind") !== "player";

  if (fresh) {
    // identity + the persistent character sheet — set ONCE, so a re-join (refresh) keeps progress.
    await doing({ root, subject: playerId, predicate: "kind", object: "player", t: t() });
    await doing({ root, subject: playerId, predicate: "naming", object: playerId, t: t() });
    await doing({ root, subject: playerId, predicate: "mover", object: "session", t: t() });
    await doing({ root, subject: playerId, predicate: "alive", object: playerId, t: t() });
    await changing({ root, subject: playerId, predicate: "level", object: 1, t: t() });
    await changing({ root, subject: playerId, predicate: "xp", object: 0, t: t() });
    await changing({ root, subject: playerId, predicate: "gold", object: 10, t: t() });
    await changing({ root, subject: playerId, predicate: "max-health", object: 20, t: t() });
    await changing({ root, subject: playerId, predicate: "max-stamina", object: 20, t: t() });
    await changing({ root, subject: playerId, predicate: "attack-power", object: 4, t: t() });
    await changing({ root, subject: playerId, predicate: "armor", object: 0, t: t() });
  }

  // Stand the player up at the gate's spawn point. Read the gate fresh so the spawn follows the seed.
  const gate = await view(root, GATE);
  const sx = numOf(gate, "spawn-x", 0);
  const sz = numOf(gate, "spawn-z", 12);
  const maxHp = fresh ? 20 : numOf(me, "max-health", 20);
  const maxSt = fresh ? 20 : numOf(me, "max-stamina", 20);

  await changing({ root, subject: playerId, predicate: "located-in", object: GATE, t: t() });
  await changing({ root, subject: playerId, predicate: "pos-x", object: sx, t: t() });
  await changing({ root, subject: playerId, predicate: "pos-y", object: 0, t: t() });
  await changing({ root, subject: playerId, predicate: "pos-z", object: sz, t: t() });
  await changing({ root, subject: playerId, predicate: "facing", object: 0, t: t() });
  await changing({ root, subject: playerId, predicate: "health", object: maxHp, t: t() }); // join heals to full
  await changing({ root, subject: playerId, predicate: "stamina", object: maxSt, t: t() });
  await changing({ root, subject: playerId, predicate: "status", object: "up", t: t() });
  await changing({ root, subject: playerId, predicate: "form", object: "flesh", t: t() });

  dirty.add(playerId);
  return { spawned: true, at: GATE };
}

// portal — traverse the `exit-<dir>` of the subject's current zone. If the zone has no exit in that
// direction, nothing moves. Otherwise `changing` the subject's `located-in` to the destination
// (the dual-filed relational predicate carries the move) and reposition it at the destination's
// spawn point, so it arrives standing on solid ground rather than at the old zone's coordinates.
export async function portal(root, subject, dir, t, dirty) {
  const fromId = await zoneOf(root, subject); // e-filtered: correct even when carrying items
  if (!fromId) return { moved: false };

  const from = await view(root, fromId);
  const dest = valOf(from, `${EXIT_PREFIX}${dir}`);
  if (!dest) return { moved: false };

  const to = await view(root, dest);
  const sx = numOf(to, "spawn-x", 0);
  const sz = numOf(to, "spawn-z", 0);

  await changing({ root, subject, predicate: "located-in", object: dest, t: t() });
  await changing({ root, subject, predicate: "pos-x", object: sx, t: t() });
  await changing({ root, subject, predicate: "pos-y", object: 0, t: t() });
  await changing({ root, subject, predicate: "pos-z", object: sz, t: t() });

  dirty.add(subject);
  return { moved: true, to: dest };
}

// exitsOf — the zone's exits as a { direction: destination } map. Scan the settled fiber for every
// held predicate that starts `exit-`, and strip the prefix to recover the direction.
export async function exitsOf(root, zoneId) {
  const zone = await view(root, zoneId);
  const out = {};
  for (const c of zone.fiber) {
    if (c.predicate.startsWith(EXIT_PREFIX) && c.value.pos === 1) {
      out[c.predicate.slice(EXIT_PREFIX.length)] = c.object;
    }
  }
  return out;
}

// boundOf — the zone's half-extent movement clamp (the square ground's edge from centre).
export async function boundOf(root, zoneId) {
  return numOf(await view(root, zoneId), "bound", 0);
}

// spawnOf — the zone's spawn point as { x, z }.
export async function spawnOf(root, zoneId) {
  const zone = await view(root, zoneId);
  return { x: numOf(zone, "spawn-x", 0), z: numOf(zone, "spawn-z", 0) };
}
