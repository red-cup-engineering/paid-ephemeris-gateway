/**
 * Unified agent identity (bridge #5): the agent's ActivityPub Actor, did:web DID, A2A
 * Agent Card, VC subject, and WebAuthn credential are ONE identity — coherent functorial
 * views of a single AgentIdentity root. These tests pin the three laws:
 *   (a) all five facets derive from one identity and round-trip back to it through the
 *       RWIL coherence kernel;
 *   (b) the projections COMMUTE — DID, Actor, Agent Card, VC subject agree on the one
 *       DID-rooted identity;
 *   (c) one rotation / revocation of the root reflects across every facet's id
 *       consistently, and a revoked identity fails verification on all five.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";

import { cohere } from "@emsenn/relating/ledger";
import {
  mintIdentity,
  rotate,
  revokeIdentity,
  actorFacet,
  didFacet,
  agentCardFacet,
  vcSubjectFacet,
  webauthnOfIdentity,
  facetIdOf,
  verifyFacet,
  actorIriOf,
  identityWitness,
  identityReadings,
  identityReading,
  issueCredential,
  verifyCredential,
} from "../dist/index.mjs";

const keys = () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    priv: privateKey.export({ type: "pkcs1", format: "pem" }).toString(),
    pub: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
};

const FACETS = ["actor", "did", "agent-card", "vc-subject", "webauthn"];

const rootOf = (pub) => mintIdentity("sol", { base: "https://dev.bare-cedar-fog.emsenn.net/agents", publicKeyPem: pub });

test("(a) all five facets derive from one identity and round-trip through the witness", () => {
  const { pub } = keys();
  const root = rootOf(pub);
  const readings = identityReadings(root);
  assert.equal(readings.length, 5);

  const witness = identityWitness(root);
  // every facet reading is an isomorphism on the one identity witness
  for (const reading of readings) {
    const report = cohere(reading, reading, witness);
    assert.equal(report.leftIso, true, `${reading.id} is not iso on the identity witness`);
  }

  // the facets are real projections of the shipped functors, not stand-ins
  const did = vcSubjectFacet(root);
  assert.equal(actorFacet(root).id, "https://dev.bare-cedar-fog.emsenn.net/agents/sol");
  assert.equal(did, "did:web:dev.bare-cedar-fog.emsenn.net:agents:sol");
  assert.equal(didFacet(root).id, did);
  assert.equal(agentCardFacet(root).url, actorIriOf(root));
  assert.equal(webauthnOfIdentity(root).id, `${did}#${root.keyId}`);
});

test("(b) the projections COMMUTE — every pair of facet readings coheres through the shared identity", () => {
  const { pub } = keys();
  const root = rootOf(pub);
  const witness = identityWitness(root);
  const readings = identityReadings(root);

  let pairs = 0;
  for (const left of readings) {
    for (const right of readings) {
      const report = cohere(left, right, witness);
      assert.equal(report.ok, true, `${left.id} <-> ${right.id} do not cohere`);
      pairs += 1;
    }
  }
  assert.equal(pairs, 25);

  // commuting concretely: DID, Actor, Agent Card and VC subject all reduce to one
  // DID-rooted identity (Actor IRI's did:web), the same object under each code
  const did = facetIdOf(root, "did");
  assert.equal(facetIdOf(root, "vc-subject"), did);
  assert.equal(actorIriOf(root), facetIdOf(root, "actor"));
  assert.equal(actorIriOf(root), facetIdOf(root, "agent-card"));
  // and the did:web of the Actor IRI is exactly the DID facet — the round-trip witness
  assert.equal(didFacet(root).alsoKnownAs[0], actorFacet(root).id);
});

test("(c) ONE rotation changes every key-bound facet's id consistently", () => {
  const { pub: pub1 } = keys();
  const { pub: pub2 } = keys();
  const root = rootOf(pub1);

  const before = Object.fromEntries(FACETS.map((f) => [f, facetIdOf(root, f)]));
  const rotated = rotate(root, pub2);

  // the epoch advanced monotonically and the key id changed in ONE operation
  assert.equal(rotated.epoch, root.epoch + 1);
  assert.notEqual(rotated.keyId, root.keyId);

  // the DID-rooted facets are stable across rotation (identity persists, key rotates)
  for (const f of ["actor", "did", "agent-card", "vc-subject"]) {
    assert.equal(facetIdOf(rotated, f), before[f], `${f} should survive rotation`);
  }
  // the key-bound facet (webauthn) moves with the key — one rotation, reflected
  assert.notEqual(facetIdOf(rotated, "webauthn"), before.webauthn);
  assert.equal(webauthnOfIdentity(rotated).keyId, rotated.keyId);
  assert.equal(didFacet(rotated).verificationMethod[0].publicKeyPem, pub2);

  // a facet id minted at the OLD epoch no longer verifies against the rotated root
  assert.equal(verifyFacet(rotated, "webauthn", before.webauthn), false);
  assert.equal(verifyFacet(rotated, "webauthn", facetIdOf(rotated, "webauthn")), true);

  // and the rotated identity still coheres across all five facets
  const witness = identityWitness(rotated);
  for (const left of identityReadings(rotated)) {
    for (const right of identityReadings(rotated)) {
      assert.equal(cohere(left, right, witness).ok, true);
    }
  }
});

test("(c) ONE revocation fails verification on ALL five facets", () => {
  const { pub, priv } = keys();
  const root = rootOf(pub);

  // before revocation: every facet verifies as a live view of the identity
  for (const f of FACETS) {
    assert.equal(verifyFacet(root, f, facetIdOf(root, f)), true, `${f} should verify before revocation`);
  }
  // and a VC issued about the identity's own subject verifies
  const subject = vcSubjectFacet(root);
  const vc = issueCredential(subject, subject, { mark: { value: "is-a-unbound-agent" } }, "potential", priv, {
    issuanceDate: "2026-06-26T00:00:00.000Z",
  });
  assert.equal(verifyCredential(vc, pub), true);

  // ONE revocation of the root
  const revoked = revokeIdentity(root);
  assert.equal(revoked.revoked, true);

  // after revocation: EVERY facet fails verification — one flag, five denials
  for (const f of FACETS) {
    assert.equal(verifyFacet(revoked, f, facetIdOf(revoked, f)), false, `${f} should fail after revocation`);
  }
});

test("a single facet reading is fetchable by name and is iso", () => {
  const { pub } = keys();
  const root = rootOf(pub);
  const reading = identityReading(root, "did");
  assert.equal(reading.id, "animating.identity.did");
  assert.equal(cohere(reading, reading, identityWitness(root)).leftIso, true);
});
