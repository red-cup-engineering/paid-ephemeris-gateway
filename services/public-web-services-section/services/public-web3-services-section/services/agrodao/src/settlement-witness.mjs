import { appendEntries, logPathFor } from "@red-cup-engineering/witness-journal-log-service";
import { entry } from "@red-cup-engineering/witness-journal-entry-service";

import { semanticIdentity } from "./semantic-identity.mjs";
const semanticId = semanticIdentity;
const ethereumObservationId = semanticIdentity;

const ACTOR = "urn:ame:agrodao";
const SETTLEMENT = "eip155:31337:0x445193f370cc9ad5ae5f5525aeddec2bd5f71843";
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;

export function createSettlementStore({ settlementRoot } = {}) {
  if (typeof settlementRoot !== "string" || settlementRoot.length === 0) {
    throw new TypeError("settlementRoot is required");
  }
  return Object.freeze({
    actor: ACTOR,
    settlement: SETTLEMENT,
    async record({ category, recordedAt, record } = {}) {
      if (typeof category !== "string" || category.length === 0
          || typeof recordedAt !== "string" || !Number.isFinite(Date.parse(recordedAt))
          || record === null || typeof record !== "object" || Array.isArray(record)) {
        throw new TypeError("AGRODAO settlement record requires category, ISO time, and object carrier");
      }
      const documentNi = NI.test(record.id ?? "")
        ? record.id
        : semanticIdentity(`agrodao.settlement-record:${category}`, record);
      const projectionBody = { actor: ACTOR, settlement: SETTLEMENT, category, recordedAt, documentNi };
      const digest = semanticIdentity("agrodao.settlement-record-projection", projectionBody);
      const feed = "agrodao.settlement-records";
      const custody = appendEntries(settlementRoot, feed,
        [entry(documentNi, `settlement:record:${category}`, { digest, ...record }, recordedAt)], recordedAt);
      return Object.freeze({
        digest,
        documentNi,
        statementCount: 1,
        reference: Object.freeze({
          profile: "org.emsenn.local-semantic-settlement-record.v1",
          path: logPathFor(settlementRoot, feed, recordedAt),
          appended: custody.appended,
        }),
      });
    },
  });
}
