// perception — per-player FOG OF WAR. The world is settled ONCE from the single shared trace, but
// each observer KNOWS a different slice of it. snapshot.mjs is omniscient (it folds the whole
// settled world for the client); this module is the cut between "what is settled" and "what a
// given observer is allowed to perceive", so the integrator can fold a DIFFERENT snapshot delta
// per connected player.
//
// This is a READ module: it never appends to or mutates the world. It only settles entities
// (through #engine/_world.mjs) and reads an observer's `perceives` rows (their Umwelt) to decide
// visibility. All the real geometry/range math the client does in three.js; here we only gate on
// the scalar facts the substrate already holds: zone (located-in), position (pos-x/pos-z), the
// `alive` glyph, and `death-rule`.
//
//   SIGHT                                   -> how far (in world units) an observer sees in-zone
//   perceivesOf(root, observer)             -> Set<predicate> the observer can sense (∅ = all)
//   canSee(root, observer, targetId)        -> boolean: can this observer perceive this target now
//   visibleTo(root, observer, candidateIds) -> the subset (array) of candidateIds canSee allows
//
// The Umwelt half (perceivesOf) mirrors tab's observing.mjs `perceivesOf`: read the observer's own
// `perceives` rows; an empty set means a bare sensor that perceives every predication. We reuse
// that perceives-SET plus the engine's spatial helpers rather than calling observing() per subject:
// observing() projects an entity's FIBER through the Umwelt, but fog-of-war is a coarser, per-ENTITY
// in/out decision (is this thing on this player's screen at all), driven by zone + range + a hidden
// rule. So we read the perceives-set once and gate spatially — cheaper, and the right granularity
// for "which entities go in this player's snapshot delta".

import { rowsFor } from "#substrate";
import { view, valOf, numOf, posOf, dist2, zoneOf } from "#engine/_world.mjs";

// SIGHT — the radius (world units) an observer can see WITHIN their own zone. Beyond this, even a
// thing standing on the same flagstones is off-screen. Squared once for the range gate so canSee
// stays a pure multiply/compare (dist2 returns squared distance — no Math.sqrt). Illustrative of
// fog-of-war, not final balance.
export const SIGHT = 40;
const SIGHT2 = SIGHT * SIGHT;

// DEATH_SIGHT — the short radius within which the risen dead become visible to ANY observer, even
// one not attuned to death. Outside it, a ⊤ undead is only seen by an observer whose Umwelt
// includes "slain" (they have learned to sense the dead). Also illustrative, not final balance.
const DEATH_SIGHT = 8;
const DEATH_SIGHT2 = DEATH_SIGHT * DEATH_SIGHT;

// perceivesOf — the observer's Umwelt: the set of predication-names its apparatus can sense, read
// from the observer's own `perceives` rows. An empty/absent set means "perceives everything" (a
// bare sensor). Mirrors observing.mjs's internal perceivesOf, re-derived here because that one is
// not exported. We read raw rows (e === observer, a === "perceives") rather than the settled view
// because `perceives` is an identity-ish doing predicate, not a functional scalar to supersede.
export async function perceivesOf(root, observer) {
  const rows = (await rowsFor(root, observer)).filter((r) => r.e === observer && r.a === "perceives");
  const set = new Set();
  for (const r of rows) if (typeof r.v === "string") set.add(r.v);
  return set;
}

// isRisenUndead — the hidden case. A thing is a RISEN dead (the hard-to-see kind) iff its
// death-rule is "undead" AND its `alive` cell has settled to the held contradiction ⊤ (alive AND
// slain — see death.mjs / prove-undeath.mjs). A plain living monster (glyph "t") or a true corpse
// ("f") is NOT hidden; only the paraconsistent ⊤ situation is.
function isRisenUndead(thing, id) {
  if (valOf(thing, "death-rule", null) !== "undead") return false;
  const c = thing.fiber.find((x) => x.predicate === "alive" && x.object === id);
  return !!c && c.value.glyph === "⊤";
}

// canSee — can `observer` perceive `targetId` right now?
//   (1) SAME ZONE   — you only see what shares your located-in place (fog between rooms is total).
//   (2) WITHIN SIGHT — and within the sight radius inside that zone.
//   (3) HIDDEN RULE  — a risen ⊤ undead is hard to see: it is only perceived by an observer whose
//       Umwelt includes "slain" (they have attuned to death) OR who is very close (within
//       DEATH_SIGHT). Players, NPCs, items, living monsters, corpses — always visible once in
//       zone+range. Keep it simple; this is the illustrative fog-of-war hook, not final balance.
// An observer can never fail to see itself (it always perceives its own existence).
export async function canSee(root, observer, targetId) {
  if (observer === targetId) return true;

  const oZone = await zoneOf(root, observer);
  const tZone = await zoneOf(root, targetId);
  if (!oZone || oZone !== tZone) return false; // (1) different zone (or placeless) → unseen

  const oThing = await view(root, observer);
  const tThing = await view(root, targetId);
  const d2 = dist2(posOf(oThing), posOf(tThing));
  if (d2 > SIGHT2) return false; // (2) out of sight range

  // (3) the hidden rule for the risen dead.
  if (isRisenUndead(tThing, targetId)) {
    const perceives = await perceivesOf(root, observer);
    const attunedToDeath = perceives.size === 0 || perceives.has("slain");
    if (!attunedToDeath && d2 > DEATH_SIGHT2) return false;
  }
  return true;
}

// visibleTo — filter a set/array of candidate ids down to the subset this observer canSee. This is
// the function the snapshot integrator runs over a tick's DIRTY set (per connected player) to build
// that player's personal delta. Returns a plain array, order following the input.
export async function visibleTo(root, observer, candidateIds) {
  const out = [];
  for (const id of candidateIds) {
    if (await canSee(root, observer, id)) out.push(id);
  }
  return out;
}
