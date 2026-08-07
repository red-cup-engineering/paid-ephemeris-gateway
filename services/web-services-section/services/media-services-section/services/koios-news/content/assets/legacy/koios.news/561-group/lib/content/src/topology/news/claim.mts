// The enriched claim carrier: claims as capital.
//
// Vocabulary (news_topology_research_memo §4.4, claim_state_capital memo):
// an AssertedClaim is the six-tuple (proposition φ, scope σ, time τ,
// assertion force α, provenance π, editorial status κ) with a stable id —
// the citation handle agent-readable infrastructure requires. Claims are
// not bare triples: the force carries their modality (alleges ≠ confirms ≠
// computes), and modality preservation means no projection may display a
// claim stronger than its force. Time is bitemporal: when the claimed
// thing holds (valid) versus when the claim was asserted.
//
// Laws: provenance is not warrant, and warrant is not truth (W3C VC
// distinction) — π records who/how; κ records the editorial judgment;
// neither implies the other. Correction is propagation, not erasure: a
// correcting claim names what it corrects, the corrected claim is marked
// superseded, and nothing is deleted — retraction is assertion. The
// ClaimStateBundle is the canonical wire resource; NewsClaimSet (index.mts)
// is its documented LOSSY projection, kept for the existing wire surfaces.

/**
 * The assertion force of a claim: its modality - whether the claim alleges,
 * confirms, denies, estimates, quotes, corrects, computes, or interprets. No
 * projection may display a claim stronger than its force.
 */
export type AssertionForce =
  | "alleges"
  | "confirms"
  | "denies"
  | "estimates"
  | "quotes"
  | "corrects"
  /** Deterministic computation with stated method and accuracy. */
  | "computes"
  /** Interpretive synthesis; never stronger than its sources. */
  | "interprets";

/**
 * The editorial judgment recorded on a claim: unverified, supported, contested,
 * corrected, or retracted. Distinct from provenance and from truth - it records
 * the editorial standing, not who witnessed the claim.
 */
export type EditorialStatus = "unverified" | "supported" | "contested" | "corrected" | "retracted";

/**
 * The scope of a claim: the optional event, entity, place, topic, and
 * jurisdiction the claim's proposition is bound to.
 */
export type ClaimScope = Readonly<{
  event?: string;
  entity?: string;
  place?: string;
  topic?: string;
  jurisdiction?: string;
}>;

/**
 * The bitemporal time of a claim: `valid` is when the claimed state of affairs
 * holds (optional, time-bound), `asserted` is when the claim was asserted
 * (required, since assertions are events).
 */
export type ClaimTime = Readonly<{
  /** When the claimed state of affairs holds (ISO 8601), if time-bound. */
  valid?: string;
  /** When the claim was asserted (ISO 8601). Required: assertions are events. */
  asserted: string;
}>;

/**
 * The provenance of a claim: the witness (person, model, or algorithm), the
 * optional method by which it was witnessed, the witness's stated accuracy, and
 * a citation handle. Records who/how, not warrant or truth.
 */
export type ClaimProvenance = Readonly<{
  /** Who or what witnessed the claim (a person, model, or algorithm). */
  witness: string;
  /** The method by which it was witnessed, when one exists. */
  method?: string;
  /** The witness's stated accuracy, in its own terms. */
  accuracy?: string;
  /** A citation URL or handle for the supporting artifact. */
  citation?: string;
}>;

/**
 * The enriched claim carrier: a proposition (predicate and object) bundled with
 * its scope, bitemporal time, assertion force, provenance, and editorial status
 * under a stable citation id. Carries optional `corrects` (the id this claim
 * corrects) and `supersededBy` (set when a later correction names it).
 */
export type AssertedClaim = Readonly<{
  /** Stable citation handle, unique within its bundle's subject. */
  id: string;
  proposition: Readonly<{ predicate: string; object: unknown }>;
  scope?: ClaimScope;
  time: ClaimTime;
  force: AssertionForce;
  provenance: ClaimProvenance;
  status: EditorialStatus;
  /** Correction propagation: the id of the claim this one corrects. */
  corrects?: string;
  /** Set on a claim a later correction names; the claim itself remains. */
  supersededBy?: string;
}>;

