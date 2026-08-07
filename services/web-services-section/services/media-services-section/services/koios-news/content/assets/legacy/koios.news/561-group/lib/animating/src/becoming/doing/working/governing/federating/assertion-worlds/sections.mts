import type { ChargeValueName } from "@emsenn/relating";
import { provenanceOf } from "./admission.mjs";
import { compareStamp, deepFreeze, stableJson } from "./json.mjs";
import { assertAssertion, assertionId, isReified, supersede } from "./assertions.mjs";
import type { Assertion, AssertionTrace, ContraryOptions, Disagreement, Folded, FoldedCell, FoldOptions, Section, SectionCell, SectionSpace, SettleOptions, WorldInput } from "./types.mjs";
import { allAssertions, logFor, subjects } from "./world.mjs";

// The predicate that claims contrariety: `(closed, "contrary-to", open)` is
// itself a claim — taxonomy is itself claimed. It installs read-side
// contrariety knowledge; it never flips polarity at fold time.
/**
 * The predicate name `contrary-to` used by `contrary-to` claims in a world:
 * such a claim installs read-side contrariety knowledge naming one predicate as
 * contrary to another, and never flips polarity at fold time.
 */
export const CONTRARY_PREDICATE = "contrary-to";

/**
 * Folds an assertion trace for one subject into a frozen `Folded`: collapses
 * the subject's assertions into predicate-object cells (honoring retractions
 * unless `opts.retract` is false), sorts them by predicate then object, and
 * returns the entity with its frozen fiber of folded cells.
 */
export function fold(subject: string, assertions: AssertionTrace, opts: FoldOptions = {}): Folded {
  const cells = [...foldAssertions(assertions, subject, opts.retract !== false).values()]
    .sort((left, right) => stableJson([left.predicate, left.object]).localeCompare(stableJson([right.predicate, right.object])))
    .map(freezeFoldedCell);
  return deepFreeze({ entity: subject, fiber: Object.freeze(cells) });
}

/**
 * Settles then folds a subject's assertions: applies `supersede` to the trace
 * using `opts.functional` to keep only the surviving claim per functional
 * predicate, then folds the result into a `Folded`.
 */
export function settle(subject: string, assertions: AssertionTrace, opts: SettleOptions = {}): Folded {
  return fold(subject, supersede(assertions, opts.functional), opts);
}

/**
 * Projects a `Folded` into a `Section`: buckets its fiber cells by charge value
 * into the `potential`, `active`, and `stable` lists, each cell reduced to its
 * predicate, object, and witness ids.
 */
export function section(folded: Folded): Section {
  return sectionFrom(folded.fiber);
}

/**
 * Builds a `SectionSpace` over a `Folded`: indexes its cells by
 * predicate-object key, maps each cell's witness ids to states via
 * `opts.stateOf` (optionally filtered to `opts.predicate`), and returns the
 * sorted points and states with a `valueAt` that derives a charge from a
 * state's own claim plus its claim of the declared contrary predicate, falling
 * back to `opts.absent` where neither is witnessed.
 */
export function sectionSpace(
  folded: Folded,
  assertions: AssertionTrace = [],
  opts: { stateOf?: (assertion: Assertion) => unknown; predicate?: string; absent?: ChargeValueName; contrary?: Record<string, string> } = {},
): SectionSpace {
  const stateOf = opts.stateOf ?? ((assertion: Assertion): unknown => assertion.t && typeof assertion.t === "object" && "by" in assertion.t ? (assertion.t as { by?: unknown }).by : assertion.t);
  const absent = opts.absent ?? "absurd";
  const stateOfId = new Map<string, string>();
  for (const assertion of assertions) {
    assertAssertion(assertion);
    const state = stateOf(assertion);
    if (state != null) stateOfId.set(assertionId(assertion), String(state));
  }

  const contrary = symmetricContrariety(opts.contrary ?? {});
  const witnessStates = new Map<string, Set<string>>();
  const allCells = new Map<string, FoldedCell>();
  for (const cell of folded.fiber) {
    const key = stableJson([cell.predicate, cell.object]);
    allCells.set(key, cell);
    witnessStates.set(key, witnessesFor(cell.witnessIds, stateOfId));
  }

  const cells = new Map<string, FoldedCell>();
  const states = new Set<string>();
  for (const [key, cell] of allCells) {
    if (opts.predicate !== undefined && cell.predicate !== opts.predicate) continue;
    cells.set(key, cell);
    for (const state of witnessStates.get(key) ?? []) states.add(state);
    const contraryKey = contraryKeyFor(cell, contrary);
    if (contraryKey !== undefined) for (const state of witnessStates.get(contraryKey) ?? []) states.add(state);
  }

  const points = Object.freeze([...cells.keys()].sort());
  const orderedStates = Object.freeze([...states].sort());
  return Object.freeze({
    points,
    states: orderedStates,
    // The truth side is witnessed by the state's own claim; the falsity side
    // is reached only by derivation from the state's claim of the declared
    // contrary predicate. No polarity is admitted.
    valueAt(point: string, state: string): ChargeValueName {
      const cell = cells.get(point);
      const truth = witnessStates.get(point)?.has(state) ?? false;
      const contraryKey = cell === undefined ? undefined : contraryKeyFor(cell, contrary);
      const falsity = contraryKey === undefined ? false : witnessStates.get(contraryKey)?.has(state) ?? false;
      return truth && falsity ? "stable" : truth ? "potential" : falsity ? "active" : absent;
    },
    cellFor(point: string): FoldedCell | undefined {
      return cells.get(point);
    },
    stateOfId,
  });
}

