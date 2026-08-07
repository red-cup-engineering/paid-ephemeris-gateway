/**
 * x402/AP2/L402 is organizing's economic protocol projection.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  isWitnessedExchange,
  paymentFromChallenge,
  quantity,
  receiptFromPayment,
  receiptFromWitnessLog,
  receiptLedgerState,
  valueConserved,
  witnessLogFromReceipt,
  x402ReceiptLogReading,
  x402ChallengeCarrier,
  x402PaymentCarrier,
  x402ReceiptCarrier,
} from "../dist/writing/x402/index.mjs";
import { cohereLog } from "@emsenn/relating/ledger";

const challenge = {
  kind: "organizing.economy.x402.challenge",
  id: "challenge-402",
  resource: "https://dev.bare-cedar-fog.emsenn.net/research/frontier",
  payee: "did:web:merchant.example",
  amount: quantity(25, 1, "USD"),
  rails: ["x402", "ap2", "l402"],
  issuedAt: "2026-06-26T02:40:00.000Z",
  memo: "frontier note access",
};

test("a 402 challenge crosses the membrane as a payment and settles to a receipt", () => {
  assert.equal(x402ChallengeCarrier.validate(challenge), true);

  const payment = paymentFromChallenge(challenge, {
    id: "payment-402",
    payer: "did:web:agent.example",
    rail: "x402",
    authorization: "test-authorization-only",
    paidAt: "2026-06-26T02:41:00.000Z",
  });

  assert.equal(x402PaymentCarrier.validate(payment), true);
  assert.equal(payment.challengeId, challenge.id);
  assert.equal(payment.membrane, "across");
  assert.deepEqual(payment.amount, challenge.amount);

  const receipt = receiptFromPayment(challenge, payment, {
    id: "receipt-402",
    settledAt: "2026-06-26T02:42:00.000Z",
  });

  assert.equal(x402ReceiptCarrier.validate(receipt), true);
  assert.equal(receipt.challengeId, challenge.id);
  assert.equal(receipt.paymentId, payment.id);
  assert.equal(receipt.resource, challenge.resource);
  assert.equal(receipt.valueConserved, true);
});

test("a settled payment is a witnessed exchange in the RWIL ledger", () => {
  const payment = paymentFromChallenge(challenge, {
    payer: "did:web:agent.example",
    authorization: "test-authorization-only",
  });
  const receipt = receiptFromPayment(challenge, payment);
  const state = receiptLedgerState(receipt);

  assert.equal(isWitnessedExchange(receipt), true);
  assert.equal(receipt.witnessLedger.length >= 3, true);
  assert.ok(
    Object.values(state).some(
      (row) =>
        row.kind === "organizing.economy.exchange.settlement" &&
        row.challenge === challenge.id &&
        row.payment === payment.id,
    ),
  );
});

test("an x402 receipt is a reversible log reading over its witness ledger", () => {
  const payment = paymentFromChallenge(challenge, {
    id: "payment-log-reading",
    payer: "did:web:agent.example",
    authorization: "test-authorization-only",
  });
  const receipt = receiptFromPayment(challenge, payment, { id: "receipt-log-reading" });
  const log = witnessLogFromReceipt(receipt);
  const roundTripped = receiptFromWitnessLog(log);
  const report = cohereLog(x402ReceiptLogReading, x402ReceiptLogReading, log);

  assert.equal(roundTripped.id, receipt.id);
  assert.deepEqual(witnessLogFromReceipt(roundTripped), log);
  assert.equal(report.ok, true);
});

test("debit equals credit: the settled value is conserved", () => {
  const debit = quantity(402, 100, "USD");
  const credit = quantity(201, 50, "USD");
  const wrongCredit = quantity(401, 100, "USD");

  assert.equal(valueConserved(debit, credit), true);
  assert.equal(valueConserved(debit, wrongCredit), false);
});
