// Laws for the per-session character reading: the session self is reconstructed from
// its chronicle, wears situational masks, and shifts role-distance with the troupe.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  designFromActs,
  designChronicles,
  mask,
  sameActor,
  sessionCharacterReading,
} from "../dist/index.mjs";

const D = (entries) => designFromActs(new Map(entries));
const actor = D([["", "proponent"], ["0", "proponent"], ["1", "proponent"]]);
const partialAudience = D([["", "opponent"], ["0", "opponent"]]);
const fullerAudience = D([["", "opponent"], ["0", "opponent"], ["1", "opponent"]]);

const sessionEvents = designChronicles(actor).map((chronicle, index) => ({
  kind: "playing.session-character.event:witness",
  session: "019f-session",
  chronicle,
  via: "codex",
  lane: "cwd .",
  office: index === 0 ? "context" : "dispatch",
}));

function readingFor(troupe, universe) {
  const calls = [];
  const perceive = (input, memory, options) => {
    calls.push({ input: input.length, memory: memory?.length ?? 0, identity: options.identity });
    return {
      kind: "animating.agent",
      identity: options.identity,
      events: (memory?.length ?? 0) + input.length,
      memory: memory?.length ?? 0,
      character: { kind: "animating.agent.character", signature: "potential" },
    };
  };
  return { calls, reading: sessionCharacterReading(sessionEvents, troupe, universe, { perceive }) };
}

const entryKey = (design) =>
  design.entries.map((entry) => `${entry.locusKey}:${entry.charge.name}`).sort();

test("a session chronicle folds through perceive with prior events as memory", () => {
  const { calls, reading } = readingFor([actor], [actor, partialAudience]);

  assert.equal(reading.kind, "playing.session-character.reading");
  assert.equal(reading.events, sessionEvents.length);
  assert.equal(reading.folds, sessionEvents.length);
  assert.equal(reading.interior.identity, "019f-session");
  assert.equal(reading.interior.events, sessionEvents.length);
  assert.deepEqual(calls.map((call) => call.memory), [0, 1]);
});

test("a chronicle round-trips to a faithful performative self", () => {
  const { reading } = readingFor([actor], [actor, partialAudience]);

  assert.equal(reading.character.kind, "playing.character-agent");
  assert.equal(reading.character.plays.length, sessionEvents.length);
  assert.equal(reading.performativity.faithful, true);
  assert.equal(reading.performativity.noEssence, true);
  assert.deepEqual(entryKey(reading.performedSelf.self), entryKey(reading.actor));
});

test("session masks compose as delocations of the reconstructed actor", () => {
  const { reading } = readingFor([actor], [actor, partialAudience]);
  const harness = reading.masks.find((entry) => entry.axis === "harness");
  const lane = reading.masks.find((entry) => entry.axis === "lane");
  const office = reading.masks.find((entry) => entry.axis === "office");

  assert.ok(harness);
  assert.ok(lane);
  assert.ok(office);
  assert.equal(harness.label, "codex");
  assert.equal(lane.label, "cwd .");
  assert.equal(office.label, "dispatch");
  assert.equal(sameActor(reading.actor, harness.persona, harness.at), true);

  const composed = mask(harness.persona, lane.at);
  assert.equal(sameActor(harness.persona, composed, lane.at), true);
  assert.equal(reading.identity.coherent, true);
  assert.equal(reading.identity.drift, 0);
});

test("roleDistance is situation-sensitive and shifts when the troupe changes", () => {
  const { reading: partial } = readingFor([actor], [actor, partialAudience]);
  const { reading: full } = readingFor([actor], [actor, fullerAudience]);

  assert.equal(partial.baseline.roleDistance.distance, 0);
  assert.equal(partial.baseline.roleDistance.mode, "identification");
  assert.equal(partial.situation.roleDistance.mode, "role-distance");
  assert.ok(partial.situation.roleDistance.distance > full.situation.roleDistance.distance);
  assert.equal(full.situation.roleDistance.distance, 0);
  assert.equal(full.situation.roleDistance.mode, "identification");
});
