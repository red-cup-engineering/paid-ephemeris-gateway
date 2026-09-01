/**
 * `format` — pure number/provenance formatting helpers shared by every render module. Kept
 * separate from `render-graph.mjs`/`app.mjs` so these are unit-testable without a DOM, and so the
 * provenance→badge mapping lives in exactly one place (`badgeClass`/`badgeText`) rather than
 * being re-decided ad hoc at each call site — the house disclosure discipline this whole service
 * exists to model would be undermined by a UI where two different screens draw the same
 * `Tagged<T>` two different ways.
 */

/** Human-readable number formatting: fixed decimals, `-0` normalized to `0`, and non-finite
 *  values spelled out rather than rendered as the confusing literal strings `Infinity`/`NaN`. */
export function formatNumber(x, digits = 2) {
  if (Number.isNaN(x)) return "undefined (NaN)";
  if (x === Infinity) return "unbounded";
  if (x === -Infinity) return "unbounded (negative)";
  const v = Object.is(x, -0) ? 0 : x;
  return v.toFixed(digits);
}

export function formatPercent(x, digits = 1) {
  return `${formatNumber(x * 100, digits)}%`;
}

/** The ONLY place a `Tagged<T>`'s provenance maps to a CSS class — `"computed-from-your-graph"`
 *  and `"designed-flavor"` are the two values `provenance.mts` can ever produce; a third value
 *  reaching here is a real bug, not a case to silently default through. */
export function badgeClass(provenance) {
  if (provenance === "computed-from-your-graph") return "badge badge--computed";
  if (provenance === "designed-flavor") return "badge badge--authored";
  throw new TypeError(`badgeClass: unknown provenance "${provenance}" — every Tagged<T> must be one of the two provenance.mts values`);
}

export function badgeText(provenance) {
  if (provenance === "computed-from-your-graph") return "computed";
  if (provenance === "designed-flavor") return "authored";
  throw new TypeError(`badgeText: unknown provenance "${provenance}"`);
}

/** Render a `Tagged<number>` (`provenance.mts`) as `{ text, badgeClass, badgeText, title }` for a
 *  DOM renderer to place directly — never just the bare number, so a caller cannot accidentally
 *  drop the provenance on the floor by only reading `.value`. */
export function taggedNumber(tagged, digits = 2) {
  return {
    text: formatNumber(tagged.value, digits),
    cls: badgeClass(tagged.provenance),
    badge: badgeText(tagged.provenance),
    title: tagged.label,
  };
}
