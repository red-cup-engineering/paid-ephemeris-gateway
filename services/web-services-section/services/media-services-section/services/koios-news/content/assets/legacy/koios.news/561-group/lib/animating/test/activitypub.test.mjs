/**
 * codecs/activitypub — the across-face standards codec: an Activity is one membrane
 * utterance crossing the boundary, NOT a second ontology. These tests pin the
 * bridge: an inbound Activity admits to the exact UtteranceCarrier the across face
 * reads, and the outbound projection round-trips the actor (who) and claim (what).
 */
import test from "node:test";
import assert from "node:assert/strict";

import { communicatingFace } from "@emsenn/communicating";
import {
  agent,
  utteranceFromActivity,
  activityFromUtterance,
  actorOfAgent,
  perceiveInbox,
  outboxOf,
  routeActor,
  parseInboxActivity,
  webfinger,
  postOutbox,
  outboxWriteLocus,
  admitMedia,
  asArray,
  idOf,
  stripBlindCopy,
  safeRemoteUrl,
  routeCapabilities,
  inboxEvent,
  httpDigest,
  signRequest,
  verifyRequest,
  mediaUploadLocus,
  audience,
  illocutionOf,
  askQuestion,
  answer,
  openChannel,
  send,
  visibility,
  AS2_PUBLIC,
  ACTIVITYSTREAMS_CONTEXT,
} from "../dist/index.mjs";

const sampleActivity = {
  "@context": ACTIVITYSTREAMS_CONTEXT,
  type: "Create",
  actor: "https://dev.bare-cedar-fog.emsenn.net/agents/claude",
  object: { type: "Note", content: "the-sky|blue" },
};

test("an inbound Activity admits to the exact membrane utterance the across face reads", () => {
  const u = utteranceFromActivity(sampleActivity);
  assert.equal(u.kind, "utterance.carrier");
  assert.equal(u.token.mark.value, "https://dev.bare-cedar-fog.emsenn.net/agents/claude"); // actor = who
  assert.equal(u.claim.mark.value, "the-sky|blue"); // object content = what

  // no second ontology: the admitted utterance flows straight into the communicating
  // across face (the same reading the bulk consolidates), holding one settled cell.
  const across = communicatingFace([u]);
  assert.equal(across.faculty, "communicating");
  assert.equal(across.direction, "across");
  assert.equal(across.cover, 1);
});

test("string-object activities carry the bare string as the claim", () => {
  const u = utteranceFromActivity({ "@context": ACTIVITYSTREAMS_CONTEXT, type: "Announce", actor: "a", object: "x|p" });
  assert.equal(u.token.mark.value, "a");
  assert.equal(u.claim.mark.value, "x|p");
});

test("outbound projection round-trips the actor (who) and claim (what)", () => {
  const back = activityFromUtterance(utteranceFromActivity(sampleActivity));
  assert.equal(back["@context"], ACTIVITYSTREAMS_CONTEXT);
  assert.equal(back.type, "Create"); // default assertion
  assert.equal(back.actor, sampleActivity.actor);
  assert.equal(back.object.content, "the-sky|blue");
  assert.equal(back.object.type, "Note");
});

test("actorOfAgent projects the agent as an Actor: identity → id, the loop → inbox/outbox", () => {
  const a = agent("sol|shines", { identity: "sol" });
  const actor = actorOfAgent(a, { base: "https://dev.bare-cedar-fog.emsenn.net/agents" });
  assert.equal(actor.type, "Service");
  assert.equal(actor.id, "https://dev.bare-cedar-fog.emsenn.net/agents/sol");
  assert.equal(actor.preferredUsername, "sol");
  assert.equal(actor.inbox, "https://dev.bare-cedar-fog.emsenn.net/agents/sol/inbox"); // perceive leg
  assert.equal(actor.outbox, "https://dev.bare-cedar-fog.emsenn.net/agents/sol/outbox"); // act leg
  assert.equal(actor.followers, "https://dev.bare-cedar-fog.emsenn.net/agents/sol/followers");
});

test("an absolute-IRI identity is used directly as the Actor id", () => {
  const a = agent("x|p", { identity: "https://other.example/users/mara" });
  const actor = actorOfAgent(a);
  assert.equal(actor.id, "https://other.example/users/mara");
  assert.equal(actor.inbox, "https://other.example/users/mara/inbox");
});

test("the Actor card reflects the agent's interior faces (truth lean, cognition, character)", () => {
  const actor = actorOfAgent(agent("sol|treaty", { identity: "sol" }), { base: "https://561.group/agents" });
  assert.equal(typeof actor.summary, "string");
  assert.match(actor.summary, /truth axis/);
  assert.match(actor.summary, /knowledge axis/);
  assert.match(actor.summary, /characteristic standing/);
});

