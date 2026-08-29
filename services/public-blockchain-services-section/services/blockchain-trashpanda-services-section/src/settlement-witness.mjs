import { Buffer } from "node:buffer";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { seavt } from "@red-cup-engineering/witness-journal-entry-service";
import { appendSeavt } from "@red-cup-engineering/witness-journal-log-service";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function niSurface(role, token) {
  const match = /^ni:\/\/\/sha-256;([A-Za-z0-9_-]{43})$/u.exec(token);
  if (match === null) throw new TypeError(`${role} must be one semantic-content ni token`);
  return `semantic-content.${role}.sha256.${Buffer.from(match[1], "base64url").toString("hex")}`;
}

export function recordSettlementRecord({ actor, category, recordedAt, record, dataRoot = ROOT }) {
  if (actor !== "urn:ame:blockchain-trashpanda" || typeof category !== "string" || !Number.isFinite(Date.parse(recordedAt)) || record === null || typeof record !== "object") throw new TypeError("blockchain-trashpanda settlement witness is malformed");
  const entity = niSurface("record", record.id);
  const disposition = typeof record.disposition === "string" ? record.disposition : "admitted";
  const rows = [
    seavt(entity, "settlement:actor", "actor.blockchain-trashpanda", recordedAt),
    seavt(entity, "settlement:category", category, recordedAt),
    seavt(entity, "settlement:record", entity, recordedAt),
    seavt(entity, "settlement:record-type", `record.type.${String(record.type)}`, recordedAt),
    seavt(entity, "settlement:disposition", `settlement.disposition.${disposition}`, recordedAt),
  ];
  const receipt = appendSeavt(dataRoot, "blockchain-trashpanda.settlement", rows, recordedAt);
  return Object.freeze({ ...receipt, documentNi: record.id, record: record.id });
}