/**
 * Returns the settled fiber of folded cells for a subject in a world: reads the
 * subject's log from the world, settles and folds it, and yields the resulting
 * `FoldedCell` array.
 */
export function frontier(world: WorldInput, subject: string, opts: SettleOptions = {}): readonly FoldedCell[] {
  return settle(subject, logFor(world, subject), opts).fiber;
}

/**
 * Computes the `Section` for a subject in a world: takes the subject's settled
 * frontier and buckets its cells by charge value into the potential, active,
 * and stable lists.
 */
export function sectionOf(world: WorldInput, subject: string, opts: SettleOptions = {}): Section {
  return sectionFrom(frontier(world, subject, opts));
}

/**
 * Computes a subject's full settled view in one pass: returns a frozen record
 * carrying the subject's `section`, its frozen settled `cells`, the derived
 * `space`, and the space's `cellFor` and `stateOfId` accessors, threading any
 * `opts.contrary` declaration into the space.
 */
export function sectionConeOf(world: WorldInput, subject: string, opts: SettleOptions & ContraryOptions = {}): Readonly<{
  section: Section;
  cells: readonly FoldedCell[];
  space: SectionSpace;
  cellFor: SectionSpace["cellFor"];
  stateOfId: SectionSpace["stateOfId"];
}> {
  const assertions = logFor(world, subject);
  const folded = settle(subject, assertions, opts);
  const space = sectionSpace(folded, assertions, opts.contrary === undefined ? {} : { contrary: opts.contrary });
  return Object.freeze({
    section: section(folded),
    cells: Object.freeze([...folded.fiber]),
    space,
    cellFor: space.cellFor,
    stateOfId: space.stateOfId,
  });
}

// Derived, never admitted: for each declared contrary pair (q contrary to
// canonical p), both cells potential over the same subject and object render
// the held pair stable. Contrariety enters from `opts.contrary` and from
// `contrary-to` claims in the world itself.
/**
 * Derives the stable disagreements across a world: for each subject, where a
 * settled cell's predicate is declared contrary to a canonical predicate (from
 * `contrary-to` claims and `opts.contrary`) and both the canonical and contrary
 * cells are held over the same object, emits a `Disagreement` recording the
 * subject, the two predicates, their evidence and claimants, and the resulting
 * `stable` value.
 */
export function disagreements(world: WorldInput, opts: SettleOptions & ContraryOptions = {}): readonly Disagreement[] {
  const contrary = contrarietyOf(allAssertions(world), opts.contrary ?? {});
  const out: Disagreement[] = [];
  for (const subject of subjects(world)) {
    const cells = new Map<string, FoldedCell>();
    for (const cell of frontier(world, subject, opts)) cells.set(stableJson([cell.predicate, cell.object]), cell);
    for (const cell of cells.values()) {
      const canonical = contrary.get(cell.predicate);
      if (canonical === undefined) continue;
      const canonicalCell = cells.get(stableJson([canonical, cell.object]));
      if (canonicalCell === undefined) continue;
      out.push(Object.freeze({
        subject,
        predicate: canonical,
        contrary: cell.predicate,
        object: cell.object,
        evidence: Object.freeze([Object.freeze([...canonicalCell.witnessIds]), Object.freeze([...cell.witnessIds])]) as readonly [readonly string[], readonly string[]],
        claimedBy: Object.freeze([...canonicalCell.witnessedBy].sort()),
        contraryClaimedBy: Object.freeze([...cell.witnessedBy].sort()),
        value: "stable" as const,
      }));
    }
  }
  return Object.freeze(out);
}