test("an Undo crosses as a denial; assertion + Undo of the same subject pool to ⊤", () => {
  const assertCreate = { "@context": ACTIVITYSTREAMS_CONTEXT, type: "Create", actor: "a", object: { content: "the-sky|blue" } };
  const undo = { "@context": ACTIVITYSTREAMS_CONTEXT, type: "Undo", actor: "a", object: { content: "the-sky|blue" } };

  const denial = utteranceFromActivity(undo);
  assert.equal(denial.claim.mark.value, "not the-sky|blue"); // negation marker the across face reads

  // the across face pools the assertion and its Undo on ONE subject cell → stable ⊤ (held contradiction)
  const across = communicatingFace([utteranceFromActivity(assertCreate), denial]);
  assert.equal(across.cover, 1, "same subject");
  assert.equal(across.contested, 1, "asserted AND undone ⇒ one told-both ⊤ cell");
});

test("denial round-trips through wire polarity: denial utterance → Undo activity", () => {
  const undo = { "@context": ACTIVITYSTREAMS_CONTEXT, type: "Undo", actor: "a", object: { content: "x|p" } };
  const back = activityFromUtterance(utteranceFromActivity(undo));
  assert.equal(back.type, "Undo"); // polarity preserved
  assert.equal(back.object.content, "x|p"); // bare positive statement being undone
});

test("perceiveInbox folds inbound Activities into the agent via its own perceive loop", () => {
  // the SAME actor asserts then undoes the same subject ⇒ a held contradiction (⊤),
  // pooled by (utterer, claim) at the agent's perception.
  const inbox = [
    { "@context": ACTIVITYSTREAMS_CONTEXT, type: "Create", actor: "sol", object: { content: "the-sky|blue" } },
    { "@context": ACTIVITYSTREAMS_CONTEXT, type: "Undo", actor: "sol", object: { content: "the-sky|blue" } },
  ];
  const a = perceiveInbox(inbox, undefined, { identity: "sol" });
  assert.equal(a.kind, "animating.agent");
  assert.equal(a.loop, "perceive->act");
  assert.equal(a.perception.contested, 1);
});

test("outboxOf wraps outbound Activities as an AS2 OrderedCollection", () => {
  const out = outboxOf([{ "@context": ACTIVITYSTREAMS_CONTEXT, type: "Create", actor: "sol", object: { content: "x|p" } }], "https://dev.bare-cedar-fog.emsenn.net/agents/sol/outbox");
  assert.equal(out.type, "OrderedCollection");
  assert.equal(out.totalItems, 1);
  assert.equal(out.orderedItems[0].actor, "sol");
});

test("FOUR bilattice ↔ AS2 visibility: addressing is epistemic reach (round-trips)", () => {
  const followers = "https://561.group/agents/sol/followers";
  // ⊤ stable = public (maximal reach)
  const pub = audience("stable", followers);
  assert.ok(pub.to.includes(AS2_PUBLIC));
  assert.equal(visibility({ "@context": ACTIVITYSTREAMS_CONTEXT, type: "Create", actor: "sol", object: "x|p", ...pub }, followers), "stable");
  // t potential = followers-only
  assert.equal(visibility({ "@context": ACTIVITYSTREAMS_CONTEXT, type: "Create", actor: "sol", object: "x|p", ...audience("potential", followers) }, followers), "potential");
  // ⊥ absurd = direct/private (no reach beyond named recipients)
  assert.equal(visibility({ "@context": ACTIVITYSTREAMS_CONTEXT, type: "Create", actor: "sol", object: "x|p", ...audience("absurd", followers, ["luna"]) }, followers), "absurd");
});

test("illocutionOf reads each Activity as a Searle speech act (saying-as-doing)", () => {
  const A = (type) => ({ "@context": ACTIVITYSTREAMS_CONTEXT, type, actor: "a", object: "x|p" });
  assert.equal(illocutionOf(A("Create")), "assertive");
  assert.equal(illocutionOf(A("Follow")), "directive");
  assert.equal(illocutionOf(A("Invoke")), "directive"); // invoking a capability is a request
  assert.equal(illocutionOf(A("Accept")), "commissive");
  assert.equal(illocutionOf(A("Like")), "expressive");
  assert.equal(illocutionOf(A("Undo")), "declaration"); // performative: changes social reality
  assert.equal(illocutionOf(A("Whatever")), "assertive"); // default
});

