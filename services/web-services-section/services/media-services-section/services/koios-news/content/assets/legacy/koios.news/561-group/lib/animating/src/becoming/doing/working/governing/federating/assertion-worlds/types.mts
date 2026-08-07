import type { ChargeValueName } from "@emsenn/relating";

/**
 * An entity-attribute-value claim: `e` is the subject, `a` the predicate, `v`
 * the value, with optional `t` time, `source` of the claim, and `signature`
 * recording who made it.
 */
export type Assertion = Readonly<{
  e: string;
  a: string;
  v: unknown;
  t?: unknown;
  source?: string;
  signature?: { by?: unknown };
}>;

/** An ordered, immutable sequence of assertions. */
export type AssertionTrace = readonly Assertion[];

/** A map from entity identifier to that entity's assertion trace. */
export type World = Map<string, AssertionTrace>;
/**
 * Accepted forms for constructing a world: an existing world map, a plain
 * record of traces keyed by entity, or null/undefined for an empty world.
 */
export type WorldInput = World | Record<string, AssertionTrace> | null | undefined;

/**
 * Specifies which predicates are functional (single-valued): either a set of
 * predicate names or a membership predicate over predicate names.
 */
export type FunctionalPredicate = ReadonlySet<string> | ((predicate: string) => boolean);

/**
 * A single predicate-object pair within a section together with the witness
 * identifiers that support it.
 */
export type SectionCell = Readonly<{
  predicate: string;
  object: unknown;
  witnesses: readonly string[];
}>;

// Admission only ever witnesses potential cells: a claim is its own evidence
// for its own predicate. The active and stable buckets never arise from
// admission — readers of a refusal must read the contrary predicate's
// potential cells (see `disagreements` and `sectionSpace` for the derived
// contrary-pair reads).
/**
 * The section over a subject partitioned into three buckets of cells by charge:
 * `potential`, `active`, and `stable`. Admission only ever populates
 * `potential`; active and stable are derived by reads across declared contrary
 * pairs.
 */
export type Section = Readonly<{
  potential: readonly SectionCell[];
  active: readonly SectionCell[];
  stable: readonly SectionCell[];
}>;

/**
 * Options for folding: `retract` toggles whether retracting assertions are
 * honored.
 */
export type FoldOptions = Readonly<{
  retract?: boolean;
}>;

/**
 * Fold options extended with `functional`, declaring which predicates are
 * single-valued when settling.
 */
export type SettleOptions = FoldOptions & Readonly<{ functional?: FunctionalPredicate }>;

// A contrariety declaration is read-side knowledge, never admission-side
// polarity: `{ closed: "open" }` declares the predicate `closed` contrary to
// the canonical predicate `open`. Both predicates fold as their own potential
// cells; only the reads derive active/stable across the declared pair.
/**
 * Read-side contrariety declaration: `contrary` maps each predicate to the
 * canonical predicate it is declared contrary to. Both predicates still fold as
 * their own potential cells; only reads derive active/stable across the
 * declared pair.
 */
export type ContraryOptions = Readonly<{ contrary?: Record<string, string> }>;

/**
 * A folded predicate-object cell carrying its resolved charge `value`, the set
 * of assertion ids that witness it (`witnessIds`), and the set of sources that
 * witnessed it (`witnessedBy`).
 */
export type FoldedCell = Readonly<{
  predicate: string;
  object: unknown;
  value: ChargeValueName;
  witnessIds: ReadonlySet<string>;
  witnessedBy: ReadonlySet<string>;
}>;

/**
 * The folded result for one entity: the `entity` identifier and its `fiber`,
 * the collection of folded cells over that entity.
 */
export type Folded = Readonly<{
  entity: string;
  fiber: readonly FoldedCell[];
}>;

/**
 * A derived view of a section as a space of points and states: `points` are
 * subjects, `states` are charge states, `valueAt` gives the charge at a
 * point/state, `cellFor` returns the folded cell for a point, and `stateOfId`
 * maps each witness id to its state.
 */
export type SectionSpace = Readonly<{
  points: readonly string[];
  states: readonly string[];
  valueAt: (point: string, state: string) => ChargeValueName;
  cellFor: (point: string) => FoldedCell | undefined;
  stateOfId: ReadonlyMap<string, string>;
}>;

