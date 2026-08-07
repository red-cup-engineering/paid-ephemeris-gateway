/**
 * codecs/triple — plain SPO triples projected from EAVT/Datom rows.
 *
 * A codec leaf for the external `{s,p,o}` data shape (e.g. RDF-ish export),
 * projected from an EAVT witness or an object datom by dropping time/op.
 */
import { createHash } from "node:crypto";
import { canonical, requireJsonValue, type JsonRecord, type JsonValue } from "./json.mjs";
import { assertObjectDatom } from "./datom.mjs";
import { eavtRecord, type EAVT, type EAVTRecord } from "./eavt.mjs";

/** A plain SPO triple. */
export type Triple = Readonly<{ readonly s: JsonValue; readonly p: JsonValue; readonly o: JsonValue }>;

/** Witness a value as a `{s,p,o}` triple, or throw. */
export function assertTriple(value: unknown): Triple {
  const json = requireJsonValue(value, "triple");
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new TypeError("triple must be a JSON object");
  const record = json as JsonRecord;
  const keys = Object.keys(record).sort();
  if (keys.join(",") !== "o,p,s") throw new TypeError(`triple must be exactly {s,p,o}, got ${keys.join(",")}`);
  return Object.freeze({ s: record["s"]!, p: record["p"]!, o: record["o"]! });
}

/** The content identity of a triple. */
export function tripleId(value: unknown): string {
  return createHash("sha256").update(canonical(assertTriple(value) as unknown as JsonValue), "utf8").digest("hex");
}

/** Dedupe triples by content identity. */
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

/** The triple projected from an EAVT row (drops time). */
export function tripleFromEavt(value: EAVT | EAVTRecord): Triple {
  const row = eavtRecord(value);
  return Object.freeze({ s: row.e, p: row.a, o: row.v });
}

/** The triple projected from an object datom (drops tx/op). */
export function tripleFromDatom(value: unknown): Triple {
  const d = assertObjectDatom(value);
  return Object.freeze({ s: d.e, p: d.a, o: d.v });
}