test("openChannel + send is AS2 direct messaging: privately addressed (visibility ⊥)", () => {
  const ch = openChannel("https://561.group/agents/sol", "https://561.group/agents/luna");
  const dm = send(ch, "meet|at-noon");
  assert.equal(dm.type, "Create");
  assert.equal(dm.actor, "https://561.group/agents/sol");
  assert.deepEqual([...dm.to], ["https://561.group/agents/luna"]); // only the recipient
  assert.ok(!(dm.to ?? []).includes(AS2_PUBLIC), "a DM is not public");
  assert.equal(visibility(dm, "https://561.group/agents/sol/followers"), "absurd"); // ⊥ direct
});

test("answer reads the agent's settled ≤_k standing from what it knows (four epistemic answers)", () => {
  const know = [
    { "@context": ACTIVITYSTREAMS_CONTEXT, type: "Create", actor: "sol", object: { content: "sky|blue" } },
    { "@context": ACTIVITYSTREAMS_CONTEXT, type: "Create", actor: "sol", object: { content: "grass|green" } },
    { "@context": ACTIVITYSTREAMS_CONTEXT, type: "Undo", actor: "sol", object: { content: "grass|green" } },
  ];
  assert.equal(answer(know, "sky|blue"), "potential");   // believes
  assert.equal(answer(know, "grass|green"), "stable");   // ⊤ asserted AND undone — knows both
  assert.equal(answer(know, "moon|cheese"), "absurd");   // ⊥ doesn't know
  assert.equal(askQuestion("sol", "sky|blue").type, "Question");
});

test("routeActor serves the live ActivityPub HTTP surface (transport in lib, pure routing)", () => {
  const a = agent("sol|here", { identity: "sol" });
  const actor = actorOfAgent(a, { base: "https://561.group/agents" });
  const outbox = outboxOf([{ "@context": ACTIVITYSTREAMS_CONTEXT, type: "Create", actor: actor.id, object: { content: "x|p" } }]);

  const getActor = routeActor(actor, outbox, { method: "GET", path: "/agents/sol", query: {}, body: "" });
  assert.match(getActor.type, /application\/activity\+json/);
  assert.equal(JSON.parse(getActor.body).id, actor.id);

  const getOutbox = routeActor(actor, outbox, { method: "GET", path: "/agents/sol/outbox", query: {}, body: "" });
  assert.equal(JSON.parse(getOutbox.body).type, "OrderedCollection");

  // POST to the inbox is the perceive leg — acknowledged 202; the posted Activity parses
  const post = { method: "POST", path: "/agents/sol/inbox", query: {}, body: JSON.stringify({ "@context": ACTIVITYSTREAMS_CONTEXT, type: "Create", actor: "luna", object: { content: "hi|there" } }) };
  assert.equal(routeActor(actor, outbox, post).status, 202);
  assert.equal(parseInboxActivity(post).actor, "luna");

  // WebFinger resolves a handle to the Actor id
  assert.equal(JSON.parse(webfinger(actor, "acct:sol@561.group").body).links[0].href, actor.id);
});

