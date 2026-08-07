/**
 * writing/did — DIDs + Verifiable Credentials: identity UNDER WMAP. These tests pin
 * the joint: a did:web DID is a pure re-reading of an Actor's host+path (it
 * round-trips to the Actor IRI), a Verifiable Credential is a charged claim with an
 * RSA proof (a signed VC verifies, a tampered VC fails), and a VC can convey an
 * object-capability by reusing the activitypub Capability carrier — not a second
 * ontology.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";

import { mark, claim } from "@emsenn/relating";
import {
  agent,
  actorOfAgent,
  grant,
  canInvoke,
  didFromActor,
  didOfIri,
  iriOfDid,
  actorIdFromDid,
  issueCredential,
  verifyCredential,
  claimOfCredential,
  issueCapabilityCredential,
  DID_CONTEXT,
} from "../dist/index.mjs";

const keys = () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    priv: privateKey.export({ type: "pkcs1", format: "pem" }).toString(),
    pub: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
};

const actorOf = () => actorOfAgent(agent("sol|shines", { identity: "sol" }), { base: "https://dev.bare-cedar-fog.emsenn.net/agents" });

test("a did:web DID round-trips with an Actor (host+path, not server-bound)", () => {
  const actor = actorOf();
  assert.equal(actor.id, "https://dev.bare-cedar-fog.emsenn.net/agents/sol");

  const doc = didFromActor(actor);
  assert.equal(doc["@context"], DID_CONTEXT);
  assert.equal(doc.id, "did:web:dev.bare-cedar-fog.emsenn.net:agents:sol");
  // alsoKnownAs links the DID back to the Actor it re-reads — one identity, two views
  assert.deepEqual(doc.alsoKnownAs, [actor.id]);
  // the Actor's perceive/act legs become DID service endpoints (not re-modeled)
  const inbox = doc.service.find((s) => s.type === "ActivityPubInbox");
  assert.equal(inbox.serviceEndpoint, actor.inbox);

  // the round-trip: actor id → did → actor id is the identity
  assert.equal(didOfIri(actor.id), doc.id);
  assert.equal(actorIdFromDid(doc.id), actor.id);
});

test("a host-root actor yields a bare did:web with the well-known resolution URL", () => {
  assert.equal(didOfIri("https://dev.bare-cedar-fog.emsenn.net"), "did:web:dev.bare-cedar-fog.emsenn.net");
  assert.equal(iriOfDid("did:web:dev.bare-cedar-fog.emsenn.net"), "https://dev.bare-cedar-fog.emsenn.net/.well-known/did.json");
  assert.equal(iriOfDid("did:web:dev.bare-cedar-fog.emsenn.net:agents:sol"), "https://dev.bare-cedar-fog.emsenn.net/agents/sol/did.json");
});

test("a published public key rides the DID document as a verification method", () => {
  const { pub } = keys();
  const doc = didFromActor(actorOf(), { publicKeyPem: pub });
  assert.equal(doc.verificationMethod[0].type, "RsaVerificationKey2018");
  assert.equal(doc.verificationMethod[0].controller, doc.id);
  assert.equal(doc.verificationMethod[0].publicKeyPem, pub);
});

test("a signed Verifiable Credential verifies; its charged claim reads back", () => {
  const { priv, pub } = keys();
  const issuer = "did:web:dev.bare-cedar-fog.emsenn.net:agents:sol";
  const subject = "did:web:dev.bare-cedar-fog.emsenn.net:agents:mara";
  const vc = issueCredential(issuer, subject, claim(mark("is-a-treaty-signatory")), "potential", priv, {
    issuanceDate: "2026-06-25T00:00:00.000Z",
  });

  assert.ok(vc.type.includes("VerifiableCredential"));
  assert.equal(vc.issuer, issuer);
  // the credentialSubject IS relating's claim: token=who (subject), claim=what
  assert.equal(vc.credentialSubject.id, subject);
  assert.equal(vc.credentialSubject.claim, "is-a-treaty-signatory");
  // the charge IS relating's FOUR value (the issuer's evidenced truth-lean)
  assert.equal(vc.charge, "potential");
  assert.equal(vc.proof.type, "RsaSignature2018");

  // a signed VC verifies against the issuer's public key
  assert.equal(verifyCredential(vc, pub), true);
  // the charged claim reads back out as the exact relating claim it enveloped
  assert.equal(String(claimOfCredential(vc).mark.value), "is-a-treaty-signatory");
});

test("a tampered Verifiable Credential fails verification (any component bound)", () => {
  const { priv, pub } = keys();
  const issuer = "did:web:dev.bare-cedar-fog.emsenn.net:agents:sol";
  const vc = issueCredential(issuer, "did:web:dev.bare-cedar-fog.emsenn.net:agents:mara", claim(mark("is-a-treaty-signatory")), "potential", priv, {
    issuanceDate: "2026-06-25T00:00:00.000Z",
  });
  assert.equal(verifyCredential(vc, pub), true);

  // tamper the CLAIM — the signing string changes, verification fails
  const forgedClaim = { ...vc, credentialSubject: { ...vc.credentialSubject, claim: "is-the-head-of-state" } };
  assert.equal(verifyCredential(forgedClaim, pub), false);

  // tamper the CHARGE — the issuer's lean is part of the charged claim, also bound
  const forgedCharge = { ...vc, charge: "stable" };
  assert.equal(verifyCredential(forgedCharge, pub), false);

  // tamper the SUBJECT — who the claim is about is bound too
  const forgedSubject = { ...vc, credentialSubject: { ...vc.credentialSubject, id: "did:web:dev.bare-cedar-fog.emsenn.net:agents:eve" } };
  assert.equal(verifyCredential(forgedSubject, pub), false);
});

test("a credential-as-capability reuses the Capability carrier, still gated by canInvoke", () => {
  const { priv, pub } = keys();
  const issuer = "did:web:dev.bare-cedar-fog.emsenn.net:agents:sol";
  const holder = "did:web:dev.bare-cedar-fog.emsenn.net:agents:mara";
  const cap = grant(holder, "sign-treaty", "urn:cap:test:1");

  const vc = issueCapabilityCredential(issuer, cap, priv, { issuanceDate: "2026-06-25T00:00:00.000Z" });
  assert.ok(vc.type.includes("CapabilityCredential"));
  // the VC is a signed envelope for the EXISTING capability — same id, same grant
  assert.equal(vc.credentialSubject.capability, cap.id);
  assert.equal(vc.credentialSubject.grants, cap.grants);
  assert.equal(vc.credentialSubject.id, holder); // holder = subject
  assert.equal(verifyCredential(vc, pub), true);

  // authority is still by MOVE, not by paper: a signed VC for a move the holder does
  // NOT hold is unexercisable; held → exercisable
  assert.equal(canInvoke(["read-treaty"], cap), false);
  assert.equal(canInvoke(["sign-treaty", "read-treaty"], cap), true);
});
