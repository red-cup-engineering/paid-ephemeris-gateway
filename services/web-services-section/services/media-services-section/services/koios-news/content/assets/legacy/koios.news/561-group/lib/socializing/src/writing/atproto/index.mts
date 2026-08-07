/**
 * writing/atproto — AT Protocol as a second across-federation wire for socializing.
 *
 * AT Protocol is not a second social ontology here. A per-actor signed repo is
 * read as an RWIL witness log scoped to one observer: each commit operation is a
 * witnessed cell, Lexicon is a typed carrier declaration, and the firehose is
 * socializing.broadcast projected as repository events.
 */
import {
  canonical,
  carrierFrom,
  charge,
  chargeValue,
  mark,
  type ChargeCarrier,
  type FromSchema,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";
import { cell, type LogReading, type Witness } from "@emsenn/relating/ledger";

import { mergeCrdtStates, type MultiValueRegisterWrite, type StateCrdt, type StateCrdtCell } from "../crdt/index.mjs";

type WitnessRow = ReturnType<typeof cell>;

const cidSchema = {
  type: "string",
  minLength: 1,
  description: "CID text carried opaquely; content addressing belongs to the AT repo wire.",
} as const;

const atRepoOperationSchema = {
  type: "object",
  required: ["action", "path"],
  properties: {
    action: { enum: ["create", "update", "delete"] },
    path: {
      type: "string",
      minLength: 3,
      pattern: "^[A-Za-z0-9._~-]+\\/[A-Za-z0-9._~-]+$",
      description: "AT repo path: <collection NSID>/<record-key>.",
    },
    cid: cidSchema,
    record: { description: "Lexicon-shaped record value, retained as JSON." },
  },
  additionalProperties: false,
} as const;

const atRepoRecordSchema = {
  type: "object",
  required: ["path", "cid", "record"],
  properties: {
    path: atRepoOperationSchema.properties.path,
    cid: cidSchema,
    record: { description: "Current record JSON for this path." },
  },
  additionalProperties: false,
} as const;

export const AtRepoCommitSchema = {
  $id: "socializing/writing/atproto/repo-commit",
  title: "AT Protocol repo commit as RWIL witness step",
  description:
    "A signed per-actor AT Protocol repository commit read as one observer-scoped RWIL witness step. Operations are the witnessed cells; the signature is retained as witness metadata.",
  type: "object",
  required: ["kind", "did", "version", "rev", "data", "prev", "sig", "ops"],
  properties: {
    kind: { const: "socializing.atproto.repo.commit" },
    did: { type: "string", pattern: "^did:[a-z0-9]+:.+" },
    version: { const: 3 },
    rev: { type: "string", minLength: 1 },
    data: cidSchema,
    prev: { description: "Previous commit CID, or null for the root commit." },
    sig: { type: "string", minLength: 1 },
    ops: { type: "array", items: atRepoOperationSchema },
  },
  additionalProperties: false,
} as const;
export type AtRepoOperation = FromSchema<typeof atRepoOperationSchema>;
export type AtRepoCommit = Omit<FromSchema<typeof AtRepoCommitSchema>, "prev" | "ops"> & {
  readonly prev: string | null;
  readonly ops: readonly AtRepoOperation[];
};
export const atRepoCommitCarrier = carrierFrom(AtRepoCommitSchema);

export const AtRepoSchema = {
  $id: "socializing/writing/atproto/repo",
  title: "AT Protocol repo as observer RWIL log",
  description:
    "A normalized AT Protocol per-actor repository: current records plus the signed commit sequence whose operations project functorially to RWIL cells.",
  type: "object",
  required: ["kind", "did", "head", "commits", "records"],
  properties: {
    kind: { const: "socializing.atproto.repo" },
    did: { type: "string", pattern: "^did:[a-z0-9]+:.+" },
    head: { type: "string", minLength: 1 },
    commits: { type: "array", items: AtRepoCommitSchema },
    records: { type: "array", items: atRepoRecordSchema },
  },
  additionalProperties: false,
} as const;
export type AtRepoRecord = Omit<FromSchema<typeof atRepoRecordSchema>, "record"> & {
  readonly record: JsonValue;
};
export type AtRepo = Omit<FromSchema<typeof AtRepoSchema>, "commits" | "records"> & {
  readonly commits: readonly AtRepoCommit[];
  readonly records: readonly AtRepoRecord[];
};
export const atRepoCarrier = carrierFrom(AtRepoSchema);

export const AtLexiconSchema = {
  $id: "socializing/writing/atproto/lexicon",
  title: "AT Protocol Lexicon document",
  description:
    "An AT Protocol Lexicon file admitted as a typed carrier declaration. The Lexicon schema is the protocol's carrier source; carrierFrom supplies the local validation surface.",
  type: "object",
  required: ["lexicon", "id", "defs"],
  properties: {
    lexicon: { const: 1 },
    id: { type: "string", minLength: 1 },
    description: { type: "string" },
    defs: { type: "object" },
  },
  additionalProperties: false,
} as const;
export type AtLexicon = Omit<FromSchema<typeof AtLexiconSchema>, "defs"> & {
  readonly defs: JsonRecord;
};
export const atLexiconCarrier = carrierFrom(AtLexiconSchema);

export const AtFirehoseCommitSchema = {
  $id: "socializing/writing/atproto/firehose-commit",
  title: "AT Protocol firehose commit event",
  description:
    "The broadcast face of an AT repo commit: a sequence-addressed repository event compatible with the com.atproto.sync.subscribeRepos commit reading.",
  type: "object",
  required: ["kind", "seq", "repo", "commit", "rev", "time", "ops"],
  properties: {
    kind: { const: "socializing.atproto.firehose.commit" },
    seq: { type: "integer", minimum: 0 },
    repo: { type: "string", pattern: "^did:[a-z0-9]+:.+" },
    commit: cidSchema,
    rev: { type: "string", minLength: 1 },
    time: { type: "string", minLength: 1 },
    ops: { type: "array", items: atRepoOperationSchema },
  },
  additionalProperties: false,
} as const;
export type AtFirehoseCommit = Omit<FromSchema<typeof AtFirehoseCommitSchema>, "ops"> & {
  readonly ops: readonly AtRepoOperation[];
};
export const atFirehoseCommitCarrier = carrierFrom(AtFirehoseCommitSchema);

const sortedBy = <T,>(values: readonly T[], key: (value: T) => string): readonly T[] =>
  Object.freeze([...values].sort((left, right) => key(left).localeCompare(key(right))));

function repoWitness(commit: AtRepoCommit): Witness {
  return Object.freeze({
    protocol: "atproto",
    did: commit.did,
    rev: commit.rev,
    commit: commit.data,
    prev: commit.prev,
    sig: commit.sig,
  }) as JsonValue;
}

function entityOf(did: string, path: string): JsonValue {
  return Object.freeze({ protocol: "atproto", did, path }) as JsonValue;
}

function attributeOf(op: AtRepoOperation): JsonValue {
  const [collection] = op.path.split("/");
  return Object.freeze({
    protocol: "atproto",
    collection,
    action: op.action,
    cid: op.cid ?? null,
  }) as JsonValue;
}

function valueOfOperation(op: AtRepoOperation): JsonValue {
  return op.action === "delete" ? null : (op.record as JsonValue);
}

function pathOfEntity(entity: JsonValue): string {
  if (entity === null || typeof entity !== "object" || Array.isArray(entity)) throw new TypeError("atproto entity is not a record");
  const path = (entity as JsonRecord)["path"];
  if (typeof path !== "string") throw new TypeError("atproto entity is missing path");
  return path;
}

function didOfEntity(entity: JsonValue): string {
  if (entity === null || typeof entity !== "object" || Array.isArray(entity)) throw new TypeError("atproto entity is not a record");
  const did = (entity as JsonRecord)["did"];
  if (typeof did !== "string") throw new TypeError("atproto entity is missing did");
  return did;
}

function operationOf(row: WitnessRow): AtRepoOperation {
  if (row.a === null || typeof row.a !== "object" || Array.isArray(row.a)) throw new TypeError("atproto row attribute is not an operation");
  const attribute = row.a as JsonRecord;
  const action = attribute["action"];
  const path = pathOfEntity(row.e);
  if (action !== "create" && action !== "update" && action !== "delete") throw new TypeError("atproto row operation has invalid action");
  return Object.freeze({
    action,
    path,
    ...(typeof attribute["cid"] === "string" ? { cid: attribute["cid"] as string } : {}),
    ...(action === "delete" ? {} : { record: row.v }),
  });
}

function commitWitnessOf(row: WitnessRow): JsonRecord {
  if (row.t === null || typeof row.t !== "object" || Array.isArray(row.t)) throw new TypeError("atproto row witness is not a record");
  return row.t as JsonRecord;
}

function chargeOf(witness: string): ChargeCarrier {
  const w = mark(witness);
  return charge(chargeValue("potential"), [[w], []]);
}

/** Build and admit one normalized AT repo commit. */
export function atRepoCommit(input: {
  readonly did: string;
  readonly rev: string;
  readonly data: string;
  readonly sig: string;
  readonly prev?: string | null;
  readonly ops: readonly AtRepoOperation[];
}): AtRepoCommit {
  return atRepoCommitCarrier.assert(Object.freeze({
    kind: "socializing.atproto.repo.commit" as const,
    did: input.did,
    version: 3 as const,
    rev: input.rev,
    data: input.data,
    prev: input.prev ?? null,
    sig: input.sig,
    ops: sortedBy(input.ops, (op) => `${op.path}:${op.action}:${op.cid ?? ""}`),
  })) as AtRepoCommit;
}

/** Build a normalized per-actor repo from commits, deriving the current record view. */
export function atRepo(did: string, commits: readonly AtRepoCommit[]): AtRepo {
  const admitted = sortedBy(commits.map((commit) => atRepoCommitCarrier.assert(commit) as AtRepoCommit), (commit) => commit.rev);
  const records = new Map<string, AtRepoRecord>();
  for (const commit of admitted) {
    if (commit.did !== did) throw new TypeError(`atRepo: commit ${commit.rev} belongs to ${commit.did}, not ${did}`);
    for (const op of commit.ops) {
      if (op.action === "delete") records.delete(op.path);
      else records.set(op.path, Object.freeze({
        path: op.path,
        cid: op.cid ?? `${commit.data}:${op.path}`,
        record: op.record as JsonValue,
      }));
    }
  }
  const head = admitted.at(-1)?.rev ?? "";
  return atRepoCarrier.assert(Object.freeze({
    kind: "socializing.atproto.repo" as const,
    did,
    head,
    commits: admitted,
    records: sortedBy([...records.values()], (record) => record.path),
  })) as AtRepo;
}

/** Project a signed repo commit to RWIL rows: commits are witnesses. */
export function witnessLogFromAtRepoCommit(commit: AtRepoCommit): readonly WitnessRow[] {
  const admitted = atRepoCommitCarrier.assert(commit) as AtRepoCommit;
  return Object.freeze(admitted.ops.map((op) => cell(entityOf(admitted.did, op.path), attributeOf(op), valueOfOperation(op), repoWitness(admitted))));
}

/** Project a per-actor repo to its observer-scoped RWIL witness log. */
export function witnessLogFromAtRepo(repo: AtRepo): readonly WitnessRow[] {
  const admitted = atRepoCarrier.assert(repo) as AtRepo;
  return Object.freeze(admitted.commits.flatMap((commit) => witnessLogFromAtRepoCommit(commit)));
}

/** Reconstruct the normalized AT repo view from the RWIL rows produced above. */
export function atRepoFromWitnessLog(rows: readonly WitnessRow[]): AtRepo {
  if (rows.length === 0) throw new TypeError("atRepoFromWitnessLog: empty witness log has no actor DID");
  const did = didOfEntity(rows[0]!.e);
  const groups = new Map<string, { readonly witness: JsonRecord; readonly ops: AtRepoOperation[] }>();
  for (const row of rows) {
    const rowDid = didOfEntity(row.e);
    if (rowDid !== did) throw new TypeError(`atRepoFromWitnessLog: mixed DID log ${did} and ${rowDid}`);
    const witness = commitWitnessOf(row);
    const rev = witness["rev"];
    if (typeof rev !== "string") throw new TypeError("atRepoFromWitnessLog: commit witness missing rev");
    const group = groups.get(rev) ?? { witness, ops: [] };
    group.ops.push(operationOf(row));
    groups.set(rev, group);
  }
  return atRepo(did, [...groups.values()].map(({ witness, ops }) => atRepoCommit({
    did,
    rev: witness["rev"] as string,
    data: witness["commit"] as string,
    prev: typeof witness["prev"] === "string" ? witness["prev"] as string : null,
    sig: witness["sig"] as string,
    ops,
  })));
}

export const atRepoLogReading: LogReading<AtRepo> = Object.freeze({
  id: "socializing.atproto.repo",
  toWire: atRepoFromWitnessLog,
  fromWire: witnessLogFromAtRepo,
});

/** Project one commit as socializing.broadcast over the AT firehose channel. */
export function firehoseCommitFromRepoCommit(commit: AtRepoCommit, seq: number, time: string): AtFirehoseCommit {
  const admitted = atRepoCommitCarrier.assert(commit) as AtRepoCommit;
  return atFirehoseCommitCarrier.assert(Object.freeze({
    kind: "socializing.atproto.firehose.commit" as const,
    seq,
    repo: admitted.did,
    commit: admitted.data,
    rev: admitted.rev,
    time,
    ops: admitted.ops,
  })) as AtFirehoseCommit;
}

/** Broadcast a repo's commit sequence as firehose events. */
export function firehoseFromAtRepo(repo: AtRepo, opts: { readonly startSeq?: number; readonly time?: string } = {}): readonly AtFirehoseCommit[] {
  const admitted = atRepoCarrier.assert(repo) as AtRepo;
  const startSeq = opts.startSeq ?? 0;
  const time = opts.time ?? new Date(0).toISOString();
  return Object.freeze(admitted.commits.map((commit, index) => firehoseCommitFromRepoCommit(commit, startSeq + index, time)));
}

function writeOfRecord(repo: AtRepo, record: AtRepoRecord): MultiValueRegisterWrite {
  return Object.freeze({
    dot: `${repo.did}:${repo.head}:${record.path}:${record.cid}`,
    replica: repo.did,
    value: record.record,
    standing: "potential" as const,
    witness: `${repo.did}:${repo.head}:${record.path}:${record.cid}`,
  });
}

/** Lower an AT repo to the existing socializing.merge CRDT carrier. */
export function crdtStateFromAtRepo(repo: AtRepo): StateCrdt {
  const admitted = atRepoCarrier.assert(repo) as AtRepo;
  const cells: StateCrdtCell[] = admitted.records.map((record) => Object.freeze({
    key: record.path,
    charge: chargeOf(`${admitted.did}:${admitted.head}:${record.path}`),
    writes: Object.freeze([writeOfRecord(admitted, record)]),
  }));
  const raw = Object.freeze({
    kind: "socializing.crdt.state" as const,
    cells: Object.freeze(cells),
  });
  return mergeCrdtStates(Object.freeze({ kind: "socializing.crdt.state" as const, cells: Object.freeze([]) }), raw);
}

/** Merge AT repos by delegating exactly to socializing's CRDT <=_k join. */
export function mergeAtRepos(...repos: readonly AtRepo[]): StateCrdt {
  return repos.reduce((state, repo) => mergeCrdtStates(state, crdtStateFromAtRepo(repo)), Object.freeze({
    kind: "socializing.crdt.state" as const,
    cells: Object.freeze([]),
  }) as StateCrdt);
}

function lexiconFieldToJsonSchema(field: JsonRecord): JsonRecord {
  const type = field["type"];
  if (type === "string") return Object.freeze({ type: "string", ...(typeof field["minLength"] === "number" ? { minLength: field["minLength"] } : {}) });
  if (type === "integer") return Object.freeze({ type: "integer", ...(typeof field["minimum"] === "number" ? { minimum: field["minimum"] } : {}) });
  if (type === "boolean") return Object.freeze({ type: "boolean" });
  if (type === "array") return Object.freeze({
    type: "array",
    items: lexiconFieldToJsonSchema((field["items"] ?? {}) as JsonRecord),
  });
  if (type === "object") return lexiconObjectToJsonSchema(field);
  return Object.freeze({});
}

function lexiconObjectToJsonSchema(objectDef: JsonRecord): JsonRecord {
  const properties = (objectDef["properties"] ?? {}) as JsonRecord;
  const required = Object.entries(properties)
    .filter(([, field]) => field !== null && typeof field === "object" && !Array.isArray(field) && (field as JsonRecord)["required"] === true)
    .map(([name]) => name);
  return Object.freeze({
    type: "object",
    required: Object.freeze(["$type", ...required]),
    properties: Object.freeze({
      $type: { type: "string" },
      ...Object.fromEntries(Object.entries(properties).map(([name, field]) => [name, lexiconFieldToJsonSchema(field as JsonRecord)])),
    }),
    additionalProperties: true,
  }) as JsonRecord;
}

/** Translate the main Lexicon record definition into the JSON-Schema carrier kernel. */
export function jsonSchemaFromLexiconRecord(lexicon: AtLexicon, defName = "main"): JsonRecord & { readonly $id: string } {
  const admitted = atLexiconCarrier.assert(lexicon) as AtLexicon;
  const def = admitted.defs[defName];
  if (def === null || typeof def !== "object" || Array.isArray(def)) throw new TypeError(`jsonSchemaFromLexiconRecord: missing ${defName}`);
  if ((def as JsonRecord)["type"] !== "record") throw new TypeError(`jsonSchemaFromLexiconRecord: ${defName} is not a record definition`);
  const record = (def as JsonRecord)["record"];
  if (record === null || typeof record !== "object" || Array.isArray(record)) throw new TypeError(`jsonSchemaFromLexiconRecord: ${defName} has no record object`);
  return Object.freeze({
    $id: `socializing/writing/atproto/lexicon/${admitted.id}`,
    title: admitted.id,
    ...lexiconObjectToJsonSchema(record as JsonRecord),
    properties: Object.freeze({
      ...(lexiconObjectToJsonSchema(record as JsonRecord)["properties"] as JsonRecord),
      $type: { const: admitted.id },
    }),
  }) as JsonRecord & { readonly $id: string };
}

/** Build a relating carrier from an AT Lexicon record definition. */
export function carrierFromLexiconRecord(lexicon: AtLexicon, defName = "main") {
  return carrierFrom(jsonSchemaFromLexiconRecord(lexicon, defName));
}

/** Stable equality witness for tests and callers comparing channel-code projections. */
export function sameAtprotoProjection(left: JsonValue, right: JsonValue): boolean {
  return canonical(left) === canonical(right);
}