test("postOutbox is the capability-gated C2S write path (auth by move, server mints id)", () => {
  const a = agent("sol|here", { identity: "sol" });
  const actor = actorOfAgent(a, { base: "https://561.group/agents" });
  const locus = outboxWriteLocus(actor.id);
  const cap = { "@context": ACTIVITYSTREAMS_CONTEXT, id: "urn:cap:ob", type: "Capability", grants: locus, holder: actor.id };
  const affordances = [locus]; // the agent holds the outbox-write move

  // a bare Note posted to the outbox is wrapped in Create, actor bound, id minted
  const note = { method: "POST", path: "/agents/sol/outbox", query: {}, body: JSON.stringify({ "@context": ACTIVITYSTREAMS_CONTEXT, type: "Note", content: "the-sky|blue", to: ["https://www.w3.org/ns/activitystreams#Public"] }) };
  const ok = postOutbox(actor, note, cap, affordances);
  assert.equal(ok.response.status, 201);
  assert.equal(ok.created.type, "Create");          // bare object wrapped
  assert.equal(ok.created.actor, actor.id);          // server binds the actor
  assert.match(ok.created.id, /\/activities\//);     // server-minted id
  assert.equal(ok.created.object.content, "the-sky|blue");

  // a capability that does not grant THIS actor's outbox-write is refused
  const wrong = { ...cap, grants: "something|else" };
  assert.equal(postOutbox(actor, note, wrong, affordances).response.status, 403);
  // a held-but-not-affordable capability (the move isn't legal) is refused
  assert.equal(postOutbox(actor, note, cap, []).response.status, 403);
});

test("admitMedia is OCapped upload: attenuable by kind and size, authority by move", () => {
  const a = agent("sol|here", { identity: "sol" });
  const actor = actorOfAgent(a, { base: "https://561.group/agents" });
  const imageLocus = mediaUploadLocus(actor.id, "Image");
  const broadLocus = mediaUploadLocus(actor.id);

  const imageCap = { "@context": ACTIVITYSTREAMS_CONTEXT, id: "urn:cap:img", type: "Capability", grants: imageLocus, holder: actor.id };
  const jpeg = { mediaType: "image/jpeg", url: "https://cdn/sol/a.jpg", size: 1000, name: "alt" };
  const mp3 = { mediaType: "audio/mpeg", url: "https://cdn/sol/a.mp3", size: 1000 };

  // an image-attenuated capability admits an image...
  const ok = admitMedia(actor, imageCap, [imageLocus], jpeg);
  assert.equal(ok.object.type, "Image");
  assert.match(ok.object.id, /\/media\//); // server-minted
  assert.equal(ok.object.name, "alt");

  // ...but NOT audio (attenuation by kind holds)
  assert.ok(admitMedia(actor, imageCap, [imageLocus], mp3).denied);

  // a broad capability admits any kind
  const broadCap = { "@context": ACTIVITYSTREAMS_CONTEXT, id: "urn:cap:m", type: "Capability", grants: broadLocus, holder: actor.id };
  assert.equal(admitMedia(actor, broadCap, [broadLocus], mp3).object.type, "Audio");

  // size attenuation: a byte ceiling refuses an oversized asset
  assert.ok(admitMedia(actor, broadCap, [broadLocus], { ...jpeg, size: 9_000_000 }, { maxBytes: 5_000_000 }).denied);

  // authority by move: holding the cap but not the affordance is refused
  assert.ok(admitMedia(actor, imageCap, [], jpeg).denied);
});

test("AS2 normalization + security strips (arrays↔singletons, id↔embedded, bcc, SSRF)", () => {
  assert.deepEqual([...asArray("x")], ["x"]);
  assert.deepEqual([...asArray(["a", "b"])], ["a", "b"]);
  assert.deepEqual([...asArray(undefined)], []);
  assert.equal(idOf("https://x/1"), "https://x/1");
  assert.equal(idOf({ id: "https://x/2", type: "Note" }), "https://x/2"); // embedded → id
  assert.ok(!("bcc" in stripBlindCopy({ type: "Create", bcc: ["secret"], to: ["pub"] })));
  assert.equal(safeRemoteUrl("https://mastodon.social/users/x"), true);
  assert.equal(safeRemoteUrl("http://localhost/x"), false);      // SSRF: loopback
  assert.equal(safeRemoteUrl("https://169.254.169.254/"), false); // SSRF: metadata
  assert.equal(safeRemoteUrl("file:///etc/passwd"), false);       // SSRF: scheme
});

test("routeCapabilities advertises features + the capability loci (authority by move)", () => {
  const actor = actorOfAgent(agent("sol|here", { identity: "sol" }), { base: "https://561.group/agents" });
  const res = routeCapabilities(actor, { method: "GET", path: "/.well-known/activitypub-api", query: {}, body: "" });
  const doc = JSON.parse(res.body);
  assert.equal(doc.features.capabilityAuth, true);
  assert.equal(doc.features.oauthScopeAuth, false);
  assert.ok(doc.loci.includes(`${actor.id}|outbox:write`));
  assert.ok(doc.loci.includes(`${actor.id}|media:upload:image`));
});

test("inboxEvent formats AS2 collection deltas as SSE frames (the realtime read leg)", () => {
  const frame = inboxEvent("Add", { target: "https://561.group/agents/sol/inbox", object: "https://remote/act/1" });
  assert.match(frame, /event: Add/);
  assert.match(frame, /data: /);
  assert.match(frame, /remote\/act\/1/);
});

test("HTTP Signatures: sign then verify round-trips; tamper fails (S2S auth)", async () => {
  const { generateKeyPairSync } = await import("node:crypto");
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const priv = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
  const pub = publicKey.export({ type: "spki", format: "pem" }).toString();

  const body = JSON.stringify({ type: "Create" });
  const headers = { host: "example.social", date: "Wed, 25 Jun 2026 18:00:00 GMT", digest: httpDigest(body) };
  const signed = signRequest("POST", "/users/bob/inbox", headers, "https://561.group/agents/sol#key", priv);

  assert.ok(signed.signature.includes('keyId="https://561.group/agents/sol#key"'));
  assert.equal(verifyRequest("POST", "/users/bob/inbox", headers, signed.signature, pub), true);
  // tampered path → verification fails
  assert.equal(verifyRequest("POST", "/users/eve/inbox", headers, signed.signature, pub), false);
});
