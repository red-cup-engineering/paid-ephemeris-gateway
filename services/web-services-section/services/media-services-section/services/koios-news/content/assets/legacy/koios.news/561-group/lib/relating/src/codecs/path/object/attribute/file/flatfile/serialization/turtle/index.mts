/**
 * turtle — the Turtle/IRI term writers.
 *
 * The two primitive serializers every RDF vocabulary in the workspace shares:
 * `iriRef` writes an IRI reference `<...>`, percent-encoding the delimiters a
 * Turtle IRIREF may not contain; `turtleLiteral` writes a quoted literal with
 * the backslash/quote/newline escaping Turtle requires (finite numbers and
 * booleans pass through as their bare typed forms). Pure string functions, no
 * I/O — so any vocabulary downstream of relating (the web linked-data
 * codec, the jsnode ecosystem codec) reuses one term writer rather than
 * re-deriving the escaping. These are RDF primitives, not a web concern, so
 * they live at the relational substrate.
 */
import { type JsonValue } from "../json/index.mjs";

/** Write an IRI as a Turtle IRIREF `<...>`, percent-encoding the characters a
 *  Turtle IRIREF may not contain. */
export function iriRef(iri: string): string {
  return `<${String(iri).replace(/[- <>"{}|^`\\]/g, encodeURIComponent)}>`;
}

/** Write a value as a Turtle literal: finite numbers and booleans as their bare
 *  forms, everything else as a quoted string with Turtle escaping. */
export function turtleLiteral(value: JsonValue): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  const escaped = String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
  return `"${escaped}"`;
}
