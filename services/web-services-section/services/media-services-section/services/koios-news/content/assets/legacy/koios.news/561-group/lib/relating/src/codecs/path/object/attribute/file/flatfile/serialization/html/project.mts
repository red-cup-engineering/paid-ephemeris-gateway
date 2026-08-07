/**
 * codecs/html/project — the projection (write) direction: a settled `ShpDataform`
 * → a finite HTML packet. Deterministic for a fixed dataform + morphism
 * registry; monotone (later cells append, the historical packet is not mutated
 * in place). `class` names a morphism identity (via the registry); `data-e/a/v`
 * carry the cell's entity/attribute/value coordinates; `data-positive/negative`
 * the bilattice sides; a contested or audited cell carries its `<details
 * class="why">` witness evidence.
 *
 * The charge reads route through relating's algebra: a side is "present"
 * (not a boolean), and the value/mark/calm names come from ./escape, which is
 * relating's own four-valued naming.
 */
import { escapeAttr, escapeText, unmark, chargeValueOf, chargeMark, calmChargeOf, isContested, type HtmlValue } from "./escape.mjs";
import type { ChargeCarrier, Mark } from "../../../../../../../../articulating/carriers.mjs";
import type { JsonValue } from "../json/index.mjs";
import type { ChargedCell, ShpDataform } from "./normalize.mjs";
import { defaultMorphisms, type MorphismRegistry } from "./morphism.mjs";

const present = (charge: ChargeCarrier, side: 0 | 1): boolean => charge.value[side].name === "present";

/**
 * Projects a settled `ShpDataform` into a finite HTML semantic-hypertext
 * packet: validates the dataform and its subject, groups cells by entity into
 * `<section class="subject">` blocks, renders each cell as a charged `<span>`,
 * emits `<meta>` tags from metadata, and wraps everything in an `<article
 * class="semantic-hypertext-packet">` document. Deterministic for a fixed
 * dataform and morphism registry; returns the complete HTML string.
 */
export function project(dataform: ShpDataform, morphisms: MorphismRegistry = defaultMorphisms()): string {
  if (!dataform || typeof dataform !== "object") {
    throw new TypeError("project: dataform must be an object");
  }
  const subject = unmark(dataform.subject);
  if (subject === undefined || subject === null) {
    throw new TypeError("project: dataform.subject is required");
  }
  const cells = Array.isArray(dataform.cells) ? dataform.cells : [];
  const title = dataform.title ?? subject;
  const mode = dataform.mode === "audit" ? "audit" : "calm";
  const projection = dataform.projection === "negated" ? "negated" : "supported";

  const groups = new Map<HtmlValue, ChargedCell[]>();
  for (const entry of cells) {
    if (!entry || !entry.cell) {
      throw new TypeError("project: each cell must be { cell: { subject, predicate, object? }, charge }");
    }
    const key = unmark(entry.cell.subject) ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  const sections = [...groups.entries()]
    .map(([entity, entries]) =>
      `    <section class="subject" data-e="${escapeAttr(entity)}">\n` +
      entries.map((entry) => renderSpan(entry, mode, projection, morphisms)).join("\n") +
      `\n    </section>`)
    .join("\n");

  const metaTags = Object.entries(dataform.metadata ?? {})
    .map(([key, value]) => `    <meta name="${escapeAttr(key)}" content="${escapeAttr(value)}">`)
    .join("\n");

  const articleAttrs = [
    `class="semantic-hypertext-packet"`,
    `data-subject="${escapeAttr(subject)}"`,
    dataform.observer == null ? null : `data-observer="${escapeAttr(dataform.observer)}"`,
    `data-cells="${cells.length}"`,
    `data-mode="${escapeAttr(mode)}"`,
  ].filter(Boolean).join(" ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${escapeText(title)}</title>${metaTags ? "\n" + metaTags : ""}
</head>
<body>
  <article ${articleAttrs}>
${sections}
  </article>
</body>
</html>
`;
}

/** The SHP projection. `shp` is the historical name for `project`. */
export const shp = project;
export default project;

function renderSpan(entry: ChargedCell, mode: "calm" | "audit", projection: "supported" | "negated", morphisms: MorphismRegistry): string {
  const { cell, charge } = entry;
  if (!charge || !Array.isArray(charge.value)) {
    throw new TypeError("project: each cell needs a charge carrier");
  }
  const subject = unmark(cell.subject) ?? null;
  const predicate = unmark(cell.predicate) ?? null;
  const object = unmark(cell.object);
  const hasObject = object !== undefined && object !== null && object !== "";
  const value = chargeValueOf(charge);
  const calm = calmChargeOf(charge, projection);
  const mark = chargeMark(charge);
  const contested = isContested(charge);
  const attrs = [
    `class="${escapeAttr(morphisms.className(predicate))}"`,
    `data-e="${escapeAttr(subject)}"`,
    `data-a="${escapeAttr(predicate)}"`,
    hasObject ? `data-v="${escapeAttr(object)}"` : null,
    `data-positive="${present(charge, 0)}"`,
    `data-negative="${present(charge, 1)}"`,
    `data-value="${escapeAttr(value)}"`,
    `data-calm="${escapeAttr(calm)}"`,
    `data-mark="${escapeAttr(mark)}"`,
    contested ? `data-contested="true"` : null,
  ].filter(Boolean).join(" ");
  const why = contested || mode === "audit" ? renderWhy(charge, mark) : "";
  const text = hasObject ? `${escapeText(predicate)} ${escapeText(object)}` : escapeText(predicate);
  return `      <span ${attrs}>${text}${why}</span>`;
}

function renderWhy(charge: ChargeCarrier, mark: string): string {
  const evidence = Array.isArray(charge.evidence) ? charge.evidence : [[], []];
  const positive = (Array.isArray(evidence[0]) ? evidence[0] : []).map(markValue).filter((item) => item != null);
  const negative = (Array.isArray(evidence[1]) ? evidence[1] : []).map(markValue).filter((item) => item != null);
  const list = (witnesses: readonly HtmlValue[]): string =>
    witnesses.length === 0 ? "<em>none recorded</em>" : witnesses.map((witness) => `<li>${escapeText(witness)}</li>`).join("");
  return `<details class="why" data-held="${escapeAttr(mark)}">` +
    `<summary>why ${escapeText(mark)}</summary>` +
    `<ul class="witnesses-positive" data-side="positive">${list(positive)}</ul>` +
    `<ul class="witnesses-negative" data-side="negative">${list(negative)}</ul>` +
    `</details>`;
}

function markValue(witness: Mark): HtmlValue {
  const value = witness.value;
  if (isHtmlValue(value)) return value;
  throw new TypeError("project: witness mark is not HTML-projectable");
}

function isHtmlValue(value: Mark["value"]): value is HtmlValue {
  return isJsonValue(value) || isConstValue(value);
}

function isConstValue(value: Mark["value"]): value is { readonly const: JsonValue } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  return "const" in value && isJsonValue(value.const);
}

function isJsonValue(value: Mark["value"]): value is JsonValue {
  if (value === undefined) return false;
  if (value === null) return true;
  const kind = typeof value;
  if (kind === "string" || kind === "boolean") return true;
  if (kind === "number") return Number.isFinite(value);
  if (kind !== "object") return false;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  return Object.values(value).every(isJsonValue);
}
