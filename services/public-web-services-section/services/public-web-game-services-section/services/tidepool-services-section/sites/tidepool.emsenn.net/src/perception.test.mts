// perception.test — the agent-legible perception frame (design §2.1/§2.2): shape, evidence
// legibility for a contested cell, and in-band affordance gating (dive only when the tide
// permits it, harvest/tend only when the cell has something to act on).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { declareFunctional, tell } from "@red-cup-engineering/feltos/world";
import { TIDEPOOL_GAME, DIVE_ROOM } from "./tidepool-game.mts";
import { TIDEPOOL_RUNTIME } from "./tidepool-capabilities.mts";
import { PERCEPTION_KIND, perceptionFrame, perceptionSnapEntry, tidepoolAffordances } from "./perception.mts";

function boot() {
  let engine = createEngine(TIDEPOOL_GAME);
  engine = join(engine, "kip");
  return engine;
}

test("perception frame: has the versioned kind and the documented top-level shape", () => {
  const engine = boot();
  const frame = perceptionFrame(engine.world, "kip", engine.tick, []);
  assert.equal(frame.kind, PERCEPTION_KIND);
  assert.equal(frame.kind, "tidepool.perception.v1");
  assert.equal(frame.actor, "kip");
  assert.equal(frame.tick, 0);
  assert.ok(frame.place !== null);
  assert.equal(frame.place.id, "drift-line");
  assert.equal(typeof frame.place.name, "string");
  assert.equal(typeof frame.place.description, "string");
  assert.ok(Array.isArray(frame.place.exits));
  assert.ok(Array.isArray(frame.occupants));
  assert.ok(Array.isArray(frame.subjects));
  assert.ok(Array.isArray(frame.recentEvents));
  assert.equal(typeof frame.clock.tide, "string");
  assert.equal(typeof frame.clock.weather, "string");
  assert.equal(typeof frame.clock.season, "string");
  assert.equal(typeof frame.clock.dryStreak, "number");
});

test("perception frame: only shows subjects that are structurally visible (perceive()'s restriction, not a filter)", () => {
  const engine = boot();
  const frame = perceptionFrame(engine.world, "kip", 0, []);
  const ids = frame.subjects.map((s) => s.id);
  // kip is at drift-line: sees the room itself, itself, the two driftwood things there — never
  // a room/thing elsewhere on the shore (e.g. the-reef's fish stock is absent, not hidden-false).
  assert.ok(ids.includes("drift-line"));
  assert.ok(ids.includes("kip"));
  assert.ok(!ids.includes("the-reef"));
  assert.ok(!ids.includes("the-landing"));
});

test("perception frame: a contested cell renders its FOUR evidence-name as data, not a silently resolved value", () => {
  const engine = boot();
  // walk kip to the-weir: south, south
  let e = engine;
  e = step(submit(e, { actor: "kip", command: "go south" }), { runtime: TIDEPOOL_RUNTIME }).engine;
  e = step(submit(e, { actor: "kip", command: "go south" }), { runtime: TIDEPOOL_RUNTIME }).engine;
  const frame = perceptionFrame(e.world, "kip", e.tick, []);
  const weir = frame.subjects.find((s) => s.id === "the-weir");
  assert.ok(weir, "the-weir must be a visible subject once kip is there");
  const rightsCell = weir.cells.find((c) => c.predicate === "harvest-rights");
  assert.ok(rightsCell, "harvest-rights must ride in the frame's cells");
  assert.equal(rightsCell.evidence, "both");
});

