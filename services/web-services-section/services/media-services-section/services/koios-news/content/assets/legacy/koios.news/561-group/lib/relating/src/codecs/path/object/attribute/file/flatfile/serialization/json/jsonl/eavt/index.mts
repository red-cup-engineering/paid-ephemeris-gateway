/**
 * codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt
 *
 * The atomic witness row: exact EAVT over JSONL.
 *
 * An EAVT `[entity, attribute, value, time]` is a witness: at `time`, the cell
 * (entity, attribute, value) was witnessed. It carries no polarity and no
 * operation. There is no "assert"/"retract":
 *   - the closure engine is ≤_k-monotone — it accumulates evidence and never
 *     retracts, so removal is not a thing a witness log can express; and
 *   - a negative is never admitted — `active` ("told false") and `stable`
 *     ("told both") are positions the *descent* derives by settling, not facts
 *     a flatfile may claim. You do not witness an absence; you cannot prove a
 *     negative. Negation is a ℤ/2 gauge symmetry of the whole value space
 *     (algebra's `negate`), not an operation this codec performs.
 *
 * You ASSERT EAVT and RECEIVE Datoms. A `Datom` is an EAVT plus the reading a
 * script computed about that cell: `[entity, attribute, value, time, reading]` —
 * five parts. The fifth slot, where Datomic puts assert/retract, is where our
 * reading (the settled judgement) goes. EAVT is the asserted/witnessed form;
 * Datom is the received/queried form. A four-part value is an EAVT, never a Datom.
 *
 * Reading an EAVT yields a cell whose charge is the witnessed potential
 * (present-side evidence, value derived); accumulating many EAVTs about one cell
 * is, downstream, a knowledge-join of their witnesses. Writing emits one EAVT
 * per present-side witness — the absent side is never serialized, because it was
 * never witnessed.
 */
import { createHash } from "node:crypto";
import { mark, witnessedPotential, type ChargeCarrier } from "../../../../../../../../../../articulating/carriers.mjs";
import { restrict, type Projector } from "../../../../../../../../../../holography/index.mjs";
import { type JsonValue, isJsonRecord, canonical, requireJsonValue } from "../../index.mjs";
import { jsonlProjector, parseLines, serializeLines } from "../index.mjs";

export const EAVT_JSONL = "application/eavt+jsonl; charset=utf-8";

export const eavtProjector: Projector<unknown> = restrict(jsonlProjector, {
  type: "eavt",
  recognize: (resource) => {
    try {
      return parseLines(resource.content).every(isEavtShape);
    } catch {
      return false;
    }
  },
});

/** An EAVT: `[entity, attribute, value, time]` — a cell witnessed at a time. The asserted form. */
export type EAVT = readonly [entity: JsonValue, attribute: JsonValue, value: JsonValue, time: JsonValue];

/** The object spelling of EAVT used by JSON request bodies and human-authored documents. */
export type EAVTRecord = {
  readonly [key: string]: JsonValue;
  readonly e: JsonValue;
  readonly a: JsonValue;
  readonly v: JsonValue;
  readonly t: JsonValue;
};

/** A predication cell at the serialization boundary: entity × attribute × value. */
export type Cell = { readonly subject: JsonValue; readonly predicate: JsonValue; readonly object: JsonValue };

/** A cell with the charge derived from its witnesses — the carrier an EAVT document carries. */
export type ChargedCell = { readonly cell: Cell; readonly charge: ChargeCarrier };

/** A plain SPO triple read from an EAVT row, dropping only the time coordinate. */
export type EAVTTriple = { readonly s: JsonValue; readonly p: JsonValue; readonly o: JsonValue };

/** Whether a json value is shaped like an EAVT: a 4-tuple [entity, attribute, value, time]. */
export function isEavtShape(value: JsonValue): boolean {
  return (Array.isArray(value) && value.length === 4)
    || (isJsonRecord(value)
      && "e" in value && "a" in value && "v" in value && "t" in value);
}

/** Narrow a json value to an EAVT. Throws if it is not a 4-tuple. */
export function toEavt(value: JsonValue): EAVT {
  if (Array.isArray(value) && value.length === 4) {
    return [value[0]!, value[1]!, value[2]!, value[3]!];
  }
  if (isJsonRecord(value)) {
    if ("e" in value && "a" in value && "v" in value && "t" in value) {
      return [value["e"]!, value["a"]!, value["v"]!, value["t"]!];
    }
  }
  throw new TypeError("eavt: expected [entity, attribute, value, time] or {e,a,v,t}");
}

/** The object spelling of an EAVT row. */
export function eavtRecord(value: EAVT | EAVTRecord): EAVTRecord {
  if (Array.isArray(value)) {
    return Object.freeze({ e: value[0], a: value[1], v: value[2], t: value[3] });
  }
  const record = value as EAVTRecord;
  return Object.freeze({ e: record.e, a: record.a, v: record.v, t: record.t });
}

/** The SPO triple witnessed by an EAVT row. */
export function eavtTriple(value: EAVT | EAVTRecord): EAVTTriple {
  const row = eavtRecord(value);
  return Object.freeze({ s: row.e, p: row.a, o: row.v });
}

