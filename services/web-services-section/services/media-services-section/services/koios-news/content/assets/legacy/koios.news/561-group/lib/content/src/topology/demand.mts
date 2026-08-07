/**
 * A single witnessed unit of demand on a term: an exact signed bigint magnitude
 * plus the evidence that witnessed it. Negative values are retractions asserted
 * by appending, never by removal.
 */
export interface DemandEntry {
  readonly kind: "content.demand.entry";
  /** The term (topic, keyword) the demand lands on. */
  readonly term: string;
  /** Exact signed magnitude. Negative entries are retractions-as-assertions. */
  readonly value: bigint;
  /** What witnessed this demand (view log line, query record, commission). */
  readonly evidence: readonly unknown[];
}

/**
 * A finitely additive demand charge over a finite space of terms: an
 * append-only trace of witnessed entries together with the carrier space they
 * land in. The measure at a term is the fold (exact sum) of its entries.
 */
export interface DemandChargeCarrier {
  readonly kind: "content.demand.charge";
  /** The finite carrier space of terms the charge is defined over. */
  readonly space: readonly string[];
  /** Append-only trace of witnessed demand. The value at a term is a fold. */
  readonly entries: readonly DemandEntry[];
}

// ---------- constructors ----------

/**
 * Construct a frozen DemandEntry, requiring a non-empty string term and a
 * bigint value (carrier math is exact). The evidence array is copied and
 * frozen.
 */
export function demandEntry(term: string, value: bigint, evidence: readonly unknown[] = []): DemandEntry {
  if (typeof term !== "string" || term.length === 0) throw new TypeError("demandEntry: term must be a non-empty string");
  if (typeof value !== "bigint") throw new TypeError("demandEntry: value must be a bigint — carrier math is exact");
  return Object.freeze({
    kind: "content.demand.entry" as const,
    term,
    value,
    evidence: Object.freeze([...evidence]),
  });
}

const normalizeSpace = (terms: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(terms)].sort());

/** A demand charge over a finite term space. Entries must land inside the
 *  space; an entry off the space is a malformed shape. */
export function demandCharge(space: readonly string[], entries: readonly DemandEntry[] = []): DemandChargeCarrier {
  const carrierSpace = normalizeSpace(space);
  const off = entries.filter((entry) => !carrierSpace.includes(entry.term));
  if (off.length > 0) {
    throw new TypeError(`demandCharge: entries land off the carrier space: ${off.map((entry) => entry.term).join(", ")}`);
  }
  return Object.freeze({
    kind: "content.demand.charge" as const,
    space: carrierSpace,
    entries: Object.freeze([...entries]),
  });
}

// ---------- operations (each returns a new carrier) ----------

/** Append a witnessed demand entry. The space widens by union if the term
 *  is new; nothing already witnessed is touched. */
export function witnessDemand(chargeCarrier: DemandChargeCarrier, entry: DemandEntry): DemandChargeCarrier {
  return Object.freeze({
    kind: "content.demand.charge" as const,
    space: normalizeSpace([...chargeCarrier.space, entry.term]),
    entries: Object.freeze([...chargeCarrier.entries, entry]),
  });
}

/** The charge of a subset of terms: the exact sum of every entry landing
 *  in the subset. Finite additivity holds by construction: for disjoint
 *  A and B, demandAt(c, A ∪ B) = demandAt(c, A) + demandAt(c, B). */
export function demandAt(chargeCarrier: DemandChargeCarrier, terms: readonly string[]): bigint {
  const subset = new Set(terms);
  let sum = 0n;
  for (const entry of chargeCarrier.entries) {
    if (subset.has(entry.term)) sum += entry.value;
  }
  return sum;
}

/** The charge of the whole space. */
export function totalDemand(chargeCarrier: DemandChargeCarrier): bigint {
  return demandAt(chargeCarrier, chargeCarrier.space);
}

/** Pointwise sum of two charges: union space, concatenated entry traces.
 *  Both arguments survive untouched. */
export function addDemand(left: DemandChargeCarrier, right: DemandChargeCarrier): DemandChargeCarrier {
  return Object.freeze({
    kind: "content.demand.charge" as const,
    space: normalizeSpace([...left.space, ...right.space]),
    entries: Object.freeze([...left.entries, ...right.entries]),
  });
}

/** Scale every entry by an exact integer factor. */
export function scaleDemand(chargeCarrier: DemandChargeCarrier, factor: bigint): DemandChargeCarrier {
  if (typeof factor !== "bigint") throw new TypeError("scaleDemand: factor must be a bigint — carrier math is exact");
  return Object.freeze({
    kind: "content.demand.charge" as const,
    space: chargeCarrier.space,
    entries: Object.freeze(chargeCarrier.entries.map((entry) => Object.freeze({
      ...entry,
      value: entry.value * factor,
    }))),
  });
}

// ---------- readings ----------

/**
 * A folded per-term reading of a charge: the term paired with its exact total
 * demand. A row in the output of demandRanking.
 */
export interface DemandRankEntry {
  readonly kind: "content.demand.rank";
  readonly term: string;
  readonly value: bigint;
}

/** Folded per-term reading of the charge, ranked by descending demand
 *  (ties broken by term order). The trace is the truth; this is a reading. */
export function demandRanking(chargeCarrier: DemandChargeCarrier): readonly DemandRankEntry[] {
  const folded = new Map<string, bigint>();
  for (const term of chargeCarrier.space) folded.set(term, 0n);
  for (const entry of chargeCarrier.entries) {
    folded.set(entry.term, (folded.get(entry.term) ?? 0n) + entry.value);
  }
  const ranked = [...folded.entries()]
    .sort(([leftTerm, leftValue], [rightTerm, rightValue]) =>
      leftValue === rightValue ? (leftTerm < rightTerm ? -1 : 1) : leftValue > rightValue ? -1 : 1)
    .map(([term, value]) => Object.freeze({ kind: "content.demand.rank" as const, term, value }));
  return Object.freeze(ranked);
}

// ---------- judgments ----------

/**
 * Affirmative judgment that two charges have equal measure at every term of
 * their union space, carrying both adjudicated charges.
 */
export interface DemandParityWitness {
  readonly kind: "content.demand.parity:witness";
  readonly left: DemandChargeCarrier;
  readonly right: DemandChargeCarrier;
}

/**
 * Negative judgment that two charges differ: carries both charges and the terms
 * at which their measures disagree.
 */
export interface DemandParityObstruction {
  readonly kind: "content.demand.parity-obstruction";
  readonly left: DemandChargeCarrier;
  readonly right: DemandChargeCarrier;
  /** The terms at which the two charges disagree. */
  readonly differing: readonly string[];
}

/**
 * The result of adjudicating parity of two charges: either a
 * DemandParityWitness (equal at every term) or a DemandParityObstruction (some
 * terms disagree).
 */
export type DemandParityJudgment = DemandParityWitness | DemandParityObstruction;

/** Mathematical parity of two charges: equal measure at every term of the
 *  union space. Parity is adjudicated on content (the fold), never on the
 *  shape of the trace — two different histories may carry the same charge. */
export function demandParity(left: DemandChargeCarrier, right: DemandChargeCarrier): DemandParityJudgment {
  const union = normalizeSpace([...left.space, ...right.space]);
  const differing = union.filter((term) => demandAt(left, [term]) !== demandAt(right, [term]));
  if (differing.length > 0) {
    return Object.freeze({
      kind: "content.demand.parity-obstruction" as const,
      left,
      right,
      differing: Object.freeze(differing),
    });
  }
  return Object.freeze({ kind: "content.demand.parity:witness" as const, left, right });
}
