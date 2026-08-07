/**
 * Document morphisms for computing scripts.
 *
 * This module is the pipeable process boundary for `@emsenn/computing`. It
 * decodes one canonical JSON boundary document, evaluates the root `compute()`
 * morphism, and emits one canonical JSON document. The decoded carriers are the
 * existing computing/gaming carriers, not a second wire model.
 */
import {
  asArray,
  asObject,
  asString,
  decodeArena,
  field,
} from "@emsenn/gaming/encoding";
import { restore } from "@emsenn/gaming/running";
import {
  canonicalJson,
  isJsonRecord,
  parseJson,
  requireJsonValue,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating/codecs/path";
import {
  chargeValueNames,
  type ChargeValueName,
} from "@emsenn/relating";
import {
  decodeMorphism,
  encodeObservation,
} from "@emsenn/computing/encoding";
import {
  compute,
  type ComputingAction,
  type ComputingAdmission,
  type ComputingClaim,
  type ComputingToken,
} from "@emsenn/computing";
import type { EventPair } from "@emsenn/gaming";

/** A complete computing boundary document after byte decoding. */
export type BoundaryDocument = string;

/**
 * Admit a computing request.
 *
 * Domain: JSON object `{ action, token, claim? }`. `observe` consumes labeled
 * settled outcomes, a codec-encoded arena, or a prior
 * `gaming.scripts.admission`; `run` consumes a codec-encoded `Morphism`,
 * history, and an Opponent move. Codomain: canonical JSON admission evidence.
 */
export function computeDocument(tokenDocument: BoundaryDocument): BoundaryDocument {
  const request = requestFromDocument(tokenDocument);
  const admission = compute(request.action, request.token, request.claim);
  return documentResource(admissionDocument(admission), "computing admission");
}

interface ComputingBoundaryRequest {
  readonly action: ComputingAction;
  readonly token: ComputingToken;
  readonly claim: ComputingClaim;
}

function requestFromDocument(tokenDocument: BoundaryDocument): ComputingBoundaryRequest {
  const value = parseJson(tokenDocument.trim());
  if (!isJsonRecord(value)) throw new TypeError("computing: request document must be an object");
  const action = value["kind"] === "gaming.scripts.admission"
    ? "observe"
    : optionalString(value, "action") ?? "observe";
  const tokenValue = value["token"];
  const tokenRecord = tokenValue !== undefined && isJsonRecord(tokenValue) ? tokenValue : value;
  const claimValue = value["claim"];
  const claimRecord = claimValue !== undefined && isJsonRecord(claimValue) ? claimValue : {};
  return {
    action,
    token: tokenFromRecord(action, tokenRecord),
    claim: claimFromRecord(claimRecord),
  };
}

function tokenFromRecord(action: ComputingAction, record: JsonRecord): ComputingToken {
  if (action === "observe") return observationTokenFromRecord(record);
  if (action === "run") return runTokenFromRecord(record);
  return {};
}

function observationTokenFromRecord(record: JsonRecord): ComputingToken {
  const admissionArena = arenaFromGamingAdmissionRecord(record);
  if (admissionArena !== undefined) return { arena: admissionArena };

  const arenaValue = record["arena"];
  if (arenaValue !== undefined) {
    return { arena: decodeArena(arenaValue) };
  }
  const labelsValue = record["labels"];
  if (labelsValue === undefined) return {};
  return {
    labels: asArray(labelsValue, "labels").map(labelInput),
    ...(record["causality"] === undefined ? {} : { causality: eventPairs(record["causality"], "causality") }),
    ...(record["conflict"] === undefined ? {} : { conflict: eventPairs(record["conflict"], "conflict") }),
  };
}

function arenaFromGamingAdmissionRecord(record: JsonRecord): ComputingToken["arena"] | undefined {
  if (record["kind"] !== "gaming.scripts.admission") return undefined;
  const game = record["game"];
  return game === undefined ? undefined : restore(game).arena;
}

function runTokenFromRecord(record: JsonRecord): ComputingToken {
  const playerValue = record["player"];
  const historyValue = record["history"];
  const opponentMove = optionalString(record, "opponentMove");
  return {
    ...(playerValue === undefined ? {} : { player: decodeMorphism(playerValue) }),
    ...(historyValue === undefined ? {} : { history: asArray(historyValue, "history").map((entry) => asString(entry, "history entry")) }),
    ...(opponentMove === undefined ? {} : { opponentMove }),
  };
}

function claimFromRecord(record: JsonRecord): ComputingClaim {
  const minimumEvents = optionalNumber(record, "minimumEvents");
  const admitted = optionalBoolean(record, "admitted");
  return {
    ...(minimumEvents === undefined ? {} : { minimumEvents }),
    ...(admitted === undefined ? {} : { admitted }),
  };
}

function labelInput(value: unknown): NonNullable<ComputingToken["labels"]>[number] {
  const record = asObject(value, "label");
  const id = asString(field(record, "id", "label"), "label.id");
  const charge = chargeName(asString(field(record, "charge", "label"), "label.charge"));
  const predicate = optionalString(record as JsonRecord, "predicate");
  const object = optionalString(record as JsonRecord, "object");
  return {
    id,
    charge,
    ...(predicate === undefined ? {} : { predicate }),
    ...(object === undefined ? {} : { object }),
  };
}

function chargeName(value: string): ChargeValueName {
  if ((chargeValueNames as readonly string[]).includes(value)) return value as ChargeValueName;
  throw new TypeError(`computing: charge must be one of ${chargeValueNames.join(", ")}`);
}

function eventPairs(value: unknown, label: string): readonly EventPair[] {
  return Object.freeze(asArray(value, label).map((entry, index): EventPair => {
    const pair = asArray(entry, `${label}[${index}]`);
    if (pair.length !== 2) throw new TypeError(`computing: ${label}[${index}] must contain exactly two event ids`);
    return [asString(pair[0], `${label}[${index}][0]`), asString(pair[1], `${label}[${index}][1]`)] as const;
  }));
}

function optionalString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new TypeError(`computing: ${key} must be a string`);
  return value;
}

function optionalNumber(record: JsonRecord, key: string): number | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`computing: ${key} must be a finite number`);
  return value;
}

function optionalBoolean(record: JsonRecord, key: string): boolean | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new TypeError(`computing: ${key} must be a boolean`);
  return value;
}

function admissionDocument(admission: ComputingAdmission): JsonValue {
  return requireJsonValue({
    kind: "computing.scripts.admission",
    action: admission.action,
    admitted: admission.admitted,
    status: admission.status,
    charge: {
      kind: admission.charge.kind,
      value: admission.charge.value,
      evidence: admission.charge.evidence.map((side) => side.map((mark) => mark.value)),
    },
    ...(admission.obstruction === undefined ? {} : { obstruction: admission.obstruction }),
    ...(admission.observation === undefined ? {} : { observation: encodeObservation(admission.observation) }),
    ...(admission.run === undefined ? {} : { run: admission.run }),
  }, "computing admission");
}

function documentResource(value: unknown, label: string): BoundaryDocument {
  return `${canonicalJson(requireJsonValue(value, label))}\n`;
}