/**
 * A function deciding the recognition standing of a source, returning a charge
 * value, a boolean, an object carrying `value`/`settled`, or any other
 * recognizer-defined result.
 */
export type Recognizer = (source: string) => ChargeValueName | boolean | { value?: unknown; settled?: unknown } | unknown;
/**
 * Accepted forms for declaring source recognition: a recognizer function, a set
 * or array of recognized source names, a map or record of per-source
 * recognition, or null/undefined for none.
 */
export type RecognitionInput = undefined | null | Recognizer | Set<string> | readonly string[] | Map<string, unknown> | Record<string, unknown>;

/**
 * The provenance of a witness: the `source` and the `kind` of attestation it
 * derives from - the assertion's source field, its signature, or a witnessed
 * time.
 */
export type Provenance = Readonly<{ source: string; kind: "source" | "signature" | "witnessed-t" }>;

// A refusal is the gate's own claim of the contrary predicate
// `refused-admission`, carried as an assertion in its own right beside the
// refused assertion's identity — never a denial of the refused assertion.
/**
 * A gate's own claim of the contrary predicate `refused-admission`: `claim` is
 * that assertion, `assertion` identifies the refused assertion, `source` and
 * `standing` record who and at what charge, and `reason` explains the refusal.
 * Never a denial of the refused assertion.
 */
export type AdmissionRefusal = Readonly<{
  claim: Assertion;
  assertion: string;
  source: string | null;
  standing: ChargeValueName;
  reason: string;
}>;

// A disagreement is derived, never admitted: two contrary predicates each
// hold their own potential cell over the same subject and object, and the
// reader's knowledge-join across the declared contrariety renders the held
// pair stable.
/**
 * A derived disagreement over one `subject` and `object`: two contrary
 * predicates (`predicate` and `contrary`) each hold a potential cell, with
 * `evidence`, `claimedBy`, and `contraryClaimedBy` recording their witnesses,
 * and `value` always `"stable"` since the knowledge-join across the contrariety
 * renders the held pair stable.
 */
export type Disagreement = Readonly<{
  subject: string;
  predicate: string;
  contrary: string;
  object: unknown;
  evidence: readonly [readonly string[], readonly string[]];
  claimedBy: readonly string[];
  contraryClaimedBy: readonly string[];
  value: "stable";
}>;

/**
 * A governance decision record (kind `animating.federation.governance.decision`):
 * identifies the deciding `actor`, `office`, and `action` against a target,
 * whether it was `admitted`, the governing `regime` and `policy`, the resolved
 * `claim`/`value`, its `jural` mode and `binding` status, `reason`, resulting
 * `withdrawals` and `affirmations`, and the cost witness fields.
 */
export type GovernanceDecision = Readonly<{
  kind: "animating.federation.governance.decision";
  id: string;
  actor: string;
  office: string;
  action: string;
  targetKind: string;
  targetTitle: string;
  admitted: boolean;
  regime: string;
  title: string;
  claim: string;
  value: ChargeValueName;
  jural: "power" | "privilege";
  binding: boolean;
  reason: string;
  policy: string;
  withdrawals: readonly string[];
  affirmations: readonly string[];
  costWitness: unknown;
  costWitnessKind: string;
  created: unknown;
}>;

/**
 * The input context for a governance evaluation: the acting `agent` (name and
 * office), the `action`, optional `target` and `options` records, the
 * `officeName`, and an optional `can` predicate deciding whether an agent may
 * perform an action.
 */
export type GovernanceContext = {
  agent?: { name?: unknown; office?: unknown };
  action: string;
  target?: Record<string, unknown>;
  options?: Record<string, unknown>;
  officeName?: string;
  can?: (agent: unknown, action: string) => boolean;
};

/**
 * A governance cone presented as a space of points and states: `points` are
 * subjects, `states` are charge states, and `valueAt` gives the charge at a
 * given point and state.
 */
export type GovernanceCone = Readonly<{
  points: readonly string[];
  states: readonly string[];
  valueAt: (point: string, state: string) => ChargeValueName;
}>;