// Every assertion witnesses its own predicate's cell, and every witnessed
// cell measures potential: there is no verb that admits a charge, a
// polarity, or a denial. Retraction (`v === null`) is log discipline — a
// supersession read lens — not a contrary claim.
function foldAssertions(assertions: AssertionTrace, subject: string, retract: boolean): Map<string, MutableFoldedCell> {
  if (typeof subject !== "string" || subject.length === 0) throw new TypeError("fold: subject must be a non-empty string");
  const retractedAfter = new Map<string, unknown>();
  if (retract) {
    for (const assertion of assertions) {
      if (assertion.e !== subject || assertion.v !== null) continue;
      const current = retractedAfter.get(assertion.a);
      if (current === undefined || compareStamp(assertion.t, current) > 0) retractedAfter.set(assertion.a, assertion.t);
    }
  }

  const cells = new Map<string, MutableFoldedCell>();
  for (const assertion of assertions) {
    assertAssertion(assertion);
    if (assertion.e !== subject || isReified(assertion.e) || assertion.v === null) continue;
    const retractAt = retractedAfter.get(assertion.a);
    if (retractAt !== undefined && compareStamp(assertion.t, retractAt) < 0) continue;
    const key = `${assertion.a}\0${stableJson(assertion.v)}`;
    const cell = cells.get(key) ?? { predicate: assertion.a, object: assertion.v, value: "potential" as ChargeValueName, witnessIds: new Set<string>(), witnessedBy: new Set<string>() };
    cell.witnessIds.add(assertionId(assertion));
    const by = provenanceOf(assertion)?.source ?? String(assertion.t ?? "");
    if (by) cell.witnessedBy.add(by);
    cells.set(key, cell);
  }
  return cells;
}

function sectionFrom(cells: readonly FoldedCell[]): Section {
  const cellOf = (cell: FoldedCell): SectionCell => Object.freeze({
    predicate: cell.predicate,
    object: cell.object,
    witnesses: Object.freeze([...cell.witnessIds]),
  });
  return Object.freeze({
    potential: Object.freeze(cells.filter((cell) => cell.value === "potential").map(cellOf)),
    active: Object.freeze(cells.filter((cell) => cell.value === "active").map(cellOf)),
    stable: Object.freeze(cells.filter((cell) => cell.value === "stable").map(cellOf)),
  });
}

function contrarietyOf(assertions: AssertionTrace, declared: Record<string, string>): Map<string, string> {
  const contrary = new Map<string, string>();
  for (const assertion of assertions) {
    if (assertion.a === CONTRARY_PREDICATE && typeof assertion.v === "string" && typeof assertion.e === "string" && !isReified(assertion.e)) {
      contrary.set(assertion.e, assertion.v);
    }
  }
  for (const [q, p] of Object.entries(declared)) contrary.set(q, p);
  return contrary;
}

function symmetricContrariety(declared: Record<string, string>): Map<string, string> {
  const contrary = new Map<string, string>();
  for (const [q, p] of Object.entries(declared)) {
    contrary.set(q, p);
    contrary.set(p, q);
  }
  return contrary;
}

function contraryKeyFor(cell: FoldedCell, contrary: ReadonlyMap<string, string>): string | undefined {
  const partner = contrary.get(cell.predicate);
  return partner === undefined ? undefined : stableJson([partner, cell.object]);
}

type MutableFoldedCell = {
  predicate: string;
  object: unknown;
  value: ChargeValueName;
  witnessIds: Set<string>;
  witnessedBy: Set<string>;
};

function freezeFoldedCell(cell: MutableFoldedCell): FoldedCell {
  return Object.freeze({
    predicate: cell.predicate,
    object: cell.object,
    value: cell.value,
    witnessIds: Object.freeze(new Set(cell.witnessIds)),
    witnessedBy: Object.freeze(new Set(cell.witnessedBy)),
  });
}

function witnessesFor(ids: ReadonlySet<string>, stateOfId: ReadonlyMap<string, string>): Set<string> {
  const states = new Set<string>();
  for (const id of ids) {
    const state = stateOfId.get(id);
    if (state != null) states.add(state);
  }
  return states;
}