/** Content identity for an EAVT row, over canonical object spelling. */
export function eavtId(value: EAVT | EAVTRecord): string {
  return createHash("sha256").update(canonical(eavtRecord(value)), "utf8").digest("hex");
}

/** Parse an EAVT document: jsonl lines, each narrowed to an EAVT. */
export const parse = (content: string): EAVT[] => parseLines(content).map(toEavt);

/** Serialize EAVTs to an EAVT document. */
export const serialize = (eavts: readonly EAVT[]): string => serializeLines(eavts);

/** Merge EAVT logs without losing evidence: duplicate rows collapse by content identity. */
export function mergeEavtLogs(...logs: readonly (readonly (EAVT | EAVTRecord)[])[]): EAVT[] {
  const seen = new Set<string>();
  const rows: EAVT[] = [];
  for (const value of logs.flat()) {
    const row = toEavt(eavtRecord(value));
    const id = eavtId(row);
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push(row);
  }
  return rows.sort((left, right) => eavtId(left).localeCompare(eavtId(right)));
}

const escapePointer = (part: string): string => part.replace(/~/g, "~0").replace(/\//g, "~1");
const isContainer = (value: JsonValue): value is readonly JsonValue[] | { readonly [key: string]: JsonValue } =>
  value !== null && typeof value === "object";

/** Unfold a JSON object/array into object-spelled EAVT rows keyed by JSON Pointer. */
export function unfoldJson(value: JsonValue, opts: { readonly base?: string; readonly t: JsonValue }): EAVTRecord[] {
  const rows: EAVTRecord[] = [];
  const walk = (node: JsonValue, pointer: string): void => {
    if (!isContainer(node)) return;
    const e = `${opts.base ?? ""}#${pointer}`;
    const entries = Array.isArray(node)
      ? node.map((item, index) => [String(index), item] as const)
      : Object.entries(node);
    for (const [key, item] of entries) {
      if (key.length === 0) throw new TypeError("unfoldJson: object keys must be non-empty");
      const v: JsonValue = Array.isArray(item) ? [] : isContainer(item) ? {} : item;
      rows.push(eavtRecord({ e, a: key, v, t: opts.t }));
      if (isContainer(item)) walk(item, `${pointer}/${escapePointer(key)}`);
    }
  };
  walk(value, "");
  return rows;
}

/** Fold object-spelled EAVT rows produced by unfoldJson back into a JSON object. */
export function foldJson(rows: readonly (EAVT | EAVTRecord)[]): JsonValue {
  const pointerOf = (e: JsonValue): string => {
    if (typeof e !== "string") throw new TypeError("foldJson: EAVT entity must be a JSON Pointer string");
    const hash = e.indexOf("#");
    return hash < 0 ? e : e.slice(hash + 1);
  };
  const depth = (pointer: string): number => pointer === "" ? 0 : pointer.split("/").length - 1;
  const nodes = new Map<string, JsonValue>([["", {}]]);
  const sorted = rows.map(eavtRecord).sort((left, right) => depth(pointerOf(left.e)) - depth(pointerOf(right.e)));
  for (const row of sorted) {
    if (typeof row.a !== "string") throw new TypeError("foldJson: EAVT attribute must be a string");
    const pointer = pointerOf(row.e);
    const parent = nodes.get(pointer);
    if (parent === undefined) throw new Error(`foldJson: no node at pointer ${JSON.stringify(pointer)}`);
    let materialized = row.v;
    if (isContainer(row.v)) {
      materialized = Array.isArray(row.v) ? [] : {};
      nodes.set(`${pointer}/${escapePointer(row.a)}`, materialized);
    }
    if (Array.isArray(parent)) parent[Number(row.a)] = materialized;
    else (parent as Record<string, JsonValue>)[row.a] = materialized;
  }
  return requireJsonValue(nodes.get("") ?? {}, "folded JSON");
}

/** An EAVT → the cell it witnesses, charged with its witnessed potential. The
 *  value is derived from present-side evidence; nothing negative is admitted. */
export function eavtToCell(e: EAVT): ChargedCell {
  const [entity, attribute, value, time] = e;
  return { cell: { subject: entity, predicate: attribute, object: value }, charge: witnessedPotential(mark(time)) };
}

/** A charged cell → its EAVTs: one per present-side witness. The absent side is
 *  never an EAVT — you do not witness an absence; falsity is derived, not claimed. */
export function cellToEavt(charged: ChargedCell): EAVT[] {
  const { subject: e, predicate: a, object: v } = charged.cell;
  return charged.charge.evidence[0].map((t): EAVT => [e, a, v, requireJsonValue(t.value, "time witness")]);
}

/** The E-A-V-T order: compare canonical-json keys component by component, e then a then v then t. */
export function eavtOrder(x: EAVT, y: EAVT): number {
  for (let i = 0; i < 4; i++) {
    const xk = canonical(x[i]!);
    const yk = canonical(y[i]!);
    if (xk < yk) return -1;
    if (xk > yk) return 1;
  }
  return 0;
}
