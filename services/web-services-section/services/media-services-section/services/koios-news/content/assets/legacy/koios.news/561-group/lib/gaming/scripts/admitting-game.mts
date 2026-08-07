/**
 * Document morphisms for gaming scripts.
 *
 * This is the process boundary for `@emsenn/gaming`: it accepts one decoded
 * boundary document, evaluates the root `gaming()` morphism, and returns one
 * decoded boundary document. The stateful `game` CLI remains an operational
 * computer.
 */
import {
  communicate,
  communicationDocument,
  type CommunicatingCarrier,
} from "@emsenn/communicating";
import {
  canonicalJson,
  isJsonRecord,
  parseJson,
  requireJsonValue,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating/codecs/path";
import {
  decodeArena,
} from "@emsenn/gaming/encoding";
import { snapshot } from "@emsenn/gaming/running";
import {
  gaming,
  type GamingAdmission,
  type GamingClaim,
  type GamingToken,
} from "@emsenn/gaming";

/** A complete gaming boundary document after byte decoding. */
export type BoundaryDocument = string;

/**
 * Admit a game creation request.
 *
 * Domain: canonical JSON request object or `[token, claim]` utterance pair.
 * Codomain: canonical JSON admission evidence. Textual `claim`/`communication`
 * fields are admitted through `@emsenn/communicating` before the gaming root
 * morphism runs; arena values decode through the game codecs into real carriers.
 */
export function admitGameDocument(tokenDocument: BoundaryDocument): BoundaryDocument {
  const request = readRequest(tokenDocument);
  const admission = gaming(request.action, request.token, request.claim);
  return documentResource(admissionDocument(admission, request.communication), "gaming admission");
}

interface GamingBoundaryRequest {
  readonly action: "create";
  readonly token: GamingToken;
  readonly claim: GamingClaim;
  readonly communication?: CommunicatingCarrier;
}

function readRequest(tokenDocument: BoundaryDocument): GamingBoundaryRequest {
  const value = parseJson(tokenDocument.trim());
  if (Array.isArray(value)) return requestFromUtterance(value);
  if (!isJsonRecord(value)) throw new TypeError("gaming: request document must be an object or [token, claim] pair");
  return requestFromRecord(value);
}

function requestFromUtterance(value: readonly JsonValue[]): GamingBoundaryRequest {
  if (value.length !== 2) throw new TypeError("gaming: utterance request must contain exactly [token, claim]");
  const token = value[0]!;
  const claim = value[1]!;
  if (!isJsonRecord(token)) throw new TypeError("gaming: utterance token must be an object");
  return requestFromRecord({ token, claim });
}

function requestFromRecord(record: JsonRecord): GamingBoundaryRequest {
  const action = optionalString(record, "action") ?? "create";
  if (action !== "create") throw new TypeError(`gaming: unsupported root action ${JSON.stringify(action)}`);
  const tokenValue = record["token"];
  const claimValue = record["claim"];
  const tokenRecord = tokenValue !== undefined && isJsonRecord(tokenValue)
    ? tokenValue
    : record;
  const claimRecord = claimValue !== undefined && isJsonRecord(claimValue)
    ? claimValue
    : {};
  const communicationText = optionalString(record, "communication")
    ?? optionalString(record, "claimText")
    ?? (typeof claimValue === "string" ? claimValue : undefined);
  const communication = communicationText === undefined
    ? undefined
    : communicate("communicating.admit", communicationText).carrier;
  return {
    action,
    token: tokenFromRecord(tokenRecord),
    claim: claimFromRecord(claimRecord),
    ...(communication === undefined ? {} : { communication }),
  };
}

function tokenFromRecord(record: JsonRecord): GamingToken {
  const id = optionalString(record, "id");
  const demo = optionalString(record, "demo");
  const arenaValue = record["arena"];
  const arena = arenaValue === undefined ? undefined : decodeArena(arenaValue);
  return {
    ...(id === undefined ? {} : { id }),
    ...(demo === undefined ? {} : { demo }),
    ...(arena === undefined ? {} : { arena }),
  };
}

function claimFromRecord(record: JsonRecord): GamingClaim {
  const claim: { id?: string; demo?: string } = {};
  const id = optionalString(record, "id");
  const demo = optionalString(record, "demo");
  if (id !== undefined) claim.id = id;
  if (demo !== undefined) claim.demo = demo;
  return claim;
}

function optionalString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new TypeError(`gaming: ${key} must be a string`);
  return value;
}

function admissionDocument(admission: GamingAdmission, communication?: CommunicatingCarrier): JsonValue {
  return requireJsonValue({
    kind: "gaming.scripts.admission",
    action: admission.action,
    admitted: admission.admitted,
    status: admission.status,
    charge: {
      kind: admission.charge.kind,
      value: admission.charge.value,
      evidence: admission.charge.evidence.map((side) => side.map((mark) => mark.value)),
    },
    ...(admission.obstruction === undefined ? {} : { obstruction: admission.obstruction }),
    ...(admission.game === undefined ? {} : { game: snapshot(admission.game) }),
    ...(communication === undefined
      ? {}
      : {
          communication: {
            kind: communication.kind,
            document: communicationDocument(communication),
          },
        }),
  }, "gaming admission");
}

function documentResource(value: unknown, label: string): BoundaryDocument {
  return `${canonicalJson(requireJsonValue(value, label))}\n`;
}
