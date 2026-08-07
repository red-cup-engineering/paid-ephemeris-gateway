import test from "node:test";
import assert from "node:assert/strict";

import {
  grantWasiCapability,
  macaroonFromCapability,
  macaroonCaveat,
  macaroonThirdPartyCaveat,
  attenuateMacaroonCapability,
  dischargeMacaroonCaveat,
  verifyMacaroon,
  canInvokeMacaroon,
  invokeMacaroonCapability,
  macaroonAttenuationMonotone,
  macaroonTokenCarrier,
  macaroonCaveatCarrier,
  macaroonDischargeCarrier,
  macaroonInvocationCarrier,
} from "../dist/index.mjs";

test("adding a caveat narrows authority monotonically", () => {
  const rootCapability = grantWasiCapability("agent:sol", "ledger|*", { id: "urn:cap:ledger:any" });
  const root = macaroonFromCapability(rootCapability, {
    id: "urn:macaroon:root",
    signature: "hmac-model(root)",
  });
  const readOnly = macaroonCaveat("path=/ledger/read", "ledger|read", { id: "urn:caveat:read" });
  const narrowed = attenuateMacaroonCapability(root, readOnly, { id: "urn:macaroon:read" });

  assert.equal(narrowed.parent, root.id);
  assert.equal(narrowed.capability.parent, rootCapability.id);
  assert.equal(narrowed.capability.grants, "ledger|read");
  assert.deepEqual(narrowed.caveats.map((entry) => entry.id), ["urn:caveat:read"]);
  assert.match(narrowed.signature, /urn:caveat:read/);
  assert.equal(macaroonTokenCarrier.validate(narrowed), true);
  assert.equal(macaroonCaveatCarrier.validate(readOnly), true);
  assert.deepEqual(macaroonAttenuationMonotone(root, narrowed), {
    kind: "playing.macaroons.attenuation-monotone:witness",
    parentGrant: "ledger|*",
    childGrant: "ledger|read",
    checked: [readOnly],
  });

  const widened = macaroonCaveat("path=/vault", "vault|read", { id: "urn:caveat:vault" });
  assert.throws(
    () => attenuateMacaroonCapability(root, widened),
    /widens/,
  );
});

test("a macaroon is exercisable iff every caveat is satisfied and the move is held", () => {
  const root = macaroonFromCapability(
    grantWasiCapability("agent:sol", "ledger|*", { id: "urn:cap:ledger:any" }),
    { id: "urn:macaroon:root" },
  );
  const caveat = macaroonCaveat("path=/ledger/read", "ledger|read", { id: "urn:caveat:read" });
  const token = attenuateMacaroonCapability(root, caveat, { id: "urn:macaroon:read" });
  const context = {
    affordances: ["ledger|read"],
    predicates: ["path=/ledger/read"],
  };

  assert.equal(verifyMacaroon(token, context).valid, true);
  assert.equal(canInvokeMacaroon(token, context), true);

  const invocation = invokeMacaroonCapability(token, context);
  assert.equal(invocation.verified, true);
  assert.equal(invocation.exercisable, true);
  assert.equal(macaroonInvocationCarrier.validate(invocation), true);

  const missingPredicate = verifyMacaroon(token, {
    affordances: ["ledger|read"],
    predicates: [],
  });
  assert.equal(missingPredicate.valid, false);
  assert.ok(missingPredicate.failures.some((failure) => failure.includes("unsatisfied")));

  const missingMove = verifyMacaroon(token, {
    affordances: ["ledger|write"],
    predicates: ["path=/ledger/read"],
  });
  assert.equal(missingMove.valid, false);
  assert.ok(missingMove.failures.some((failure) => failure.includes("not held")));
});

test("a third-party caveat discharges by delegated name-passing", () => {
  const root = macaroonFromCapability(
    grantWasiCapability("agent:sol", "ledger|*", { id: "urn:cap:ledger:any" }),
    { id: "urn:macaroon:root" },
  );
  const needsArchiveOffice = macaroonThirdPartyCaveat(
    "office=archives",
    "ledger|read",
    "agent:archives",
    "https://archives.example/discharge",
    { id: "urn:caveat:archives" },
  );
  const token = attenuateMacaroonCapability(root, needsArchiveOffice, { id: "urn:macaroon:archives" });

  const blocked = verifyMacaroon(token, {
    affordances: ["ledger|read"],
    discharges: [],
  });
  assert.equal(blocked.valid, false);
  assert.ok(blocked.failures.some((failure) => failure.includes("delegated discharge")));

  const delegated = grantWasiCapability("agent:archives", "ledger|read", {
    id: "urn:cap:archives:ledger-read",
    parent: "urn:caveat:archives",
  });
  const discharge = dischargeMacaroonCaveat(needsArchiveOffice, delegated, {
    id: "urn:discharge:archives",
  });
  assert.equal(macaroonDischargeCarrier.validate(discharge), true);

  const admitted = verifyMacaroon(token, {
    affordances: ["ledger|read"],
    discharges: [discharge],
  });
  assert.equal(admitted.valid, true, admitted.failures.join("; "));
});
