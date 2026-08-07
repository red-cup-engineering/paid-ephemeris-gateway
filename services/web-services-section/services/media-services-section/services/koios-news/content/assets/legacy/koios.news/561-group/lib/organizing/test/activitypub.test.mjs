/**
 * writing/activitypub — organizing's S2S federation codec: moving data between
 * agent-camps. These tests pin the cross-arena fan-out: one Actor's Activity is
 * delivered to member Actors across camps (the ‖ parallel composition), with the
 * shared-inbox optimization and once-only delivery for members shared across camps.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { agent, actorOfAgent, activityFromUtterance, utteranceFromActivity } from "@emsenn/animating";
import { deliver, deliverToCamps, reach, deliveryRequests, federateActivities, follow, accept, admit, isMember, announce, mergeActivities, translate, grantByOffice, commonGround, converge, investiture, rotateOffice, exchange, ACTIVITYSTREAMS_CONTEXT } from "../dist/index.mjs";

const create = (actor, content) => ({ "@context": ACTIVITYSTREAMS_CONTEXT, type: "Create", actor, object: { content } });
const undo = (actor, content) => ({ "@context": ACTIVITYSTREAMS_CONTEXT, type: "Undo", actor, object: { content } });

const base = "https://561.group/agents";
const actorOf = (name) => actorOfAgent(agent(`${name}|exists`, { identity: name }), { base });
const sol = actorOf("sol");
const luna = actorOf("luna");
const mara = actorOf("mara");

const post = {
  "@context": ACTIVITYSTREAMS_CONTEXT,
  type: "Create",
  actor: `${base}/sol`,
  object: { type: "Note", content: "the-sky|blue" },
};

test("deliver routes one Activity to each recipient Actor's inbox", () => {
  const d = deliver(post, [luna, mara]);
  assert.equal(d.activity, post); // the SAME Activity — no second ontology
  assert.deepEqual([...d.targets], [`${base}/luna/inbox`, `${base}/mara/inbox`]);
});

test("deliverToCamps fans out across camps (the ‖ parallel composition)", () => {
  const camps = [
    { id: "north", members: [luna] },
    { id: "south", members: [mara] },
  ];
  const d = deliverToCamps(post, camps);
  assert.deepEqual([...d.targets], [`${base}/luna/inbox`, `${base}/mara/inbox`]);
  assert.equal(reach(d), 2); // two camps reached
});

test("a camp's sharedInbox stands in for its members (S2S shared-inbox optimization)", () => {
  const camps = [{ id: "north", members: [luna, mara], sharedInbox: `${base}/north/sharedInbox` }];
  const d = deliverToCamps(post, camps);
  assert.deepEqual([...d.targets], [`${base}/north/sharedInbox`]); // one endpoint, not two members
});

test("a member shared across camps (name-passing) is delivered only once", () => {
  const camps = [
    { id: "north", members: [luna, mara] },
    { id: "south", members: [mara] }, // mara belongs to both
  ];
  const d = deliverToCamps(post, camps);
  assert.deepEqual([...d.targets], [`${base}/luna/inbox`, `${base}/mara/inbox`]); // mara once
});

test("federateActivities reads what propagates via the proven federation math", () => {
  // a member who belongs to BOTH camps (name-passing) and says the same thing in each:
  // the concern OVERLAPS and LIFTS coordination-free as `shared`.
  const agree = federateActivities([[create("mara", "treaty|signed")], [create("mara", "treaty|signed")]]);
  assert.equal(agree.kind, "organizing.federation");
  assert.equal(agree.monoidal, "parallel-composition");
  assert.equal(agree.constituents, 2);
  assert.equal(agree.nameMobility, 1, "mara is the member shared across the two camps");
  assert.equal(agree.shared, 1, "the agreed concern lifts to the federation coordination-free");
  assert.equal(agree.coordination, "coordination-free");

  // the same member asserts in one camp and Undoes in the other → it does NOT lift as
  // shared (the federation does not treat a cross-camp disagreement as an agreed concern).
  const conflict = federateActivities([[create("mara", "treaty|signed")], [undo("mara", "treaty|signed")]]);
  assert.equal(conflict.constituents, 2);
  assert.equal(conflict.shared, 0, "a disagreed concern does not lift coordination-free");
});

test("an agent joins a camp via the Follow/Accept handshake, then receives deliveries", () => {
  const camp = { id: `${base}/camps/north`, members: [luna] };
  // sol asks to join; the camp accepts; admit realizes the membership.
  const req = follow(sol, camp);
  assert.equal(req.type, "Follow");
  assert.equal(req.actor, sol.id);
  assert.equal(req.object, camp.id);

  const ack = accept(req, camp);
  assert.equal(ack.type, "Accept");
  assert.equal(ack.actor, camp.id);
  assert.equal(ack.object.content, sol.id); // the follower being accepted

  assert.equal(isMember(camp, sol.id), false);
  const joined = admit(camp, sol);
  assert.equal(isMember(joined, sol.id), true);
  assert.equal(admit(joined, sol).members.length, 2, "admit is idempotent");

  // now a delivery to the camp reaches the new member's inbox
  const d = deliverToCamps(post, [joined]);
  assert.ok([...d.targets].includes(sol.inbox), "the joined member now receives camp deliveries");
});

test("announce broadcasts an Activity to an audience (the boost)", () => {
  const a = announce(post, sol, [`${base}/camps/north/followers`]);
  assert.equal(a.type, "Announce");
  assert.equal(a.actor, sol.id);
  assert.equal(a.object.content, "the-sky|blue");
  assert.deepEqual([...a.to], [`${base}/camps/north/followers`]);
});

test("mergeActivities is a conflict-free CRDT join: idempotent, commutative, retains assert+Undo", () => {
  const A = [create("sol", "treaty|signed")];
  const B = [undo("sol", "treaty|signed")]; // the SAME actor's Undo — a conflict
  const merged = mergeActivities(A, B);
  assert.equal(merged.type, "OrderedCollection");
  assert.equal(merged.totalItems, 2, "both the assertion and its Undo survive (paraconsistent)");

  // idempotent: merging a collection with itself changes nothing
  assert.equal(mergeActivities(A, A).totalItems, 1);
  // commutative: order of camps does not matter
  assert.equal(mergeActivities(B, A).totalItems, 2);
});

test("translate re-frames an Activity into another camp's namespace (V(α), discrete)", () => {
  const map = { [`${base}/sol`]: "https://north.camp/users/sol", [`${base}/camps/all`]: "https://north.camp/all" };
  const framed = translate({ ...post, to: [`${base}/camps/all`] }, map);
  assert.equal(framed.actor, "https://north.camp/users/sol"); // actor re-framed
  assert.deepEqual([...framed.to], ["https://north.camp/all"]); // audience re-framed
  assert.equal(framed.object.content, "the-sky|blue"); // content unchanged — not a re-authoring
});

test("the S2S codec carries animating's scale-1 Activity verbatim (round-trips the claim)", () => {
  const d = deliver(post, [luna]);
  // the delivered Activity is still a valid scale-1 Activity: it admits to a membrane utterance.
  const u = utteranceFromActivity(d.activity);
  assert.equal(u.claim.mark.value, "the-sky|blue");
  assert.equal(activityFromUtterance(u).actor, `${base}/sol`);
});

test("grantByOffice binds OCap issuance to authority: eligible issues, ineligible is denied", () => {
  const eligibleReq = {
    kind: "organizing.office-eligibility-request",
    capabilities: ["mint-treaty"], officeAuthorities: ["chair"],
    requiresCapabilities: ["mint-treaty"], requiresAuthorities: ["chair"],
  };
  const ok = grantByOffice(eligibleReq, "sol", "treaty|sign");
  assert.ok("granted" in ok, "an eligible issuer mints the capability");
  assert.equal(ok.granted.grants, "treaty|sign");

  const ineligibleReq = { ...eligibleReq, officeAuthorities: [] }; // lacks the chair authority
  const no = grantByOffice(ineligibleReq, "sol", "treaty|sign");
  assert.ok("denied" in no, "an ineligible issuer is denied with the eligibility gap");
});

test("commonGround is the thread's accepted, unchallenged claims (Stalnaker)", () => {
  const thread = [
    create("sol", "treaty|signed"),
    create("luna", "venue|booked"),
    undo("mara", "treaty|signed"), // challenges the treaty claim
  ];
  const cg = commonGround(thread);
  assert.ok(cg.includes("venue|booked"), "an unchallenged assertion is common ground");
  assert.ok(!cg.includes("treaty|signed"), "a challenged claim drops out (acceptance is defeasible)");
});

test("converge settles camps per claim: strict consensus + majority (socializing deciding)", () => {
  const campA = [create("sol", "treaty|signed"), create("sol", "venue|booked")];
  const campB = [create("luna", "treaty|signed"), undo("luna", "venue|booked")]; // B challenges the venue
  const result = converge([campA, campB]);
  const treaty = result.find((r) => r.claim === "treaty|signed");
  const venue = result.find((r) => r.claim === "venue|booked");
  assert.equal(treaty.value, "potential", "both camps assert the treaty ⇒ strict consensus to accept");
  assert.equal(treaty.majority, true);
  assert.notEqual(venue.value, "potential", "one camp challenges the venue ⇒ strict consensus is lowered");
});

test("office lifecycle → AS2: investiture (Add), vacate (Remove), rotational authority", () => {
  const inv = investiture("https://561.group/offices/chair", "sol", "https://561.group/body");
  assert.equal(inv.type, "Add");
  assert.equal(inv.object, "sol");
  assert.equal(inv.target, "https://561.group/offices/chair");

  const rot = rotateOffice("https://561.group/offices/chair", ["sol", "luna", "mara"], 0, "https://561.group/body");
  assert.equal(rot.relieved, "sol");
  assert.equal(rot.installed, "luna");
  assert.equal(rot.next, 1);
  assert.equal(rot.activities[0].type, "Remove"); // relieve then install
  assert.equal(rot.activities[1].type, "Add");
  // authority circulates: rotating past the end wraps to the start
  assert.equal(rotateOffice("o", ["a", "b"], 1, "x").installed, "a");
});

test("exchange delegates many capabilities concurrently (FSym name-passing, order-independent)", () => {
  const capSol = { "@context": ACTIVITYSTREAMS_CONTEXT, id: "urn:cap:1", type: "Capability", grants: "room|post", holder: "sol" };
  const capLuna = { "@context": ACTIVITYSTREAMS_CONTEXT, id: "urn:cap:2", type: "Capability", grants: "room|moderate", holder: "luna" };
  const out = exchange([{ capability: capSol, to: "mara" }, { capability: capLuna, to: "nova" }]);
  assert.equal(out.length, 2);
  assert.equal(out[0].capability.holder, "mara");
  assert.equal(out[1].capability.holder, "nova");
  assert.equal(out[0].activity.type, "Offer");
});

test("deliveryRequests is the live S2S transport: POSTs the Activity to each target inbox", () => {
  const d = deliverToCamps(post, [{ id: "north", members: [luna, mara] }]);
  const reqs = deliveryRequests(d);
  assert.equal(reqs.length, 2);
  assert.equal(reqs[0].method, "POST");
  assert.equal(reqs[0].url, `${base}/luna/inbox`);
  assert.match(reqs[0].contentType, /activity\+json/);
  assert.equal(JSON.parse(reqs[0].body).object.content, "the-sky|blue");
});
