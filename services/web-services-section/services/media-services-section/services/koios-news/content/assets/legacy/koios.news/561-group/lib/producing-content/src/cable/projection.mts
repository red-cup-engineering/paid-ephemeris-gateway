// Presentation as pure projection: a ClaimStateBundle is the canonical
// resource; everything an item "looks like" is computed from its claims.
//
// Vocabulary, in the standard sense: a projection here is a function of the
// bundle and nothing else — no presentation state is stored. An item's title
// is the object of its effective claim with predicate "title" (falling back
// to the subject); its summary the "summary" claim if present; published is
// the earliest time.asserted in the bundle and updated the latest, because
// assertions are events and the item's life IS its assertions. Modality
// preservation: no projection may display a claim stronger than its force,
// so a rendered claim line leads with the force, then the proposition, then
// witness, method, accuracy, valid time, and status.

import { effectiveClaims, type AssertedClaim, type ClaimStateBundle } from "@emsenn/content/topology/news";

export type WireItem = Readonly<{
  subject: string;
  title: string;
  summary?: string;
  /** The original source URL, from the "url" predicate claim, when present. */
  sourceUrl?: string;
  /** Earliest time.asserted in the bundle, when any claim exists. */
  published?: string;
  /** Latest time.asserted in the bundle, when any claim exists. */
  updated?: string;
}>;

function claimWithPredicate(bundle: ClaimStateBundle, predicate: string): AssertedClaim | undefined {
  return effectiveClaims(bundle).find((claim) => claim.proposition.predicate === predicate);
}

/** The item's title: the effective "title" claim's object, else the subject. */
export function itemTitle(bundle: ClaimStateBundle): string {
  const claim = claimWithPredicate(bundle, "title");
  return typeof claim?.proposition.object === "string" ? claim.proposition.object : bundle.subject;
}

/** The item's summary: the effective "summary" claim's object, if present. */
export function itemSummary(bundle: ClaimStateBundle): string | undefined {
  const claim = claimWithPredicate(bundle, "summary");
  return typeof claim?.proposition.object === "string" ? claim.proposition.object : undefined;
}

/** Earliest time.asserted across the whole bundle (corrections included). */
export function publishedOf(bundle: ClaimStateBundle): string | undefined {
  return bundle.claims.map((claim) => claim.time.asserted).sort()[0];
}

/** Latest time.asserted across the whole bundle (corrections included). */
export function updatedOf(bundle: ClaimStateBundle): string | undefined {
  return bundle.claims.map((claim) => claim.time.asserted).sort().at(-1);
}

/** The original source URL: the effective "url" claim's object, if present. */
export function itemSourceUrl(bundle: ClaimStateBundle): string | undefined {
  const claim = claimWithPredicate(bundle, "url");
  return typeof claim?.proposition.object === "string" ? claim.proposition.object : undefined;
}

/** The full item projection of one bundle. */
export function projectItem(bundle: ClaimStateBundle): WireItem {
  const summary = itemSummary(bundle);
  const sourceUrl = itemSourceUrl(bundle);
  const published = publishedOf(bundle);
  const updated = updatedOf(bundle);
  return Object.freeze({
    subject: bundle.subject,
    title: itemTitle(bundle),
    ...(summary === undefined ? {} : { summary }),
    ...(sourceUrl === undefined ? {} : { sourceUrl }),
    ...(published === undefined ? {} : { published }),
    ...(updated === undefined ? {} : { updated }),
  });
}

/** Feed order: reverse-chronological by published, subject as tiebreak. */
export function sortReverseChronological(items: readonly WireItem[]): readonly WireItem[] {
  return Object.freeze(
    items
      .slice()
      .sort(
        (a, b) =>
          (b.published ?? "").localeCompare(a.published ?? "") || a.subject.localeCompare(b.subject),
      ),
  );
}

/** The wire's freshness: the latest asserted instant across it, or null. */
export function freshnessOf(bundles: readonly ClaimStateBundle[]): string | null {
  const latest = bundles
    .map((bundle) => updatedOf(bundle))
    .filter((time): time is string => time !== undefined)
    .sort()
    .at(-1);
  return latest ?? null;
}

/** The proposition as prose: title claims read bare; others keep their predicate. */
export function propositionText(claim: AssertedClaim): string {
  const { predicate, object } = claim.proposition;
  const text = typeof object === "string" ? object : JSON.stringify(object);
  return predicate === "title" ? text : `${predicate}: ${text}`;
}

/**
 * One claim as a modality-preserving line: the force leads, so the display
 * is never stronger than the claim. E.g. `computes — Mercury stations
 * retrograde at 2026-06-29T17:36Z (witness: astrology-topology ephemeris;
 * accuracy: …; valid: …; status: supported)`.
 */
export function claimLine(claim: AssertedClaim): string {
  const provenance = [
    `witness: ${claim.provenance.witness}`,
    ...(claim.provenance.method === undefined ? [] : [`method: ${claim.provenance.method}`]),
    ...(claim.provenance.accuracy === undefined ? [] : [`accuracy: ${claim.provenance.accuracy}`]),
    ...(claim.provenance.citation === undefined ? [] : [`citation: ${claim.provenance.citation}`]),
    ...(claim.time.valid === undefined ? [] : [`valid: ${claim.time.valid}`]),
    `status: ${claim.status}`,
  ].join("; ");
  return `${claim.force} — ${propositionText(claim)} (${provenance})`;
}

export type WireAuditEntry = Readonly<{
  subject: string;
  claimCount: number;
  /** Histogram of assertion forces over every claim in the bundle. */
  forces: Readonly<Record<string, number>>;
  /** Distinct witnesses, sorted. */
  witnesses: readonly string[];
  /** Histogram of editorial statuses over every claim in the bundle. */
  statuses: Readonly<Record<string, number>>;
}>;

/** The audit projection of one bundle: counts, never judgments. */
export function auditOf(bundle: ClaimStateBundle): WireAuditEntry {
  const forces: Record<string, number> = {};
  const statuses: Record<string, number> = {};
  const witnesses = new Set<string>();
  for (const claim of bundle.claims) {
    forces[claim.force] = (forces[claim.force] ?? 0) + 1;
    statuses[claim.status] = (statuses[claim.status] ?? 0) + 1;
    witnesses.add(claim.provenance.witness);
  }
  return Object.freeze({
    subject: bundle.subject,
    claimCount: bundle.claims.length,
    forces: Object.freeze(forces),
    witnesses: Object.freeze([...witnesses].sort()),
    statuses: Object.freeze(statuses),
  });
}
