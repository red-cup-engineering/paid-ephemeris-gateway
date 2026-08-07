/**
 * Cross-package coherence: shipped protocol functors as RWIL readings.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { mark, utterance } from "@emsenn/relating";
import { cohere, cohereLog } from "@emsenn/relating/ledger";
import { spanFromWitness, witnessFromSpan } from "@emsenn/relating/writing";
import { cloudEventFromUtterance, utteranceFromCloudEvent } from "@emsenn/communicating";
import { atRepo, atRepoCommit, atRepoLogReading, witnessLogFromAtRepo } from "@emsenn/socializing";
import { x402ReceiptLogReading } from "@emsenn/organizing/x402";

import { activityCell, activityFromCell, credentialLogReading } from "../dist/index.mjs";

const witness = Object.freeze({
  e: "did:web:dev.bare-cedar-fog.emsenn.net:agents:codex",
  a: "coherence-kernel|green",
  v: "assert",
  t: "2026-06-26T03:00:00.000Z",
});

const activityPubReading = Object.freeze({
  id: "animating.activitypub.activity",
  toWire: activityFromCell,
  fromWire: activityCell,
});

const cloudEventsReading = Object.freeze({
  id: "communicating.cloudevents.structured-json",
  toWire: (row) => cloudEventFromUtterance(utterance(mark(row.e), mark(row.a)), row.v === "deny" ? "declaration" : "assertive", String(row.t)),
  fromWire: (event) => {
    const opened = utteranceFromCloudEvent(event);
    return {
      e: String(opened.token.mark.value),
      a: String(opened.claim.mark.value).replace(/^not /, ""),
      v: event.type === "declaration" ? "deny" : "assert",
      t: event.time,
    };
  },
});

const otlpSpanReading = Object.freeze({
  id: "relating.otlp.span",
  toWire: spanFromWitness,
  fromWire: witnessFromSpan,
});

const protocolReadings = Object.freeze([activityPubReading, cloudEventsReading, otlpSpanReading]);

test("ActivityPub, CloudEvents, and OTLP are coherent readings of one RWIL witness", () => {
  for (const left of protocolReadings) {
    for (const right of protocolReadings) {
      const report = cohere(left, right, witness);
      assert.equal(report.ok, true, `${left.id} <-> ${right.id}`);
    }
  }
});

test("VC, x402, and AT Protocol are coherent log readings of one ordered RWIL witness log", () => {
  const repo = atRepo("did:plc:coherence", [
    atRepoCommit({
      did: "did:plc:coherence",
      rev: "3kq-log-a",
      data: "bafy-log-a",
      sig: "sig-log-a",
      ops: Object.freeze([{
        action: "create",
        path: "group.example.note/3kq-log-a",
        cid: "bafy-record-a",
        record: Object.freeze({
          $type: "group.example.note",
          text: "coherence kernel higher-block witness",
          createdAt: "2026-06-26T03:00:00.000Z",
        }),
      }]),
    }),
    atRepoCommit({
      did: "did:plc:coherence",
      rev: "3kq-log-b",
      data: "bafy-log-b",
      prev: "bafy-log-a",
      sig: "sig-log-b",
      ops: Object.freeze([{
        action: "update",
        path: "group.example.note/3kq-log-a",
        cid: "bafy-record-b",
        record: Object.freeze({
          $type: "group.example.note",
          text: "coherence kernel log reading closed",
          createdAt: "2026-06-26T03:01:00.000Z",
        }),
      }]),
    }),
  ]);
  const sharedLog = witnessLogFromAtRepo(repo);
  const logReadings = Object.freeze([credentialLogReading, x402ReceiptLogReading, atRepoLogReading]);

  assert.equal(sharedLog.length, 2);
  for (const left of logReadings) {
    for (const right of logReadings) {
      const report = cohereLog(left, right, sharedLog);
      assert.equal(report.ok, true, `${left.id} <-> ${right.id}`);
      assert.equal(report.leftIso, true);
      assert.equal(report.rightIso, true);
      assert.equal(report.leftToRight, true);
      assert.equal(report.rightToLeft, true);
    }
  }
});
