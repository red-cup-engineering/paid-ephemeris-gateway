import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTIVITYSTREAMS_CONTEXT,
  organizingTheatreActivityForEvent,
  organizingTheatreActivityPubActorResource,
  organizingTheatreAgentActor,
  organizingTheatreAgentActorId,
  organizingTheatreAgentActorsForEvents,
  organizingTheatreInboxPerceptionSignal,
  organizingTheatreSessionCharacter,
  situation,
} from "../dist/index.mjs";

const config = {
  baseUrl: "https://dev.example",
  name: "fixture theatre",
  preferredUsername: "mash",
};

function event({ id, session, harness = "codex", hook = "UserPromptSubmit", source = "fixture", at = `2026-06-26T00:00:0${id}.000Z` }) {
  const activity = organizingTheatreActivityForEvent({
    id: `event-${id}`,
    at,
    source,
    session,
    harness,
    hookEventName: hook,
    payload: { cwd: "lib/organizing", tool_name: hook },
  }, config);
  return {
    kind: "dev.bare-cedar-fog.emsenn.net.agent-event",
    id: `event-${id}`,
    at,
    source,
    session,
    harness,
    hookEventName: hook,
    activity,
    payload: { cwd: "lib/organizing", tool_name: hook },
  };
}

const events = [
  event({ id: 1, session: "s1", hook: "UserPromptSubmit" }),
  event({ id: 2, session: "s1", hook: "PostToolUse" }),
  event({ id: 3, session: "s2", hook: "PreToolUse" }),
  event({ id: 4, session: "s3", hook: "Stop" }),
];

test("a session actor is reconstructed from its event chronicle, not a token/claim seed", () => {
  const actorId = organizingTheatreAgentActorId(config, "codex", "s1");
  const surface = organizingTheatreSessionCharacter(config, "codex", "s1", { actorId, events });
  const actor = organizingTheatreAgentActor(config, "codex", "s1", { events });

  assert.equal(surface.reading.kind, "playing.session-character.reading");
  assert.equal(surface.reading.events, 2);
  assert.equal(surface.reading.folds, 2);
  assert.equal(surface.reading.character.plays.length, 2);
  assert.equal(surface.reading.performedSelf.stateMachine, false);
  assert.ok(surface.reading.masks.some((mask) => mask.axis === "harness" && mask.label === "codex"));
  assert.equal(actor.id, actorId);
  assert.doesNotMatch(actor.summary, /harness session/iu);
});

test("staging a session character is relative to the situation-cast troupe", () => {
  const actorId = organizingTheatreAgentActorId(config, "codex", "s1");
  const partial = organizingTheatreSessionCharacter(config, "codex", "s1", {
    actorId,
    events,
    situation: situation({
      id: "situation:partial",
      scene: "task-to-be-done",
      substrate: ["lib/organizing/src/theatre.mts"],
      matchSize: 2,
    }),
  });
  const full = organizingTheatreSessionCharacter(config, "codex", "s1", {
    actorId,
    events,
    situation: situation({
      id: "situation:full",
      scene: "task-to-be-done",
      substrate: ["lib/organizing/src/theatre.mts", "sites/dev.bare-cedar-fog.emsenn.net/scripts/dev-runtime.mjs"],
      matchSize: 3,
    }),
  });

  assert.equal(partial.troupe.memberIds.length, 2);
  assert.equal(full.troupe.memberIds.length, 3);
  assert.notDeepEqual(partial.troupe.memberIds, full.troupe.memberIds);
  assert.equal(partial.reading.situation.roleDistance.kind, "playing.role-distance");
  assert.equal(full.reading.situation.roleDistance.kind, "playing.role-distance");
});

test("an inbox with delivered activities folds to a perceived agent", () => {
  const actorId = organizingTheatreAgentActorId(config, "codex", "s1");
  const inbound = {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    type: "Create",
    actor: organizingTheatreAgentActorId(config, "codex", "s2"),
    object: { type: "Note", content: "peer|present" },
    to: [actorId],
  };
  const signal = organizingTheatreInboxPerceptionSignal(actorId, [inbound]);

  assert.equal(signal.activities, 1);
  assert.notEqual(signal.agent, null);
  assert.equal(signal.agent.kind, "organizing.theatre.activitypub-inbox-perceived-agent");
});

test("the site-facing actor resource round-trips actor, inbox, outbox, and A2A card surfaces", () => {
  const actorId = organizingTheatreAgentActorId(config, "codex", "s1");
  const inbound = {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    type: "Create",
    actor: organizingTheatreAgentActorId(config, "codex", "s2"),
    object: { type: "Note", content: "peer|present" },
    to: [actorId],
  };
  const inboxEvent = {
    kind: "dev.bare-cedar-fog.emsenn.net.agent-event",
    id: "inbox-1",
    at: "2026-06-26T00:01:00.000Z",
    source: "fixture.activitypub-inbox",
    session: "s1",
    harness: "codex",
    hookEventName: "ActivityPubInbox",
    activity: inbound,
    inboxDelivery: { targetActor: actorId },
    payload: {},
  };
  const eventLog = [...events, inboxEvent];
  const resource = organizingTheatreActivityPubActorResource({
    session: "s1",
    harness: "codex",
    actorId,
    events: eventLog,
    actorHarness: "codex",
    actorSession: "s1",
    seedActors: organizingTheatreAgentActorsForEvents(eventLog, config),
  }, config, {
    inbox: { inboxSource: "fixture.activitypub-inbox" },
  });

  assert.equal(resource.actor.id, actorId);
  assert.equal(resource.inbox.totalItems, 1);
  assert.equal(resource.outbox.type, "OrderedCollection");
  assert.notEqual(resource.inboxPerception.agent, null);
  assert.equal(resource.sessionCharacter.reading.kind, "playing.session-character.reading");
  assert.equal(resource.agentCard.protocolVersion, "1.0.0");
  assert.ok(resource.agentCard.skills.some((skill) => skill.id.startsWith("mask-")));
});
