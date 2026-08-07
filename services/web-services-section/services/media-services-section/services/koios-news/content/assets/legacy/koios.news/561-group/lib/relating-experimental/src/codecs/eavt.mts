/**
 * codecs/eavt — the atomic witness row, the shape of the LOG (never the wire).
 *
 * An EAVT `[entity, attribute, value, time]` is a witness: at `time`, the cell
 * (entity, attribute, value) was observed. It carries no polarity and no
 * operation — the closure is monotone, finality is derived by settling, never
 * claimed. You ASSERT EAVT and RECEIVE Datoms: a `Datom` is an EAVT plus the
 * reading a script computed about that cell — `[entity, attribute, value, time,
 * reading]`, five parts, the fifth where the settled judgement goes.
 *
 * For the invocation ledger the mapping is exact: E = caller, A = morphism and
 * its arguments, V = the return value, T = the timestamp.
 */
import { createHash } from "node:crypto";
import { canonical, isJsonValue, requireJsonValue, type JsonValue } from "./json.mjs";
import { restrict, type Projector } from "../holography/index.mjs";
import { jsonlProjector, parseLines, serializeLines } from "./json.mjs";
import { mark } from "../articulating/utterance.mjs";
import { witnessedPotential, type ChargeCarrier } from "../articulating/predicating/positing/bilattice-charge.mjs";

/** A subject-predicate-object cell — the triple an EAVT witnesses. */
export type Cell = { readonly subject: JsonValue; readonly predicate: JsonValue; readonly object: JsonValue };
/** A cell paired with its charge over the bilattice. */
export type ChargedCell = { readonly cell: Cell; readonly charge: ChargeCarrier };
/** The SPO triple projected from an EAVT row. */
export type EAVTTriple = { readonly s: JsonValue; readonly p: JsonValue; readonly o: JsonValue };

/** The IANA-style media type for an EAVT JSONL carrier. */
export const EAVT_JSONL = "application/eavt+jsonl; charset=utf-8";

/** An EAVT tuple: `[entity, attribute, value, time]` — the asserted form. */
export type EAVT = readonly [entity: JsonValue, attribute: JsonValue, value: JsonValue, time: JsonValue];

/** The object spelling of EAVT used by JSON bodies and human-authored documents. */
export type EAVTRecord = {
  readonly e: JsonValue;
  readonly a: JsonValue;
  readonly v: JsonValue;
  readonly t: JsonValue;
};

/** A Datom: an EAVT plus the reading computed about that cell — the received form. */
export type Datom = readonly [entity: JsonValue, attribute: JsonValue, value: JsonValue, time: JsonValue, reading: JsonValue];

/** Whether a JSON value is shaped like an EAVT tuple. */
export function isEavtShape(value: JsonValue): boolean {
  return Array.isArray(value) && value.length === 4 && value.every(isJsonValue);
}

/** Normalize a tuple or object row into the canonical `{e,a,v,t}` record. */
export function eavtRecord(row: EAVT | EAVTRecord): EAVTRecord {
  if (Array.isArray(row)) {
    const [e, a, v, t] = row;
    return Object.freeze({ e, a, v, t });
  }
  const record = row as EAVTRecord;
  return Object.freeze({ e: record.e, a: record.a, v: record.v, t: record.t });
}

/** The content identity of a witness row: a hash of its canonical record. An
 *  unchanged cell re-witnesses to a byte-identical id and dedupes to zero cost. */
export function eavtId(row: EAVT | EAVTRecord): string {
  const r = eavtRecord(row);
  return createHash("sha256").update(canonical(r as unknown as JsonValue), "utf8").digest("hex");
}

/** Read an EAVT JSONL document into normalized records (malformed lines skipped). */
export function parse(content: string): EAVTRecord[] {
  const out: EAVTRecord[] = [];
  for (const value of parseLines(content)) {
    if (isEavtShape(value)) out.push(eavtRecord(value as unknown as EAVT));
    else if (typeof value === "object" && value !== null && !Array.isArray(value) && "e" in value && "a" in value && "v" in value && "t" in value) {
      out.push(eavtRecord(value as unknown as EAVTRecord));
    }
  }
  return out;
}

/** Serialize witness records as canonical EAVT JSONL (object spelling). */
export function serialize(rows: readonly (EAVT | EAVTRecord)[]): string {
  return serializeLines(rows.map((row) => eavtRecord(row) as unknown as JsonValue));
}

/** Serialize Datoms as canonical JSONL (tuple spelling, five parts). */
export function serializeDatoms(datoms: readonly Datom[]): string {
  return serializeLines(datoms.map((datom) => [...datom] as unknown as JsonValue));
}

/** Normalize a row into the EAVT tuple spelling. */
export function toEavt(value: EAVT | EAVTRecord): EAVT {
  const r = eavtRecord(value);
  return [r.e, r.a, r.v, r.t];
}

/** Merge witness logs by content identity, sorted by id — the monotone union. */
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

/** The SPO triple witnessed by an EAVT row (drops time). */
export function eavtTriple(row: EAVT | EAVTRecord): EAVTTriple {
  const r = eavtRecord(row);
  return Object.freeze({ s: r.e, p: r.a, o: r.v });
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

/** The E-A-V-T order: compare canonical-json keys component by component. */
export function eavtOrder(x: EAVT, y: EAVT): number {
  for (let i = 0; i < 4; i++) {
    const xk = canonical(x[i]!);
    const yk = canonical(y[i]!);
    if (xk < yk) return -1;
    if (xk > yk) return 1;
  }
  return 0;
}

/** The EAVT projector: a restriction of JSONL recognizing rows of EAVT shape. */
export const eavtProjector: Projector<JsonValue> = restrict(jsonlProjector, {
  type: "eavt",
  recognize: (resource) => {
    try {
      return parseLines(resource.content).every(isEavtShape);
    } catch {
      return false;
    }
  },
});
