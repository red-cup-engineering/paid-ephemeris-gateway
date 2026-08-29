// tidepool-game — the world's inert content: 15 rooms across three tidal registers (shore,
// pool, underwater), things, and the initial assertion trace, expressed as one `defineGame()`
// per feltos's kernel law "games own inert content" (content/architecture.md). Nothing here is
// code the engine executes — `defineGame` deliberately excludes functions (game.mjs's own
// `jsonValue` check) — only data feltos's real modules (ecology.mjs, market.mjs, world-clock.mjs,
// predication.mjs) already know how to read.
//
// REGISTERS: shore rooms are always walkable. Pool rooms are their own always-walkable rooms
// (a pool does not vanish at low tide — feltos has no room-visibility predicate to hide a room
// behind — but §1.3's contradiction and the ecology cells there make LOW TIDE mean something:
// the tide is read by the `tend`/`harvest`/`dive` capabilities, not by the room graph). The
// underwater register (`deep-channel`, `the-reef`, `eelgrass-meadow`) is NOT reachable by any
// `exit:` predicate at all — the only way in is the `dive` capability (gated on `tideAt()`), and
// the only way out is `surface`. This is a structural guarantee, not a convention: the world
// content validator (`tidepool-game.test.mts`) asserts the underwater rooms carry zero incoming
// `exit:` edges from a non-underwater room.
//
// TWO CONTRADICTIONS, honestly modeled as FOUR `both` (the permit-23 precedent): each is the
// SAME (subject, predicate, object) triple asserted once with positive evidence and once with
// negative evidence by two different named sources — exactly how `joinKnowledge` produces `both`
// (world.mjs's `settleSubject`), not two different objects that never interact.

import { defineGame } from "@red-cup-engineering/feltos/game";
import { FOUR } from "@red-cup-engineering/feltos/four";

export const START_ROOM = "drift-line";

// --- wares this game's economy actually moves -----------------------------------------------
// Every ware below gets a market entry at `the-landing` (price:/base-price:/stock: functional
// predicates) so `trade` has something real to quote, per market.mjs's own predicate shape.
export const WARES = Object.freeze(["fish", "mussel", "clam", "driftwood", "kelp", "sea-glass"]);

// --- ecology cells: subject -> {capacity, stock, pollution} -----------------------------------
// Read by ecology.mjs's stepEcology()/harvestFish() via the CAPACITY("capacity-fish") predicate
// scan — any subject carrying capacity-fish is a cell, regardless of which ware it actually
// stocks (ecology.mjs's fields are generalized over wares by the `harvest` capability, exactly
// as the design brief frames it).
const ECOLOGY_CELLS = Object.freeze({
  "mussel-shelf": { capacity: 60, stock: 60, pollution: 0 },
  "the-reef": { capacity: 50, stock: 50, pollution: 0 },
  "sand-flat": { capacity: 40, stock: 40, pollution: 0 },
});

function ecologyAssertions() {
  const claims: Array<{ subject: string; predicate: string; object: number }> = [];
  for (const [cell, spec] of Object.entries(ECOLOGY_CELLS)) {
    claims.push(
      { subject: cell, predicate: "capacity-fish", object: spec.capacity },
      { subject: cell, predicate: "fish-stock", object: spec.stock },
      { subject: cell, predicate: "pollution", object: spec.pollution },
    );
  }
  return claims;
}

function marketAssertions() {
  const basePrice: Record<string, number> = {
    fish: 4,
    mussel: 3,
    clam: 5,
    driftwood: 1,
    kelp: 2,
    "sea-glass": 6,
  };
  const claims: Array<{ subject: string; predicate: string; object: number }> = [];
  for (const ware of WARES) {
    claims.push(
      { subject: "the-landing", predicate: `price:${ware}`, object: basePrice[ware] },
      { subject: "the-landing", predicate: `base-price:${ware}`, object: basePrice[ware] },
      { subject: "the-landing", predicate: `stock:${ware}`, object: 12 },
    );
  }
  return claims;
}

// --- the two aging contradictions --------------------------------------------------------------
function contradictionAssertions() {
  // NOTE: defineGame's own assertion schema (game.mjs) has no `source` field — every game
  // assertion is told with source = the game id at instantiation. That does not weaken the
  // contradiction: joinKnowledge (world.mjs's settleSubject) folds by (subject, predicate,
  // object) regardless of source, so two claims below still settle to FOUR `both`; only the
  // cosmetic per-cell `sources` list is affected (it dedupes to one entry, "tidepool").
  return [
    // the-weir / harvest-rights: shore-families' customary claim vs. landing-guild's purchased
    // lease — the SAME object ("shore-families") asserted true by one side, false by the other.
    { subject: "the-weir", predicate: "harvest-rights", object: "shore-families", evidence: FOUR.true },
    { subject: "the-weir", predicate: "harvest-rights", object: "shore-families", evidence: FOUR.false },
    // the-spring / water-quality: mirrors farstone's hydrant-23 precedent exactly — "pure"
    // asserted true by one faction, false (fouled) by the other.
    { subject: "the-spring", predicate: "water-quality", object: "pure", evidence: FOUR.true },
    { subject: "the-spring", predicate: "water-quality", object: "pure", evidence: FOUR.false },
  ];
}

