/**
 * acting/codecs — the argv-selectable wire vocabulary.
 *
 * A `WireCodec` adapts one boundary document (a string on stdin/stdout) to the
 * carrier an action's morphism consumes and produces. The wire is NOT forced:
 * the articulation family defaults to `string` (a Mark payload is opaque), and
 * everything passed between scripts defaults to `json`; `--in`/`--out` select a
 * codec by name. EAVT is offered as a wire too, but it is primarily the shape of
 * the LOG, not the wire. Each codec is the boundary face of a holography
 * projector; an unknown name is rejected (a finite vocabulary, witnessed).
 */
import {
  canonical,
  parse as parseJson,
  type JsonValue,
} from "../codecs/json.mjs";
import {
  parse as parseEavt,
  serialize as serializeEavt,
  type EAVTRecord,
} from "../codecs/eavt.mjs";

/** A wire codec: decode a boundary document into a carrier, encode it back. */
export interface WireCodec {
  readonly name: string;
  readonly mediaType: string;
  decode(document: string): JsonValue;
  encode(value: JsonValue): string;
}

/** The plain-string wire: identity on the boundary document. */
export const stringCodec: WireCodec = Object.freeze({
  name: "string",
  mediaType: "text/plain; charset=utf-8",
  decode: (document: string): JsonValue => document,
  encode: (value: JsonValue): string => (typeof value === "string" ? value : canonical(value)),
});

/** The JSON wire: the canonical resource form passed between scripts. */
export const jsonCodec: WireCodec = Object.freeze({
  name: "json",
  mediaType: "application/json; charset=utf-8",
  decode: (document: string): JsonValue => parseJson(document),
  encode: (value: JsonValue): string => `${canonical(value)}\n`,
});

/** The EAVT wire: the carrier is the array of witnessed records. */
export const eavtCodec: WireCodec = Object.freeze({
  name: "eavt",
  mediaType: "application/eavt+jsonl; charset=utf-8",
  decode: (document: string): JsonValue => parseEavt(document) as unknown as JsonValue,
  encode: (value: JsonValue): string => serializeEavt((Array.isArray(value) ? value : [value]) as unknown as readonly EAVTRecord[]),
});

/** The form wire: `application/x-www-form-urlencoded` decoded to a flat object.
 *  This is the encoding behind an HTTP query string and a web form — another
 *  representation of a record carrier (e.g. `token=foo&claim=bar` ↔ {token,claim}),
 *  not a second ontology. Repeated keys keep the last value; nesting is not a
 *  form concern (compose with `json` for structure). */
export const formCodec: WireCodec = Object.freeze({
  name: "form",
  mediaType: "application/x-www-form-urlencoded; charset=utf-8",
  decode: (document: string): JsonValue => {
    const out: { [key: string]: JsonValue } = {};
    for (const [key, value] of new URLSearchParams(document)) out[key] = value;
    return out;
  },
  encode: (value: JsonValue): string => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("form codec: can only encode a flat object");
    }
    const params = new URLSearchParams();
    for (const [key, item] of Object.entries(value)) {
      params.set(key, typeof item === "string" ? item : canonical(item));
    }
    return `${params.toString()}\n`;
  },
});

const REGISTRY: Readonly<Record<string, WireCodec>> = Object.freeze({
  string: stringCodec,
  json: jsonCodec,
  eavt: eavtCodec,
  form: formCodec,
});

/** The available wire codec names — the finite vocabulary. */
export const WIRE_CODEC_NAMES: readonly string[] = Object.freeze(Object.keys(REGISTRY).sort());

/** Resolve a wire codec by name, or throw — the vocabulary witness. */
export function wireCodec(name: string): WireCodec {
  const codec = REGISTRY[name];
  if (codec === undefined) {
    throw new TypeError(`unknown wire codec ${JSON.stringify(name)}; known: ${WIRE_CODEC_NAMES.join(", ")}`);
  }
  return codec;
}
