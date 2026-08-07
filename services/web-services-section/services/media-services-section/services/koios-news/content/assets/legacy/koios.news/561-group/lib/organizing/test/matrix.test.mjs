/**
 * writing/matrix — organizing's Matrix codec: state-resolution over a signed event-DAG
 * as sheaf consensus / H¹ over an event graph. These tests pin the brick:
 *   1. an event is a VIEW of an animating Activity (no second ontology);
 *   2. two branches of the DAG that AGREE resolve coordination-free;
 *   3. a CONFLICT is settled by the consensus reading (contested → ⊤), not dropped;
 *   4. the room federates by the SAME cross-arena Mayer–Vietoris WMAP's S2S uses.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { agent, actorOfAgent, ACTIVITYSTREAMS_CONTEXT } from "@emsenn/animating";
import {
  asActivity,
  isStateEvent,
  ancestryOf,
  resolveState,
  isCoordinationFree,
  federateRoom,
} from "../dist/index.mjs";

const base = "https://561.group/agents";
const actorOf = (name) => actorOfAgent(agent(`${name}|exists`, { identity: name }), { base });
const sol = actorOf("sol");
const luna = actorOf("luna");

/** A Matrix state event (DAG node) carrying a claim into the cell (type, stateKey). */
const stateEvent = (eventId, prevEvents, type, stateKey, sender, content) => ({
  eventId,
  prevEvents,
  type,
  stateKey,
  sender,
  object: { type: "Note", content },
});

const room = (camp, events) => ({ camp, events });

test("a Matrix event is a VIEW of an animating Activity (no second ontology)", () => {
  const e = stateEvent("$e1", [], "m.room.name", "", sol.id, "the-room|sky");
  const a = asActivity(e);
  assert.equal(a["@context"], ACTIVITYSTREAMS_CONTEXT);
  assert.equal(a.type, "m.room.name");
  assert.equal(a.actor, sol.id); // sender becomes the AS2 actor (the membrane token)
  assert.equal(a.object.content, "the-room|sky");
  assert.equal(a.id, "$e1");
  assert.equal(isStateEvent(e), true);
  assert.equal(isStateEvent({ ...e, stateKey: undefined }), false); // timeline event
});

test("two branches of the event DAG that AGREE resolve coordination-free", () => {
  // create -> (branch A sets name) and (branch B sets name to the SAME value)
  const create = stateEvent("$root", [], "Create", "", sol.id, "room|created");
  const branchA = stateEvent("$a", ["$root"], "m.room.name", "", sol.id, "name|aurora");
  const branchB = stateEvent("$b", ["$root"], "m.room.name", "", luna.id, "name|aurora");
  const r = room({ id: "north", members: [sol, luna] }, [create, branchA, branchB]);

  const cells = resolveState(r);
  assert.equal(isCoordinationFree(cells), true); // forks agree ⇒ no held conflict

  const nameCell = cells.find((c) => c.type === "m.room.name");
  assert.ok(nameCell);
  assert.equal(nameCell.forked, false); // one claim — the branches concur
  assert.equal(nameCell.claim, "name|aurora");
  assert.equal(nameCell.value, "potential"); // settles affirmatively, consensus reached
});

test("a CONFLICT is settled by the consensus reading (⊤ held), NOT silently dropped", () => {
  // create -> two branches set the SAME cell to DIFFERENT values (a real fork)
  const create = stateEvent("$root", [], "Create", "", sol.id, "room|created");
  const branchA = stateEvent("$a", ["$root"], "m.room.name", "", sol.id, "name|aurora");
  const branchB = stateEvent("$b", ["$root"], "m.room.name", "", luna.id, "name|borealis");
  const r = room({ id: "north", members: [sol, luna] }, [create, branchA, branchB]);

  const cells = resolveState(r);
  assert.equal(isCoordinationFree(cells), false); // a held conflict exists

  const nameCell = cells.find((c) => c.type === "m.room.name");
  assert.ok(nameCell);
  assert.equal(nameCell.forked, true);
  assert.equal(nameCell.value, "stable"); // ⊤ — the conflict is HELD, not last-writer
  // BOTH candidate claims survive the resolution — no witness dropped (paraconsistent)
  assert.deepEqual([...nameCell.candidates].sort(), ["name|aurora", "name|borealis"]);
});

test("ancestryOf walks one branch's causal past in DAG order (parents before children)", () => {
  const create = stateEvent("$root", [], "Create", "", sol.id, "room|created");
  const branchA = stateEvent("$a", ["$root"], "m.room.name", "", sol.id, "name|aurora");
  const branchB = stateEvent("$b", ["$root"], "m.room.name", "", luna.id, "name|borealis");
  const r = room({ id: "north", members: [sol, luna] }, [create, branchA, branchB]);

  const past = ancestryOf(r, "$a");
  assert.deepEqual(past.map((e) => e.eventId), ["$root", "$a"]); // B is NOT in A's past
});

test("a room federates by the SAME cross-arena Mayer–Vietoris as WMAP's S2S", () => {
  // agreeing branches: federation glues coordination-free (shared lifts, none contested)
  const agreeA = [stateEvent("$a", [], "m.room.name", "", sol.id, "name|aurora")];
  const agreeB = [stateEvent("$b", [], "m.room.name", "", luna.id, "name|aurora")];
  const fedAgree = federateRoom([agreeA, agreeB]);
  assert.equal(fedAgree.kind, "organizing.federation");
  assert.equal(fedAgree.monoidal, "parallel-composition");
  assert.equal(fedAgree.contested, 0);
  assert.equal(fedAgree.coordination, "coordination-free");

  // a member asserting in one branch and Undoing the SAME claim in the other is a
  // cross-arena DISAGREEMENT: the proven federation reading is that the concern does
  // NOT lift coordination-free (shared === 0) — yet both branches still GLUE (no
  // witness dropped), exactly as WMAP's S2S federateActivities reports it.
  const assertB = [{ eventId: "$c", prevEvents: [], type: "Create", sender: sol.id, object: { content: "sky|blue" } }];
  const denyB = [{ eventId: "$d", prevEvents: [], type: "Undo", sender: sol.id, object: { content: "sky|blue" } }];
  const fedConflict = federateRoom([assertB, denyB]);
  assert.equal(fedConflict.shared, 0); // a disagreed concern does not lift coordination-free
  assert.equal(fedConflict.members, 1); // the member (witness) is still present — not dropped
});
