/**
 * Accountable agentic transaction bridge law.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { grant, ucanCarrier, ucanFromCapability } from "@emsenn/animating";
import { cohere, sameWitness } from "@emsenn/relating/ledger";
import {
  capabilityInvokeReading,
  attestationReading,
  isAccountable,
  makeTransactionWitness,
  rwilWitnessOf,
  sameAccountableWitness,
  transactionWitness,
  x402ReceiptReading,
} from "../dist/writing/accountable-transaction/index.mjs";
import {
  paymentFromChallenge,
  quantity,
  receiptFromPayment,
} from "../dist/writing/x402/index.mjs";

const witnessedAt = "2026-06-26T05:20:00.000Z";
const capability = grant("did:web:agent.example", "resource:frontier/read", "cap-frontier-read");
const ucan = ucanCarrier.assert({
  ...ucanFromCapability("did:web:issuer.example", capability, { id: "ucan-frontier-read" }),
  proof: {
    type: "RsaSignature2018",
    created: witnessedAt,
    verificationMethod: "did:web:issuer.example#keys-1",
    signatureValue: "structural-proof-for-bridge-law",
  },
}, "test ucan");
const challenge = {
  kind: "organizing.economy.x402.challenge",
  id: "challenge-accountable",
  resource: "https://dev.bare-cedar-fog.emsenn.net/research/frontier",
  payee: "did:web:merchant.example",
  amount: quantity(5, 1, "USD"),
  rails: ["x402"],
  issuedAt: witnessedAt,
};
const payment = paymentFromChallenge(challenge, {
  id: "payment-accountable",
  payer: capability.holder,
  authorization: ucan.id,
  paidAt: witnessedAt,
});
const receipt = receiptFromPayment(challenge, payment, {
  id: "receipt-accountable",
  settledAt: witnessedAt,
});

function transaction(overrides = {}) {
  return makeTransactionWitness({
    id: "txn-accountable",
    witnessedAt,
    affordances: [capability.grants],
    capability,
    authorization: { kind: "ucan", token: ucan },
    challenge,
    payment,
    receipt,
    attestBy: "did:web:builder.example",
    ...overrides,
  });
}

test("a fully formed transaction is authorized, paid, attested, and coherent", () => {
  const witness = transaction();
  const report = isAccountable(witness);

  assert.equal(transactionWitness.validate(witness), true);
  assert.equal(witness.kind, "organizing.accountable.transaction.witness");
  assert.equal(report.kind, "organizing.accountable.query");
  assert.equal(report.authorized, true);
  assert.equal(report.paid, true);
  assert.equal(report.attested, true);
  assert.equal(report.accountable, true);
  assert.deepEqual(report.legs, {
    authorized: "potential",
    paid: "potential",
    attested: "potential",
  });
  assert.equal(report.coherence.length, 3);
  assert.equal(report.coherence.every((entry) => entry.ok), true);
});

test("missing authority fails the query", () => {
  const witness = transaction({ affordances: [] });
  const report = isAccountable(witness);

  assert.equal(report.authorized, false);
  assert.equal(report.accountable, false);
  assert.equal(report.legs.authorized, "active");
});

test("a transaction missing a payment witness fails as an ordinary absent payment", () => {
  const witness = transaction({ payment: undefined, receipt: undefined, paymentClaimed: false });
  const report = isAccountable(witness);

  assert.equal(report.paid, false);
  assert.equal(report.accountable, false);
  assert.equal(report.legs.paid, "active");
  assert.deepEqual(report.disputed, []);
});

test("a claimed payment without a witnessed x402 receipt surfaces as bilattice top", () => {
  const witness = transaction({ receipt: undefined, paymentClaimed: true });
  const report = isAccountable(witness);

  assert.equal(report.paid, false);
  assert.equal(report.accountable, false);
  assert.equal(report.legs.paid, "stable");
  assert.deepEqual(report.disputed, ["payment is claimed but no witnessed x402 receipt is present"]);
});

test("the same RWIL witness reads as capability invoke, x402 receipt, and attestation", () => {
  const witness = transaction();
  const row = rwilWitnessOf(witness);
  const capabilityWire = capabilityInvokeReading.toWire(row);
  const receiptWire = x402ReceiptReading.toWire(row);
  const attestationWire = attestationReading.toWire(row);

  assert.equal(capabilityWire.activity.type, "Invoke");
  assert.equal(capabilityWire.captp.target, capability.id);
  assert.equal(capabilityWire.wasi.capability, capability.id);
  assert.equal(receiptWire.receipt.id, receipt.id);
  assert.equal(attestationWire.attestation.subject, witness.id);
  assert.equal(sameWitness(capabilityInvokeReading.fromWire(capabilityWire), row), true);
  assert.equal(sameWitness(x402ReceiptReading.fromWire(receiptWire), row), true);
  assert.equal(sameWitness(attestationReading.fromWire(attestationWire), row), true);
  assert.equal(sameAccountableWitness(capabilityWire.witness, receiptWire.witness), true);
  assert.equal(cohere(capabilityInvokeReading, x402ReceiptReading, row).ok, true);
  assert.equal(cohere(capabilityInvokeReading, attestationReading, row).ok, true);
  assert.equal(cohere(x402ReceiptReading, attestationReading, row).ok, true);
});
