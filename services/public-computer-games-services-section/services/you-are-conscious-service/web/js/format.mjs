/**
 * `format` — pure number/provenance formatting helpers shared by every render module. Ported from
 * stoke-service's `web/js/format.mjs`, unchanged: the provenance->badge mapping lives in exactly
 * one place so this game's disclosure discipline (`src/provenance.mts`) is never re-decided ad hoc
 * at a call site.
 */

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

/** Render a `Tagged<number>` as `{ text, cls, badge, title }` for a DOM renderer to place directly
 *  — never just the bare number, so a caller cannot accidentally drop the provenance on the floor
 *  by only reading `.value`. */
export function taggedNumber(tagged, digits = 2) {
  return {
    text: formatNumber(tagged.value, digits),
    cls: badgeClass(tagged.provenance),
    badge: badgeText(tagged.provenance),
    title: tagged.label,
  };
}