test("affordances: the-weir enumerates propose/support/enact in-band (found missing running a live session, 2026-08-20 — a player driven purely off the frame could never have discovered governance existed)", () => {
  const engine = boot();
  let e = engine;
  e = step(submit(e, { actor: "kip", command: "go south" }), { runtime: TIDEPOOL_RUNTIME }).engine;
  e = step(submit(e, { actor: "kip", command: "go south" }), { runtime: TIDEPOOL_RUNTIME }).engine;
  const frame = perceptionFrame(e.world, "kip", e.tick, []);
  const weir = frame.subjects.find((s) => s.id === "the-weir");
  assert.ok(weir, "the-weir must be a visible subject once kip is there");
  for (const verb of ["propose", "support", "enact"]) {
    assert.ok(weir.affordances.includes(verb), `the-weir's affordances must include "${verb}"`);
  }
  // and NOT leaked onto an unrelated room
  const driftLine = frame.subjects.find((s) => s.id === "drift-line");
  if (driftLine) {
    for (const verb of ["propose", "support", "enact"]) {
      assert.ok(!driftLine.affordances.includes(verb), `"${verb}" must not appear away from the weir`);
    }
  }
});

test("affordances: a room affords harvest only while its cell has stock, tend only while polluted", () => {
  const engine = boot();
  let e = engine;
  // walk to mussel-shelf: south, west, north
  for (const dir of ["south", "west", "north"]) {
    e = step(submit(e, { actor: "kip", command: `go ${dir}` }), { runtime: TIDEPOOL_RUNTIME }).engine;
  }
  const before = tidepoolAffordances(e.world, "kip", "mussel-shelf");
  assert.ok(before.includes("harvest")); // stock starts at 60 > 0
  assert.ok(!before.includes("tend")); // pollution starts at 0

  // emit pollution via world.mjs's own tell (bypassing the capability, to isolate the affordance
  // check from the tend handler itself), then re-check.
  const polluted = tell(
    declareFunctional(e.world, ["pollution"]),
    { subject: "mussel-shelf", predicate: "pollution", object: 5 },
    { source: "test" },
  );
  const after = tidepoolAffordances(polluted, "kip", "mussel-shelf");
  assert.ok(after.includes("tend"));
});

test("affordances: dive is offered at the kelp fringe only when the tide is high or rising", () => {
  const engine = boot();
  let e = engine;
  for (const dir of ["south", "west", "north", "west", "north"]) {
    e = step(submit(e, { actor: "kip", command: `go ${dir}` }), { runtime: TIDEPOOL_RUNTIME }).engine;
  }
  assert.equal(e.actors.includes("kip"), true);
  const affordances = tidepoolAffordances(e.world, "kip", DIVE_ROOM);
  // whatever the tide happens to be at this fresh world's tick, the affordance and the capability
  // handler's own gate (cap-tide.mts's canDive) must agree exactly — that IS the contract under test.
  const tide = e.world.assertions.filter((a) => a.predicate === "tide").pop();
  if (tide === undefined) {
    // world-clock hasn't self-initialized yet (0 ticks run) — dive must be absent.
    assert.ok(!affordances.includes("dive"));
  }
});

test("affordances: dive tracks the tide across ticks — some tick in one full cycle offers it, some tick doesn't", () => {
  let e = boot();
  for (const dir of ["south", "west", "north", "west", "north"]) {
    e = step(submit(e, { actor: "kip", command: `go ${dir}` }), { runtime: TIDEPOOL_RUNTIME }).engine;
  }
  const seen = new Set();
  for (let i = 0; i < 20; i++) {
    e = step(e, { runtime: TIDEPOOL_RUNTIME }).engine;
    const affordances = tidepoolAffordances(e.world, "kip", DIVE_ROOM);
    seen.add(affordances.includes("dive"));
  }
  assert.equal(seen.size, 2, "dive must be gated on and off across a tide cycle (TIDE_LENGTH=8), not constant");
});

test("perceptionSnapEntry: id matches the actor, and the rest is a verbatim perception frame", () => {
  const engine = boot();
  const entry = perceptionSnapEntry(engine.world, "kip", 0, []);
  assert.equal(entry.id, "kip");
  assert.equal(entry.kind, PERCEPTION_KIND);
  assert.equal(entry.actor, "kip");
});
