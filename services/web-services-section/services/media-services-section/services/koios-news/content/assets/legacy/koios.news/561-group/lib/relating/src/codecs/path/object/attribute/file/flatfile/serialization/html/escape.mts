/**
 * codecs/html/escape — HTML-safe text/attribute escaping and charge marks for
 * the Semantic Hypertext Packet (SHP) codec.
 *
 * The charge vocabulary here is relating's OWN bilattice value naming
 * (absurd | potential | active | stable). The former SHP-local `memeChargeOf`
 * (which re-derived the four values from a raw [positive, negative] pair) is
 * gone: value names come straight from `valueOf`/`chargeValueName` in
 * ../../algebra. The coordinate→name mapping is identical
 * (potential = truth-only, active = falsity-only, stable = both, absurd =
 * neither), so this is a faithful de-duplication, not a behavior change.
 */
import { valueOf, chargeValueName, type ChargeCarrier, type ChargeValueName } from "../../../../../../../../articulating/carriers.mjs";
import { canonical, type JsonValue } from "../json/index.mjs";

/** Values the SHP codec is allowed to inspect and stringify at its boundary. */
export type HtmlValue = JsonValue | { readonly const: JsonValue };

function htmlText(value: HtmlValue): string {
  const unmarked = unmark(value);
  return unmarked !== null && typeof unmarked === "object" ? canonical(unmarked) : String(unmarked);
}

/**
 * Escapes a value for use in HTML text content: stringifies it and replaces &,
 * <, and > with their entity references.
 */
export function escapeText(value: HtmlValue): string {
  return htmlText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escapes a value for use in a quoted HTML attribute: applies escapeText then
 * additionally replaces " and ' with their entity references.
 */
export function escapeAttr(value: HtmlValue): string {
  return escapeText(value)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A URL/id-safe slug derived from a value: trimmed, lowercased,
 * non-alphanumeric runs collapsed to hyphens with leading/trailing hyphens
 * stripped, falling back to "cell" when the result is empty.
 */
export function slug(value: HtmlValue): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "cell";
}

/**
 * Unwraps a marked value: returns the inner `const` property when value is a
 * non-null object carrying one, otherwise returns the value unchanged.
 */
export function unmark(value: HtmlValue | undefined): JsonValue | undefined {
  return value !== null && typeof value === "object" && "const" in value
    ? value.const
    : value;
}

/** The bilattice value-name of a charge — relating's four-valued naming, no
 *  SHP-local re-derivation. */
export const chargeValueOf = (charge: ChargeCarrier): ChargeValueName =>
  chargeValueName(valueOf(charge));

/** A compact glyph for a charge: ⊤ both, ⊥ neither, t truth-only, f falsity-only. */
export function chargeMark(charge: ChargeCarrier): "t" | "f" | "⊥" | "⊤" {
  const value = chargeValueOf(charge);
  if (value === "stable") return "⊤";
  if (value === "absurd") return "⊥";
  return value === "potential" ? "t" : "f";
}

/** A contested (stable/both) charge projected to one side: supported→potential, negated→active. */
export function calmChargeOf(charge: ChargeCarrier, projection: "supported" | "negated" = "supported"): ChargeValueName {
  const value = chargeValueOf(charge);
  if (value !== "stable") return value;
  return projection === "negated" ? "active" : "potential";
}

/** A charge is contested when truth and falsity are both present (stable). */
export function isContested(charge: ChargeCarrier): boolean {
  return chargeValueOf(charge) === "stable";
}