// --- the residue things: driftwood, kelp, sea-glass — ware-typed, `take`-able, `craft`-able ---
function residueAssertions() {
  return [
    { subject: "driftwood-a", predicate: "ware-type", object: "driftwood" },
    { subject: "driftwood-b", predicate: "ware-type", object: "driftwood" },
    { subject: "driftwood-c", predicate: "ware-type", object: "driftwood" },
    { subject: "kelp-strand", predicate: "ware-type", object: "kelp" },
    { subject: "sea-glass-shard", predicate: "ware-type", object: "sea-glass" },
  ];
}

// NOTE: "feltos.ecology" and "feltos.world-clock" are feltos's OWN built-in capabilities
// (ecology.mjs's `ecologyCapability`, world-clock.mjs's `worldClockCapability`) — engine.mjs's
// `step()` only fires a capability's `onTick` when its id is BOTH in the runtime AND listed
// here (game.capabilities). Composing them into the runtime (tidepool-capabilities.mts) but
// forgetting to list them here would silently stop fish regrowth and the tide/weather/dry-
// streak clock from ever advancing — listing them is load-bearing, not decorative.
export const TIDEPOOL_CAPABILITY_IDS = Object.freeze([
  "feltos.ecology",
  "feltos.world-clock",
  "tidepool.tend",
  "tidepool.harvest",
  "tidepool.economy",
  "tidepool.tide",
  "tidepool.social",
  "tidepool.discourse",
  "tidepool.governance",
]);

