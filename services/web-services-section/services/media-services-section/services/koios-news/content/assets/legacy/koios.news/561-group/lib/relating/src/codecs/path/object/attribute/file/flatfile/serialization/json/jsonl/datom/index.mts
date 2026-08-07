/**
 * codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/datom
 *
 * Datom is the received/query row: EAVT plus a reading. It is a JSONL format
 * sibling of EAVT, not the source of the EAVT row discipline.
 */
import { createHash } from "node:crypto";
import { type JsonRecord, type JsonValue } from "../index.mjs";
import { canonical, parseLines, requireJsonValue, serializeLines } from "../index.mjs";

export type Datom = readonly [
  entity: JsonValue,
  attribute: JsonValue,
  value: JsonValue,
  time: JsonValue,
  reading: JsonValue,
];

export function isDatomShape(value: JsonValue): value is Datom {
  return Array.isArray(value) && value.length === 5;
}

export function toDatom(value: JsonValue): Datom {
  if (isDatomShape(value)) return [value[0], value[1], value[2], value[3], value[4]];
  throw new TypeError("datom: expected [entity, attribute, value, time, reading]");
}

export const datom = (
  eavt: readonly [JsonValue, JsonValue, JsonValue, JsonValue],
  reading: JsonValue,
): Datom => [eavt[0], eavt[1], eavt[2], eavt[3], reading];

export const parse = (content: string): Datom[] => parseLines(content).map(toDatom);

export const serialize = (datoms: readonly Datom[]): string => serializeLines(datoms);

export const ASSERT = "assert";
export const RETRACT = "retract";

export type DatomOp = typeof ASSERT | typeof RETRACT;

export type ObjectDatom = Readonly<{
  readonly [key: string]: JsonValue;
  readonly e: JsonValue;
  readonly a: JsonValue;
  readonly v: JsonValue;
  readonly tx: JsonValue;
  readonly op: DatomOp;
}>;

export type CurrentDatomFact = Readonly<{
  readonly e: JsonValue;
  readonly a: JsonValue;
  readonly v: JsonValue;
}>;

export type ObjectDatomCharge = "potential" | "active" | "stable";

export type ObjectDatomSectionCell = Readonly<{
  readonly subject: JsonValue;
  readonly predicate: JsonValue;
  readonly object: JsonValue;
  readonly value: ObjectDatomCharge;
  readonly evidence: readonly [readonly JsonValue[], readonly JsonValue[]];
}>;

export type ObjectDatomSection = Readonly<{
  readonly datoms: readonly ObjectDatom[];
  readonly cells: readonly ObjectDatomSectionCell[];
}>;

export function assertObjectDatom(value: unknown): ObjectDatom {
  const record = requireJsonValue(value, "object datom");
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new TypeError("object datom must be a JSON object");
  const object = record as JsonRecord;
  const keys = Object.keys(object).sort();
  if (keys.join(",") !== "a,e,op,tx,v") throw new TypeError(`object datom must be exactly {e,a,v,tx,op}, got ${keys.join(",")}`);
  const rawOp = object["op"];
  if (rawOp !== ASSERT && rawOp !== RETRACT) {
    throw new TypeError(`object datom op must be "assert" or "retract", got ${JSON.stringify(rawOp)}`);
  }
  return Object.freeze({
    e: object["e"]!,
    a: object["a"]!,
    v: object["v"]!,
    tx: object["tx"]!,
    op: rawOp,
  });
}

export function assertDatomFact(e: JsonValue, a: JsonValue, v: JsonValue, tx: JsonValue): ObjectDatom {
  return Object.freeze({ e, a, v, tx, op: ASSERT });
}

export function retractDatomFact(e: JsonValue, a: JsonValue, v: JsonValue, tx: JsonValue): ObjectDatom {
  return Object.freeze({ e, a, v, tx, op: RETRACT });
}

export function objectDatomId(value: unknown): string {
  return createHash("sha256").update(canonical(assertObjectDatom(value)), "utf8").digest("hex");
}

export function currentDatomValue(datoms: readonly unknown[]): CurrentDatomFact[] {
  const live = new Map<string, CurrentDatomFact>();
  for (const datom of datoms) {
    const asserted = assertObjectDatom(datom);
    const fact = Object.freeze({ e: asserted.e, a: asserted.a, v: asserted.v });
    const key = canonical(fact);
    if (asserted.op === RETRACT) live.delete(key);
    else live.set(key, fact);
  }
  return [...live.values()];
}

export function objectDatomsAsOf(datoms: readonly unknown[], asOf: JsonValue): ObjectDatom[] {
  return datoms
    .map(assertObjectDatom)
    .filter((datom) => String(datom.tx) <= String(asOf));
}

export function foldObjectDatoms(datoms: readonly unknown[]): ObjectDatomSection {
  type Fold = {
    readonly datom: ObjectDatom;
    readonly positive: Map<string, JsonValue>;
    readonly negative: Map<string, JsonValue>;
  };
  const cells = new Map<string, Fold>();
  const asserted = datoms.map(assertObjectDatom);
  for (const datom of asserted) {
    const key = canonical({ e: datom.e, a: datom.a, v: datom.v });
    const cell = cells.get(key) ?? { datom, positive: new Map<string, JsonValue>(), negative: new Map<string, JsonValue>() };
    const evidence = datom.op === ASSERT ? cell.positive : cell.negative;
    evidence.set(canonical(datom.tx), datom.tx);
    cells.set(key, cell);
  }
  const sectionCells = [...cells.values()].map(({ datom, positive, negative }): ObjectDatomSectionCell => {
    const present = [...positive.values()];
    const absent = [...negative.values()];
    return Object.freeze({
      subject: datom.e,
      predicate: datom.a,
      object: datom.v,
      value: present.length > 0 && absent.length > 0 ? "stable" : present.length > 0 ? "potential" : "active",
      evidence: Object.freeze([Object.freeze(present), Object.freeze(absent)] as const),
    });
  }).sort((left, right) =>
    canonical(left.subject).localeCompare(canonical(right.subject))
      || canonical(left.predicate).localeCompare(canonical(right.predicate))
      || canonical(left.object).localeCompare(canonical(right.object)));
  return Object.freeze({
    datoms: Object.freeze(asserted),
    cells: Object.freeze(sectionCells),
  });
}

export function objectDatomWitnesses(
  section: ObjectDatomSection,
  cell: { readonly subject?: unknown; readonly predicate?: unknown; readonly object?: unknown; readonly e?: unknown; readonly a?: unknown; readonly v?: unknown },
): readonly JsonValue[] {
  const subject = "subject" in cell ? cell.subject : cell.e;
  const predicate = "predicate" in cell ? cell.predicate : cell.a;
  const object = "object" in cell ? cell.object : cell.v;
  const key = canonical({ e: requireJsonValue(subject, "cell subject"), a: requireJsonValue(predicate, "cell predicate"), v: requireJsonValue(object, "cell object") });
  const found = section.cells.find((candidate) =>
    canonical({ e: candidate.subject, a: candidate.predicate, v: candidate.object }) === key);
  return found?.evidence[0] ?? Object.freeze([]);
}
