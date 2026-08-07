/**
 * UCAN — portable object-capabilities. These tests pin the first brick:
 * authority is the existing Capability carrier, a delegation chain verifies only
 * when each step attenuates its parent, and RSA proofs bind the payload.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";

import {
  grant,
  delegate,
  attenuate,
  issueUcan,
  verifyUcan,
  capabilityFromUcan,
  ucanFromCapability,
  revokeUcan,
} from "../dist/index.mjs";

const keys = () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    priv: privateKey.export({ type: "pkcs1", format: "pem" }).toString(),
    pub: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
};

test("a UCAN delegation chain narrows authority and verifies", () => {
  const alice = keys();
  const bob = keys();
  const keyring = {
    "did:example:alice#keys-1": alice.pub,
    "did:example:bob#keys-1": bob.pub,
  };

  const rootCap = grant("did:example:alice", "ledger|*", "urn:cap:root");
  const root = issueUcan("did:example:alice", rootCap, alice.priv, {
    id: "urn:ucan:root",
    created: "2026-06-25T00:00:00.000Z",
  });

  const delegated = delegate(rootCap, "did:example:bob", "urn:cap:bob:any").capability;
  const bobAny = issueUcan("did:example:alice", delegated, alice.priv, {
    id: "urn:ucan:bob:any",
    parent: root,
    created: "2026-06-25T00:01:00.000Z",
  });

  const narrowed = attenuate(delegated, "ledger|read", "urn:cap:bob:read");
  const bobRead = issueUcan("did:example:bob", narrowed, bob.priv, {
    id: "urn:ucan:bob:read",
    parent: bobAny,
    created: "2026-06-25T00:02:00.000Z",
  });

  const result = verifyUcan(bobRead, keyring, [root, bobAny]);
  assert.equal(result.valid, true, result.failures.join("; "));
  assert.deepEqual(result.checked.map((token) => token.id), ["urn:ucan:root", "urn:ucan:bob:any", "urn:ucan:bob:read"]);

  // UCAN <-> Capability is a view, not a second ontology.
  assert.equal(capabilityFromUcan(bobRead).id, narrowed.id);
  assert.equal(capabilityFromUcan(bobRead).grants, "ledger|read");
  assert.equal(ucanFromCapability("did:example:bob", narrowed, { id: "urn:ucan:view" }).authority, narrowed);

  const revoked = revokeUcan(bobRead, "did:example:alice");
  assert.equal(revoked.type, "Undo");
  assert.equal(revoked.object.id, narrowed.id);
});

test("a signed UCAN chain that widens authority fails verification", () => {
  const alice = keys();
  const bob = keys();
  const keyring = {
    "did:example:alice#keys-1": alice.pub,
    "did:example:bob#keys-1": bob.pub,
  };

  const rootCap = grant("did:example:alice", "ledger|read", "urn:cap:root-read");
  const root = issueUcan("did:example:alice", rootCap, alice.priv, {
    id: "urn:ucan:root-read",
    created: "2026-06-25T00:00:00.000Z",
  });

  const widened = {
    ...delegate(rootCap, "did:example:bob", "urn:cap:bob:write").capability,
    grants: "ledger|write",
  };
  const bad = issueUcan("did:example:alice", widened, alice.priv, {
    id: "urn:ucan:bob:write",
    parent: root,
    created: "2026-06-25T00:01:00.000Z",
  });

  const result = verifyUcan(bad, keyring, [root]);
  assert.equal(result.valid, false);
  assert.ok(result.failures.some((failure) => failure.includes("widens")), result.failures.join("; "));
});

test("a bad UCAN signature fails verification", () => {
  const alice = keys();
  const keyring = { "did:example:alice#keys-1": alice.pub };

  const cap = grant("did:example:alice", "ledger|*", "urn:cap:signed");
  const signed = issueUcan("did:example:alice", cap, alice.priv, {
    id: "urn:ucan:signed",
    created: "2026-06-25T00:00:00.000Z",
  });
  assert.equal(verifyUcan(signed, keyring).valid, true);

  const tampered = {
    ...signed,
    authority: { ...signed.authority, grants: "vault|drain" },
  };
  const result = verifyUcan(tampered, keyring);
  assert.equal(result.valid, false);
  assert.ok(result.failures.some((failure) => failure.includes("bad proof")), result.failures.join("; "));
});
