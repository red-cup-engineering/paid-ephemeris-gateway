/**
 * writing/a2a — Agent Cards and tasks are projections of the existing agent and
 * capability carriers, not a parallel agent model.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  agent,
  skill,
  grant,
  canInvoke,
  agentCardCarrier,
  a2aTaskCarrier,
  agentCardOfAgent,
  agentCardOfSessionCharacter,
  agentFromAgentCard,
  a2aTaskFromCapability,
  capabilityInvokeFromA2aTask,
  canRunA2aTask,
  canRunSessionA2aTask,
  sessionA2aAffordances,
  routeAgentCard,
  postA2aTask,
  A2A_AGENT_CARD_PATH,
} from "../dist/index.mjs";

test("Agent Card round-trips to/from the Agent carrier and advertises open act-cells as skills", () => {
  const seed = "sol|treaty\nsol|not treaty";
  const a = agent(seed, { identity: "sol" });
  const loci = ["sol|treaty"];
  const card = agentCardOfAgent(a, {
    url: "https://dev.bare-cedar-fog.emsenn.net/a2a",
    affordances: loci,
    skills: [skill("draft-treaty", "procedure", "Activity")],
  });

  assert.equal(agentCardCarrier.validate(card), true);
  assert.deepEqual(agentFromAgentCard(card), a);
  assert.equal(card.name, "sol");
  assert.ok(card.skills.some((s) => s.metadata.locus === loci[0]));
  assert.ok(card.skills.some((s) => s.name === "draft-treaty"));
});

test("A2A task delegation is a capability invoke, exercisable iff the move is held", () => {
  const affordances = ["sol|treaty"];
  const held = grant("https://dev.bare-cedar-fog.emsenn.net/agents/sol", "sol|treaty", "urn:cap:a2a-held");
  const unheld = grant("https://dev.bare-cedar-fog.emsenn.net/agents/sol", "vault|drain", "urn:cap:a2a-unheld");

  const task = a2aTaskFromCapability(held, { id: "task-1", contextId: "ctx-1", skillId: "sign", prompt: "sign treaty" });
  assert.equal(a2aTaskCarrier.validate(task), true);
  assert.equal(task.metadata.locus, "sol|treaty");
  assert.equal(task.metadata.cut, "capability.invoke");
  assert.equal(task.metadata.namePassing, true);

  const invocation = capabilityInvokeFromA2aTask(task);
  assert.equal(invocation.type, "Invoke");
  assert.equal(invocation.actor, held.holder);
  assert.equal(invocation.object.content, held.grants);

  assert.equal(canRunA2aTask(affordances, task), canInvoke(affordances, held));
  assert.equal(canRunA2aTask(affordances, a2aTaskFromCapability(unheld)), false);
});

test("A2A live surface routes Agent Card discovery and gates task posts by canInvoke", () => {
  const a = agent("sol|treaty", { identity: "sol" });
  const card = agentCardOfAgent(a, { url: "https://dev.bare-cedar-fog.emsenn.net/a2a", affordances: ["sol|treaty"] });
  const cardResponse = routeAgentCard(card, { method: "GET", path: A2A_AGENT_CARD_PATH, body: "" });
  assert.equal(cardResponse.status, 200);
  assert.equal(JSON.parse(cardResponse.body).name, "sol");

  const held = grant("sol", "sol|treaty", "urn:cap:task");
  const accepted = postA2aTask(
    { method: "POST", path: "/a2a/message:send", body: JSON.stringify({ id: "task-2", prompt: "go" }) },
    held,
    ["sol|treaty"],
  );
  assert.equal(accepted.response.status, 202);
  assert.equal(accepted.task.metadata.locus, "sol|treaty");

  const rejected = postA2aTask(
    { method: "POST", path: "/a2a/message:send", body: JSON.stringify({ id: "task-3" }) },
    held,
    [],
  );
  assert.equal(rejected.response.status, 403);
});

test("hub session-character projects to a discoverable A2A actor and gates delegated tasks", () => {
  const interior = agent("codex|hub", { identity: "interior-before-session-name" });
  const surface = Object.freeze({
    kind: "animating.writing.a2a.session-character-surface",
    url: "https://dev.bare-cedar-fog.emsenn.net/agent/codex/019f01ed-935c-76a0-b63c-8d60fd73708b",
    session: Object.freeze({
      kind: "playing.session-character.reading",
      name: "session:019f01ed-935c-76a0-b63c-8d60fd73708b",
      interior,
      masks: Object.freeze([
        Object.freeze({
          kind: "playing.session-character.mask",
          axis: "harness",
          label: "codex",
          at: Object.freeze([1, 99]),
          persona: Object.freeze({ actions: Object.freeze([]) }),
        }),
      ]),
    }),
    admittedActions: Object.freeze(["package:@emsenn/relating:run check"]),
    skills: Object.freeze([skill("package:@emsenn/relating:test", "procedure", "relating/check")]),
  });

  const card = agentCardOfSessionCharacter(surface);
  const roundTripped = agentFromAgentCard(card);
  assert.equal(agentCardCarrier.validate(card), true);
  assert.equal(card.name, surface.session.name);
  assert.equal(roundTripped.identity, surface.session.name);
  assert.equal(roundTripped.action.affordances, sessionA2aAffordances(surface).length);
  assert.deepEqual(card.metadata.affordances, sessionA2aAffordances(surface));
  assert.ok(card.skills.some((entry) => entry.metadata.locus === "mask:harness:codex"));
  assert.ok(card.skills.some((entry) => entry.metadata.locus === "package:@emsenn/relating:run check"));
  assert.ok(card.skills.some((entry) => entry.name === "package:@emsenn/relating:test"));

  const allowed = a2aTaskFromCapability(grant(card.name, "package:@emsenn/relating:run check", "urn:cap:relating-check"));
  const blocked = a2aTaskFromCapability(grant(card.name, "package:@emsenn/organizing:edit", "urn:cap:organizing-edit"));
  assert.equal(canRunSessionA2aTask(surface, allowed), true);
  assert.equal(canRunSessionA2aTask(surface, blocked), false);
});
