/**
 * codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/triple
 *
 * Plain SPO triples projected from EAVT/Datom JSONL rows. This is a codec leaf
 * for the external `{s,p,o}` data shape, not a runtime check for an internal
 * carrier.
 */
import { createHash } from "node:crypto";
import { canonical, requireJsonValue, type JsonRecord, type JsonValue } from "../../../index.mjs";
import { assertObjectDatom } from "../../datom/index.mjs";
import { eavtRecord, type EAVT, type EAVTRecord } from "../index.mjs";

export type Triple = Readonly<{
  readonly s: JsonValue;
  readonly p: JsonValue;
  readonly o: JsonValue;
}>;

export function assertTriple(value: unknown): Triple {
  const json = requireJsonValue(value, "triple");
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new TypeError("triple must be a JSON object");
  const record = json as JsonRecord;
  const keys = Object.keys(record).sort();
  if (keys.join(",") !== "o,p,s") throw new TypeError(`triple must be exactly {s,p,o}, got ${keys.join(",")}`);
  return Object.freeze({
    s: record["s"]!,
    p: record["p"]!,
    o: record["o"]!,
  });
}

export function tripleId(value: unknown): string {
  return createHash("sha256").update(canonical(assertTriple(value)), "utf8").digest("hex");
}

export function dedupeTriples(values: readonly unknown[]): Triple[] {
  const seen = new Set<string>();
  const triples: Triple[] = [];
  for (const value of values) {
    const triple = assertTriple(value);
    const id = tripleId(triple);
    if (seen.has(id)) continue;
    seen.add(id);
    triples.push(triple);
  }
  return triples;
}

export function tripleFromEavt(value: EAVT | EAVTRecord): Triple {
  const row = eavtRecord(value);
  return Object.freeze({ s: row.e, p: row.a, o: row.v });
}

export function tripleFromDatom(value: unknown): Triple {
  const datom = assertObjectDatom(value);
  return Object.freeze({ s: datom.e, p: datom.a, o: datom.v });
}