/** The canonical wire resource: a subject's claim-state, in full. */
export type ClaimStateBundle = Readonly<{
  subject: string;
  claims: readonly AssertedClaim[];
}>;

const ID_PATTERN = /^[a-z0-9]+([.:-][a-z0-9]+)*$/;

/**
 * Asserts that an unknown value is a well-formed ClaimStateBundle: requires a
 * non-empty subject, a claims list, and for each claim a unique lowercase-atom
 * id, a proposition predicate, an asserted time, a force, a witness, and a
 * status. Throws TypeError on the first violation.
 */
export function assertClaimStateBundle(value: unknown): asserts value is ClaimStateBundle {
  if (value === null || typeof value !== "object") throw new TypeError("bundle must be an object");
  const bundle = value as Record<string, unknown>;
  if (typeof bundle.subject !== "string" || bundle.subject.length === 0) {
    throw new TypeError("bundle.subject must be a non-empty string");
  }
  if (!Array.isArray(bundle.claims)) throw new TypeError("bundle.claims must be a list");
  const seen = new Set<string>();
  for (const claim of bundle.claims as readonly Record<string, unknown>[]) {
    if (typeof claim?.id !== "string" || !ID_PATTERN.test(claim.id)) {
      throw new TypeError(`claim id must be lowercase atoms joined by . : - (got ${String(claim?.id)})`);
    }
    if (seen.has(claim.id)) throw new TypeError(`duplicate claim id: ${claim.id}`);
    seen.add(claim.id);
    const proposition = claim.proposition as Record<string, unknown> | undefined;
    if (!proposition || typeof proposition.predicate !== "string") {
      throw new TypeError(`claim ${claim.id}: proposition.predicate is required`);
    }
    const time = claim.time as Record<string, unknown> | undefined;
    if (!time || typeof time.asserted !== "string") {
      throw new TypeError(`claim ${claim.id}: time.asserted is required — assertions are events`);
    }
    if (typeof claim.force !== "string") throw new TypeError(`claim ${claim.id}: force is required`);
    const provenance = claim.provenance as Record<string, unknown> | undefined;
    if (!provenance || typeof provenance.witness !== "string") {
      throw new TypeError(`claim ${claim.id}: provenance.witness is required — no witness, no world`);
    }
    if (typeof claim.status !== "string") throw new TypeError(`claim ${claim.id}: status is required`);
  }
}

/** The claims a correction has not superseded: the bundle's current view. */
export function effectiveClaims(bundle: ClaimStateBundle): readonly AssertedClaim[] {
  return Object.freeze(bundle.claims.filter((claim) => claim.supersededBy === undefined));
}

/** Every correction in the bundle, newest first — the corrections feed's source. */
export function correctionClaims(bundle: ClaimStateBundle): readonly AssertedClaim[] {
  return Object.freeze(
    bundle.claims
      .filter((claim) => claim.force === "corrects" || claim.corrects !== undefined)
      .slice()
      .sort((a, b) => b.time.asserted.localeCompare(a.time.asserted)),
  );
}

/**
 * Apply a correction: append the correcting claim and mark its target
 * superseded. Nothing is removed — retraction is assertion. Throws
 * TypeError if the target id does not exist or the correction lacks
 * `corrects`.
 */
export function withCorrection(bundle: ClaimStateBundle, correction: AssertedClaim): ClaimStateBundle {
  if (correction.corrects === undefined) throw new TypeError("a correction must name what it corrects");
  const target = bundle.claims.find((claim) => claim.id === correction.corrects);
  if (!target) throw new TypeError(`correction targets unknown claim id: ${correction.corrects}`);
  return Object.freeze({
    subject: bundle.subject,
    claims: Object.freeze([
      ...bundle.claims.map((claim) =>
        claim.id === correction.corrects
          ? Object.freeze({ ...claim, status: "corrected" as EditorialStatus, supersededBy: correction.id })
          : claim,
      ),
      correction,
    ]),
  });
}
