import test from "node:test";
import assert from "node:assert/strict";

import {
  registerWebAuthnCredential,
  challengeWebAuthnCredential,
  canAssertWebAuthnCredential,
  assertWebAuthnCredential,
  cutWebAuthnCeremony,
  webauthnIdentityFacetCarrier,
  webauthnRegistrationCarrier,
  webauthnChallengeCarrier,
  webauthnAssertionCarrier,
  webauthnCutCarrier,
} from "../dist/index.mjs";

const credential = {
  kind: "animating.webauthn-credential",
  id: "did:web:dev.bare-cedar-fog.emsenn.net:agents:sol#keys-0-abc123",
  rpId: "dev.bare-cedar-fog.emsenn.net",
  publicKey: "-----BEGIN PUBLIC KEY-----\nmodel\n-----END PUBLIC KEY-----",
  keyId: "keys-0-abc123",
};

test("registration grants the animating WebAuthn identity facet as a held playing locus", () => {
  const registration = registerWebAuthnCredential(credential, {
    id: "urn:cap:webauthn:sol",
  });

  assert.equal(registration.kind, "playing.webauthn.registration");
  assert.equal(registration.credential.id, credential.id);
  assert.equal(registration.capability.id, "urn:cap:webauthn:sol");
  assert.equal(registration.capability.grants, `webauthn:${credential.rpId}:${credential.id}`);
  assert.equal(registration.capability.holder, "did:web:dev.bare-cedar-fog.emsenn.net:agents:sol");
  assert.equal(webauthnIdentityFacetCarrier.validate(credential), true);
  assert.equal(webauthnRegistrationCarrier.validate(registration), true);
});

test("canInvoke soundness: a WebAuthn credential is assertable iff the move is held", () => {
  const registration = registerWebAuthnCredential(credential, {
    id: "urn:cap:webauthn:sol",
  });
  const held = [registration.capability.grants];
  const unheld = ["webauthn:dev.bare-cedar-fog.emsenn.net:other"];

  assert.equal(canAssertWebAuthnCredential(registration, { affordances: held }), true);
  assert.equal(canAssertWebAuthnCredential(registration, { affordances: unheld }), false);

  const issued = challengeWebAuthnCredential(registration, {
    id: "urn:challenge:1",
    nonce: "nonce-1",
  });
  const accepted = cutWebAuthnCeremony(registration, issued, { affordances: held });
  const denied = cutWebAuthnCeremony(registration, issued, { affordances: unheld });

  assert.equal(accepted.converged, true);
  assert.deepEqual(accepted.daimonLoci, [[]]);
  assert.equal(denied.converged, false);
  assert.equal(denied.reason, "not-held");
  assert.equal(webauthnChallengeCarrier.validate(issued), true);
  assert.equal(webauthnCutCarrier.validate(accepted), true);
});

test("a fresh challenge prevents replay by making the assertion one-shot", () => {
  const registration = registerWebAuthnCredential(credential);
  const issued = challengeWebAuthnCredential(registration, {
    id: "urn:challenge:one-shot",
    nonce: "nonce-fresh",
  });
  const context = { affordances: [registration.capability.grants] };

  const first = assertWebAuthnCredential(registration, issued, context);
  assert.equal(first.verified, true);
  assert.equal(first.exercisable, true);

  const replay = cutWebAuthnCeremony(registration, issued, {
    ...context,
    usedChallenges: [issued.id],
  });
  assert.equal(replay.converged, false);
  assert.equal(replay.reason, "replay");
  assert.equal(replay.assertion.verified, false);
  assert.equal(webauthnAssertionCarrier.validate(first), true);
});

test("registration to challenge to assertion round-trips through the cut", () => {
  const registration = registerWebAuthnCredential(credential, {
    id: "urn:cap:webauthn:roundtrip",
  });
  const issued = challengeWebAuthnCredential(registration, {
    id: "urn:challenge:roundtrip",
    nonce: "nonce-roundtrip",
  });
  const assertion = assertWebAuthnCredential(registration, issued, {
    affordances: [registration.capability.grants],
  });
  const ceremony = cutWebAuthnCeremony(registration, issued, {
    affordances: [registration.capability.grants],
  });

  assert.equal(issued.credential, registration.credential.id);
  assert.equal(issued.grants, registration.capability.grants);
  assert.equal(assertion.credential, registration.credential.id);
  assert.equal(assertion.challenge, issued.id);
  assert.equal(assertion.grants, registration.capability.grants);
  assert.equal(ceremony.assertion.signature, assertion.signature);
  assert.equal(ceremony.converged, true);
});
