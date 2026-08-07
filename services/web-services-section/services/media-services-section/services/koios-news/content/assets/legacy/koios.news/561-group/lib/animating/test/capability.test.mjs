/**
 * writing/activitypub/capability — object-capabilities through the OUT/playing face.
 * Authority is by MOVE (a capability names a locus you may play), not by identity:
 * a capability is exercisable only when it names an affordance the holder holds, it
 * attenuates to narrower loci, and it delegates by name-passing.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { grant, attenuate, delegate, invoke, canInvoke, revoke, interact } from "../dist/index.mjs";

test("grant issues an unforgeable capability authorizing one locus", () => {
  const cap = grant("https://561.group/agents/sol", "treaty|sign");
  assert.equal(cap.type, "Capability");
  assert.equal(cap.grants, "treaty|sign");
  assert.equal(cap.holder, "https://561.group/agents/sol");
  assert.match(cap.id, /^urn:cap:/); // unforgeable reference
});

test("attenuate derives a narrower capability with provenance", () => {
  const root = grant("sol", "ledger|*", "urn:cap:root");
  const narrow = attenuate(root, "ledger|read");
  assert.equal(narrow.grants, "ledger|read");
  assert.equal(narrow.holder, "sol");
  assert.equal(narrow.parent, "urn:cap:root"); // provenance to the broader cap
});

test("delegate passes a capability by name-passing: an Offer + the re-held capability", () => {
  const cap = grant("sol", "room|post", "urn:cap:a");
  const { capability: passed, activity } = delegate(cap, "luna");
  assert.equal(passed.holder, "luna"); // now held by the delegate
  assert.equal(passed.grants, "room|post");
  assert.equal(passed.parent, "urn:cap:a");
  assert.equal(activity.type, "Offer");
  assert.equal(activity.actor, "sol");
  assert.deepEqual([...activity.to], ["luna"]);
});

test("invoke exercises a capability as an Invoke Activity at the granted locus", () => {
  const cap = grant("sol", "treaty|sign", "urn:cap:b");
  const act_ = invoke(cap);
  assert.equal(act_.type, "Invoke");
  assert.equal(act_.actor, "sol");
  assert.equal(act_.object.content, "treaty|sign");
});

test("revoke withdraws a capability as an Undo of the grant (the negate of authority)", () => {
  const cap = grant("sol", "treaty|sign", "urn:cap:e");
  const rev = revoke(cap);
  assert.equal(rev.type, "Undo");
  assert.equal(rev.actor, "sol");
  assert.equal(rev.object.id, "urn:cap:e");
  assert.equal(rev.object.content, "treaty|sign");
  // an issuer can revoke a delegated capability by passing its own IRI
  assert.equal(revoke(cap, "issuer").actor, "issuer");
});

test("canInvoke is grounded in the OUT face: authority by MOVE, not identity", () => {
  // affordances are the moves the holder may play — the OUT/playing face's open cells
  // (the agent's `act` leg reports them; here given explicitly to test the soundness check).
  const affordances = ["treaty|sign", "ledger|read"];
  const held = grant("sol", "treaty|sign", "urn:cap:c");
  const unheld = grant("sol", "vault|drain", "urn:cap:d"); // a move the agent does not have

  assert.equal(canInvoke(affordances, held), true);
  assert.equal(canInvoke(affordances, unheld), false, "an unheld move cannot be played even with a token");
  // attenuating within held authority stays exercisable; widening past it does not.
  assert.equal(canInvoke(affordances, attenuate(held, "ledger|read")), true);
  assert.equal(canInvoke(affordances, attenuate(held, "vault|drain")), false);
});

test("interact executes invocation as the cut: converges iff the move is legal", () => {
  const affordances = ["treaty|sign"];
  assert.equal(interact(grant("sol", "treaty|sign"), affordances).converged, true);  // Daimon
  assert.equal(interact(grant("sol", "vault|drain"), affordances).converged, false); // diverges
});
