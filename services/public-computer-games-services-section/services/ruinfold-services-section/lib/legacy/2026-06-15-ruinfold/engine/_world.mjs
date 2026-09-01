// _world — shared world-access helpers every engine module sits on (engine plumbing, not a
// game rule, hence the `_`). It wraps tab's substrate with the ruinfold functional set and gives
// the modules a small, consistent vocabulary for reading a settled entity:
//
//   view(root, id)            -> the entity's settled `thing` (fiber of bilattice cells)
//   cellOf(thing, p [, obj])  -> the {predicate,object,value} cell for predicate p (and object)
//   valOf(thing, p, fallback) -> the object of the held (pos===1) cell for p, else fallback
//   numOf(thing, p, fallback) -> Number(valOf), else fallback
//   glyphOf(thing, p [, obj]) -> the bilattice glyph (⊥/t/f/⊤) of that cell, or "⊥" if absent
//   held(thing, p)            -> array of objects of every held cell for p (e.g. all exits)
//   posOf(thing)              -> {x,y,z} from pos-x/pos-y/pos-z
//   dist2(a, b)               -> squared horizontal distance (dx²+dz²) — NO sqrt, NO 3D math lib
//
// Everything reads through settle() with RUIN_FUNCTIONAL so health/position/level are latest-t.

import { settle, locationOf } from "#substrate";
import { RUIN_FUNCTIONAL } from "#engine/functional.mjs";

export async function view(root, id) {
  return settle(root, id, { functional: RUIN_FUNCTIONAL });
}

// zoneOf — an entity's OWN current place. NOT `valOf(view(id),"located-in")`: `located-in` is
// relational and dual-filed, so when an entity carries an item the item's `located-in <carrier>`
// row lands in the carrier's log, and supersede (which collapses a functional predicate across
// ALL rows in a log, ignoring `e`) can drop the carrier's own place. locationOf filters `e===id`,
// so it reads the subject's true location. Always read an entity's zone through here.
export async function zoneOf(root, id) {
  return locationOf(root, id);
}

export function cellOf(thing, predicate, object) {
  return thing.fiber.find((c) => c.predicate === predicate && (object === undefined || c.object === object)) ?? null;
}

export function valOf(thing, predicate, fallback = null) {
  const c = thing.fiber.find((x) => x.predicate === predicate && x.value.pos === 1);
  return c ? c.object : fallback;
}

export function numOf(thing, predicate, fallback = 0) {
  const v = valOf(thing, predicate, null);
  return v == null ? fallback : Number(v);
}

export function glyphOf(thing, predicate, object) {
  const c = cellOf(thing, predicate, object);
  return c ? c.value.glyph : "⊥";
}

export function held(thing, predicate) {
  return thing.fiber.filter((c) => c.predicate === predicate && c.value.pos === 1).map((c) => c.object);
}

export function posOf(thing) {
  return { x: numOf(thing, "pos-x", 0), y: numOf(thing, "pos-y", 0), z: numOf(thing, "pos-z", 0) };
}

// dist2 — squared horizontal distance between two {x,z}-bearing points. Squared so the range
// gate is a pure multiply/compare (`dist2 <= R*R`) with no Math.sqrt: this is scalar arithmetic,
// not geometry. All real vector/projection math is the client's three.js, never the server's.
export function dist2(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}