export const TIDEPOOL_GAME = defineGame({
  id: "tidepool",
  name: "The Tidepool",
  start: START_ROOM,
  capabilities: TIDEPOOL_CAPABILITY_IDS,
  functionalPredicates: [
    // ecology (ecology.mjs's own predicate names, generalized over wares per the design brief)
    "fish-stock", "capacity-fish", "pollution",
    // market (market.mjs's own predicate shape, one triple per ware)
    ...WARES.flatMap((ware) => [`price:${ware}`, `base-price:${ware}`, `stock:${ware}`]),
    // clock — world-clock.mjs self-initializes these on first tick; declaring them here just
    // reserves the schema so a `value()` read before tick 1 (e.g. a test) is well-typed.
    "world-time", "world-seed", "weather", "dry-streak",
    // NOTE: "harvest-rights" and "water-quality" (the two contradictions, below) are
    // DELIBERATELY ABSENT from this functional-predicate list. world.mjs's settleSubject only
    // JOINS evidence for a (subject, predicate, object) triple when the predicate is
    // NON-functional (a functional predicate instead keeps only the latest assertion,
    // superseding — the mechanism LOCATED_IN uses so an actor has exactly one place). The two
    // contradictions below assert the SAME object twice, once true once false, and need that
    // to settle to FOUR `both` (joinKnowledge(true, false)) — declaring them functional would
    // silently make the second assertion win outright, destroying the contradiction. See
    // `tidepool-game.test.mts`'s settlement assertions for the check that would have caught
    // this the other way.
    // economy/crafting bookkeeping
    "ware-type", "owner", "coin",
    // governance (progression.mjs's own predicate shapes)
    "proposal:shared-harvest-rights", "law:shared-harvest-rights",
    // the-spring's drought gauge (cap-governance.mts's onTick) — a SEPARATE, functional,
    // honest hook into world-clock.mjs's real dry-streak field; never rewrites the immutable
    // water-quality `both` cell itself (evidence only accumulates, per world.mjs's own law).
    "spring-reading",
    // discourse (this game's own encoding of knowing.mjs's Knowledge record onto an actor)
    "knowledge",
    // predication (predication.mjs's own predicate names)
    "playing-as",
  ],
  rooms: {
    "drift-line": {
      name: "The Drift Line",
      description: "The high-tide wrack line: a ragged scarf of dried kelp, broken shell, and "
        + "bone-pale driftwood the sea has already finished with. This is where you came in.",
      exits: { south: "shingle-beach", east: "tern-bluff" },
    },
    "tern-bluff": {
      name: "Tern Bluff",
      description: "A low bluff crowded with nesting terns. Their racket carries over the whole "
        + "shore — a good place to `listen` for what the tide and the weather are doing.",
      exits: { west: "drift-line" },
    },
    "shingle-beach": {
      name: "The Shingle Beach",
      description: "Loose pebbles clatter underfoot. Paths fan out from here toward the weir, "
        + "the landing, and the drying flats.",
      exits: { north: "drift-line", west: "sand-flat", east: "the-landing", south: "the-weir" },
    },
    "sand-flat": {
      name: "The Sand Flat",
      description: "A wide flat of packed wet sand, pocked with the breathing-holes of buried "
        + "clams. At low tide it stretches on for what feels like a long way.",
      exits: { east: "shingle-beach", west: "the-spring", north: "mussel-shelf" },
    },
    "the-spring": {
      name: "The Spring",
      description: "A freshwater seep breaks from the rock here and threads down toward the "
        + "flat. Two hand-lettered signs, nailed to the same post, disagree about whether it is "
        + "safe to drink.",
      exits: { east: "sand-flat" },
    },
    "mussel-shelf": {
      name: "The Mussel Shelf",
      description: "A rocky shelf furred black with mussels, packed shoulder to shoulder in the "
        + "cracks. A working harvest cell — take only what regrows.",
      exits: { south: "sand-flat", west: "anemone-pool", north: "hermit-hollow" },
    },
    "anemone-pool": {
      name: "The Anemone Pool",
      description: "A shallow, sun-warmed pool, its floor stippled with anemones and the odd "
        + "gleam of sea-glass worn smooth by years of tumbling.",
      exits: { east: "mussel-shelf", north: "kelp-fringe" },
    },
    "hermit-hollow": {
      name: "Hermit Hollow",
      description: "A sheltered overhang where hermit crabs trade shells in slow, deliberate "
        + "processions across the wet stone.",
      exits: { south: "mussel-shelf", east: "kelp-fringe" },
    },
    "kelp-fringe": {
      name: "The Kelp Fringe",
      description: "The pool floor drops away here into a fringe of standing kelp — the last "
        + "dry-footed room before open water. At high or rising tide you could `dive` from here.",
      exits: { south: "anemone-pool", west: "hermit-hollow" },
    },
    "deep-channel": {
      name: "The Deep Channel",
      description: "Cold water, green-dark light filtering from far above. The kelp fringe is "
        + "somewhere overhead; you reached this only by diving, and `surface` is the only way "
        + "back.",
      exits: { east: "the-reef", north: "eelgrass-meadow" },
    },
    "the-reef": {
      name: "The Reef",
      description: "A reef proper, thick with fish moving in loose, wheeling schools. A working "
        + "harvest cell, same as the mussel shelf above.",
      exits: { west: "deep-channel" },
    },
    "eelgrass-meadow": {
      name: "The Eelgrass Meadow",
      description: "A nursery meadow of swaying eelgrass, thick with fry too small to be worth "
        + "taking. Leave them be.",
      exits: { south: "deep-channel" },
    },
    "the-weir": {
      name: "The Weir",
      description: "A fish-weir of staked driftwood and woven withies, half-repaired, half in "
        + "dispute. Whose right it is to work it is not, yet, a settled question.",
      exits: { north: "shingle-beach" },
    },
    "the-landing": {
      name: "The Landing",
      description: "A dock and jetty, and the closest thing this shore has to a market. Fish, "
        + "mussels, and clams change hands here for coin.",
      exits: { west: "shingle-beach", north: "driftwood-shed" },
    },
    "driftwood-shed": {
      name: "The Driftwood Shed",
      description: "A lean-to shed of lashed driftwood, tools hung on pegs. The place to `build` "
        + "something out of what the shore gives up.",
      exits: { south: "the-landing" },
    },
  },
  things: {
    "driftwood-a": { name: "a length of driftwood", description: "Bone-pale, sea-smoothed, still faintly damp.", location: "drift-line" },
    "driftwood-b": { name: "a length of driftwood", description: "Bone-pale, sea-smoothed, still faintly damp.", location: "drift-line" },
    "driftwood-c": { name: "a length of driftwood", description: "Bone-pale, sea-smoothed, still faintly damp.", location: "driftwood-shed" },
    "kelp-strand": { name: "a strand of kelp", description: "Rubbery, salt-slick, longer than it looks coiled.", location: "kelp-fringe" },
    "sea-glass-shard": { name: "a shard of sea-glass", description: "Green, worn to a soft frost by years of tumbling.", location: "anemone-pool" },
  },
  assertions: [
    ...ecologyAssertions(),
    ...marketAssertions(),
    ...contradictionAssertions(),
    ...residueAssertions(),
  ],
});

export const UNDERWATER_ROOMS = Object.freeze(["deep-channel", "the-reef", "eelgrass-meadow"]);
export const HARVEST_CELLS = Object.freeze(["mussel-shelf", "the-reef", "sand-flat"]);
export const HARVEST_WARE_OF: Readonly<Record<string, string>> = Object.freeze({
  "mussel-shelf": "mussel",
  "the-reef": "fish",
  "sand-flat": "clam",
});
export const DIVE_ROOM = "kelp-fringe";
export const DIVE_DESTINATION = "deep-channel";
export const MARKET_ROOM = "the-landing";
export const BUILD_ROOM = "driftwood-shed";
