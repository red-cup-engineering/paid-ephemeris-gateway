/**
 * codecs/svg/profiles — an inhabitant profile constrains a relational SVG to a
 * concrete element/attribute vocabulary and a conformance lint, exactly as the
 * HTML codec's profiles constrain a packet (RFC 7992). Two profiles ship:
 *
 *   - svg-interactive — the default for a web diagram: clickable `<a>` nodes and
 *     edges, full `data-*` relational markup. Rich, self-describing, NOT static.
 *   - rfc7996         — RFC 7996 "SVG Drawings for RFCs" (the SVG 1.2 RFC
 *     profile): a static, embeddable subset. No scripting, no interactive `<a>`,
 *     no event handlers. The interactivity that the web profile relies on is
 *     exactly what this one forbids, so it is a *separate* projection, not the
 *     live default.
 *
 * A profile is consulted by `project.mts` (whether to emit anchors / data-*) and
 * exposes a `lint` that checks a finished document for conformance.
 */

export interface LintViolation {
  readonly rule: string;
  readonly detail: string;
}

export interface LintReport {
  readonly ok: boolean;
  readonly violations: readonly LintViolation[];
}

/** An inhabitant profile of the relational SVG codec. */
export interface Profile {
  readonly name: string;
  /** Whether the profile permits interactive `<a href>` wrappers. */
  readonly permitsAnchors: boolean;
  /** Whether the profile permits `data-*` relational attributes. */
  readonly permitsDataAttributes: boolean;
  /** Check a finished SVG string against the profile's constraints. */
  lint(svg: string): LintReport;
}

// Constructs RFC 7996 forbids in a static figure: scripting, event handlers, and
// interactive linking. A conformant relational figure carries none of them.
const FORBIDDEN: ReadonlyArray<{ readonly rule: string; readonly pattern: RegExp; readonly detail: string }> = [
  { rule: "no-script", pattern: /<script[\s>]/i, detail: "RFC 7996 forbids <script>" },
  { rule: "no-anchor", pattern: /<a[\s>]/i, detail: "RFC 7996 forbids interactive <a> links" },
  { rule: "no-event-handler", pattern: /\son[a-z]+="/i, detail: "RFC 7996 forbids on* event-handler attributes" },
  { rule: "no-foreign-object", pattern: /<foreignObject[\s>]/i, detail: "RFC 7996 forbids <foreignObject>" },
];

function rfc7996Lint(svg: string): LintReport {
  const violations: LintViolation[] = [];
  for (const { rule, pattern, detail } of FORBIDDEN) {
    if (pattern.test(svg)) violations.push({ rule, detail });
  }
  return { ok: violations.length === 0, violations };
}

// The interactive profile only insists the document is an SVG; interactivity is
// allowed, so the lint is permissive.
function interactiveLint(svg: string): LintReport {
  const ok = /<svg[\s>]/i.test(svg);
  return { ok, violations: ok ? [] : [{ rule: "is-svg", detail: "not an <svg> document" }] };
}

/** The default, interactive web profile: clickable, fully self-describing. */
export const svgInteractiveProfile: Profile = Object.freeze({
  name: "svg-interactive",
  permitsAnchors: true,
  permitsDataAttributes: true,
  lint: interactiveLint,
});

/** The RFC 7996 static profile: embeddable in documents, no interactivity. */
export const rfc7996Profile: Profile = Object.freeze({
  name: "rfc7996",
  permitsAnchors: false,
  permitsDataAttributes: false,
  lint: rfc7996Lint,
});
