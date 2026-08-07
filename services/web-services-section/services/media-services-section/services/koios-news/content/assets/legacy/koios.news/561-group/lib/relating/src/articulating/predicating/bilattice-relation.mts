import {
  asChargeValue,
  chargeValue,
  sameChargeValue,
  negateValue,
  joinKnowledgeValue,
  type ChargeValue,
} from "./positing/bilattice-charge.mjs";
import { type EntitySet, type PredicateSet } from "./predication.mjs";
import { count, type Natural } from "./positing/settling/analysis/exact-number.mjs";

/**
 * An equivalence test for relation coordinates: returns true when two points
 * (or two states) are the same.
 */
export type RelationSameness<T> = (left: T, right: T) => boolean;

/**
 * A successful relation read: records the point, the state, and the charge
 * value the relation assigns to that (point, state) cell.
 */
export interface RelationReadWitness<Point, State> {
  readonly kind: "bilattice.relation.read:witness";
  readonly point: Point;
  readonly state: State;
  readonly value: ChargeValue;
}

/**
 * A failed relation read: the (point, state) cell could not be read, carrying
 * the absent charge value used in its place.
 */
export interface RelationReadObstruction<Point, State> {
  readonly kind: "bilattice.relation.read-obstruction";
  readonly point: Point;
  readonly state: State;
  readonly absent: ChargeValue;
}

/**
 * The outcome of reading a relation cell: either a RelationReadWitness with a
 * value or a RelationReadObstruction with an absent value.
 */
export type RelationReadJudgment<Point, State> =
  | RelationReadWitness<Point, State>
  | RelationReadObstruction<Point, State>;

/**
 * A bilattice relation: a matrix of charge values over a set of points and a
 * set of states, with sameness tests, an absent default, a read judging each
 * cell, and at returning each cell's charge value directly.
 */
export interface RelationCarrier<Point, State> {
  readonly kind: "bilattice.relation.carrier";
  readonly points: EntitySet<Point>;
  readonly states: PredicateSet<State>;
  readonly absent: ChargeValue;
  readonly samePoint: RelationSameness<Point>;
  readonly sameState: RelationSameness<State>;
  readonly read: (point: Point, state: State) => RelationReadJudgment<Point, State>;
  readonly at: (point: Point, state: State) => ChargeValue;
}

/**
 * A single populated cell of a relation matrix: the point, the state, and the
 * charge value at that coordinate.
 */
export interface RelationMatrixEntry<Point, State> {
  readonly kind: "bilattice.relation.matrixEntry";
  readonly point: Point;
  readonly state: State;
  readonly value: ChargeValue;
}

/**
 * A successful matrix lookup: wraps the RelationMatrixEntry found at a queried
 * (point, state) coordinate.
 */
export interface RelationMatrixEntryWitness<Point, State> {
  readonly kind: "bilattice.relation.matrixEntry:witness";
  readonly entry: RelationMatrixEntry<Point, State>;
}

/**
 * A failed matrix lookup: no entry exists at the queried (point, state)
 * coordinate.
 */
export interface RelationMatrixEntryObstruction<Point, State> {
  readonly kind: "bilattice.relation.matrixEntry-obstruction";
  readonly point: Point;
  readonly state: State;
}

/**
 * The outcome of a matrix lookup: either a RelationMatrixEntryWitness with the
 * entry or a RelationMatrixEntryObstruction.
 */
export type RelationMatrixEntryJudgment<Point, State> =
  | RelationMatrixEntryWitness<Point, State>
  | RelationMatrixEntryObstruction<Point, State>;

/**
 * A relation in sparse matrix form: its points, states, the list of populated
 * entries, the rank (entry count), and the point/state sameness tests.
 */
export interface RelationMatrixCarrier<Point, State> {
  readonly kind: "bilattice.relation.matrix";
  readonly points: EntitySet<Point>;
  readonly states: PredicateSet<State>;
  readonly values: readonly RelationMatrixEntry<Point, State>[];
  readonly rank: Natural;
  readonly samePoint: RelationSameness<Point>;
  readonly sameState: RelationSameness<State>;
}

/**
 * One cell of a point's profile: a state paired with the charge value the
 * relation assigns it for that point.
 */
export interface PointProfileEntry<State> {
  readonly kind: "bilattice.relation.pointProfileEntry";
  readonly state: State;
  readonly value: ChargeValue;
}

/**
 * The row of a relation for a fixed point: the point, its charge value across
 * every state, and the rank (entry count).
 */
export interface PointProfileCarrier<Point, State> {
  readonly kind: "bilattice.relation.pointProfile";
  readonly point: Point;
  readonly entries: readonly PointProfileEntry<State>[];
  readonly rank: Natural;
}

/**
 * One cell of a state's profile: a point paired with the charge value the
 * relation assigns it for that state.
 */
export interface StateProfileEntry<Point> {
  readonly kind: "bilattice.relation.stateProfileEntry";
  readonly point: Point;
  readonly value: ChargeValue;
}

/**
 * The column of a relation for a fixed state: the state, its charge value
 * across every point, and the rank (entry count).
 */
export interface StateProfileCarrier<Point, State> {
  readonly kind: "bilattice.relation.stateProfile";
  readonly state: State;
  readonly entries: readonly StateProfileEntry<Point>[];
  readonly rank: Natural;
}

/**
 * The extension of a state: the set of points whose truth coordinate is present
 * (charge value potential or stable) for that state, with the rank (point
 * count).
 */
export interface StateExtensionCarrier<Point, State> {
  readonly kind: "bilattice.relation.stateExtension";
  readonly state: State;
  readonly points: EntitySet<Point>;
  readonly rank: Natural;
}

/**
 * The forward leg of a relation transform: maps a source point to a target
 * point.
 */
export type RelationForward<SourcePoint, TargetPoint> = (point: SourcePoint) => TargetPoint;
/**
 * The backward leg of a relation transform: maps a target state to a source
 * state.
 */
export type RelationBackward<TargetState, SourceState> = (state: TargetState) => SourceState;

/**
 * The cell-reading function supplied to relation: yields a RelationReadJudgment
 * for a given (point, state).
 */
export type RelationReadFunction<Point, State> = (point: Point, state: State) => RelationReadJudgment<Point, State>;

/**
 * Construction options for a relation: the point and state sameness tests and
 * an optional absent charge value used for unread cells.
 */
export interface RelationOptions<Point, State> {
  readonly absent?: ChargeValue;
  readonly samePoint: RelationSameness<Point>;
  readonly sameState: RelationSameness<State>;
}

/**
 * An adjoint pair between two relations: a source carrier, a target carrier, a
 * forward map on points, and a backward map on states.
 */
export interface RelationTransform<SourcePoint, SourceState, TargetPoint, TargetState> {
  readonly kind: "bilattice.relation.transform";
  readonly source: RelationCarrier<SourcePoint, SourceState>;
  readonly target: RelationCarrier<TargetPoint, TargetState>;
  readonly forward: RelationForward<SourcePoint, TargetPoint>;
  readonly backward: RelationBackward<TargetState, SourceState>;
}

/**
 * A transform failure where the forward image of a source point falls outside
 * the target's point set: records the point and its out-of-domain mapped value.
 */
export interface RelationTransformForwardDomainObstruction<Point, TargetPoint> {
  readonly kind: "bilattice.relation.transform.forwardDomain-obstruction";
  readonly point: Point;
  readonly mapped: TargetPoint;
}

/**
 * A transform failure where the backward image of a target state falls outside
 * the source's state set: records the state and its out-of-domain mapped value.
 */
export interface RelationTransformBackwardDomainObstruction<State, SourceState> {
  readonly kind: "bilattice.relation.transform.backwardDomain-obstruction";
  readonly state: State;
  readonly mapped: SourceState;
}

/**
 * A transform failure where adjointness breaks at a cell: the target value at
 * (forward point, state) differs from the source value at (point, backward
 * state), recording both charge values.
 */
export interface RelationTransformAdjointnessObstruction<Point, State> {
  readonly kind: "bilattice.relation.transform.adjointness-obstruction";
  readonly point: Point;
  readonly state: State;
  readonly left: ChargeValue;
  readonly right: ChargeValue;
}

/**
 * A single transform-check failure: a forward-domain, backward-domain, or
 * adjointness obstruction.
 */
export type RelationTransformObstructionAtom<SourcePoint, SourceState, TargetPoint, TargetState> =
  | RelationTransformForwardDomainObstruction<SourcePoint, TargetPoint>
  | RelationTransformBackwardDomainObstruction<TargetState, SourceState>
  | RelationTransformAdjointnessObstruction<SourcePoint, TargetState>;

/**
 * A successful transform check: the source and target carriers together with
 * the forward and backward maps proven adjoint.
 */
export interface RelationTransformWitness<SourcePoint, SourceState, TargetPoint, TargetState> {
  readonly kind: "bilattice.relation.transform:witness";
  readonly source: RelationCarrier<SourcePoint, SourceState>;
  readonly target: RelationCarrier<TargetPoint, TargetState>;
  readonly forward: RelationForward<SourcePoint, TargetPoint>;
  readonly backward: RelationBackward<TargetState, SourceState>;
}

/**
 * A failed transform check: the source and target carriers, the list of
 * obstruction atoms, and the rank (failure count).
 */
export interface RelationTransformObstruction<SourcePoint, SourceState, TargetPoint, TargetState> {
  readonly kind: "bilattice.relation.transform-obstruction";
  readonly source: RelationCarrier<SourcePoint, SourceState>;
  readonly target: RelationCarrier<TargetPoint, TargetState>;
  readonly failures: readonly RelationTransformObstructionAtom<SourcePoint, SourceState, TargetPoint, TargetState>[];
  readonly rank: Natural;
}

/**
 * The outcome of checking a relation transform: either a
 * RelationTransformWitness or a RelationTransformObstruction.
 */
export type RelationTransformJudgment<SourcePoint, SourceState, TargetPoint, TargetState> =
  | RelationTransformWitness<SourcePoint, SourceState, TargetPoint, TargetState>
  | RelationTransformObstruction<SourcePoint, SourceState, TargetPoint, TargetState>;

/**
 * Constructs a RelationCarrier over the given points and states from a
 * cell-reading function: reads of out-of-set states yield a read-obstruction
 * with the absent value, and at collapses each cell to its charge value (the
 * absent value when obstructed).
 */
export function relation<Point, State>(
  points: EntitySet<Point>,
  states: PredicateSet<State>,
  read: RelationReadFunction<Point, State>,
  options: RelationOptions<Point, State>,
): RelationCarrier<Point, State> {
  const samePoint = options.samePoint;
  const sameState = options.sameState;
  const absent = asChargeValue(options.absent ?? chargeValue("active"));
  const carrierRead = (point: Point, state: State): RelationReadJudgment<Point, State> => {
    if (!states.predicates.some((candidate) => sameState(candidate, state))) {
      return Object.freeze({
        kind: "bilattice.relation.read-obstruction" as const,
        point,
        state,
        absent,
      });
    }
    return read(point, state);
  };
  return Object.freeze({
    kind: "bilattice.relation.carrier" as const,
    points,
    states,
    absent,
    samePoint,
    sameState,
    read: carrierRead,
    at: (point: Point, state: State): ChargeValue => {
      const reading = carrierRead(point, state);
      return reading.kind === "bilattice.relation.read:witness" ? asChargeValue(reading.value) : reading.absent;
    },
  });
}

/**
 * Builds a RelationReadWitness for a cell: a successful read of the given
 * charge value at (point, state).
 */
export function relationRead<Point, State>(
  point: Point,
  state: State,
  value: ChargeValue,
): RelationReadWitness<Point, State> {
  return Object.freeze({
    kind: "bilattice.relation.read:witness" as const,
    point,
    state,
    value: asChargeValue(value),
  });
}

/**
 * Builds a RelationReadObstruction for a cell: a failed read at (point, state)
 * carrying the given absent charge value.
 */
export function relationReadAbsence<Point, State>(
  point: Point,
  state: State,
  absent: ChargeValue,
): RelationReadObstruction<Point, State> {
  return Object.freeze({
    kind: "bilattice.relation.read-obstruction" as const,
    point,
    state,
    absent: asChargeValue(absent),
  });
}

/**
 * Builds a RelationMatrixCarrier from an iterable of (point, state, value)
 * entries: duplicate coordinates are knowledge-joined so construction is
 * order-insensitive and conflicting charges settle to stable.
 */
export function relationMatrix<Point, State>(
  points: EntitySet<Point>,
  states: PredicateSet<State>,
  entries: Iterable<readonly [point: Point, state: State, value: ChargeValue]>,
  options: Pick<RelationOptions<Point, State>, "samePoint" | "sameState">,
): RelationMatrixCarrier<Point, State> {
  const samePoint = options.samePoint;
  const sameState = options.sameState;
  const values: RelationMatrixEntry<Point, State>[] = [];
  for (const [point, state, value] of entries) {
    const existing = values.find((entry) => samePoint(entry.point, point) && sameState(entry.state, state));
    
    
    
    
    const entry = Object.freeze({
      kind: "bilattice.relation.matrixEntry" as const,
      point,
      state,
      value: existing ? joinKnowledgeValue(existing.value, asChargeValue(value)) : asChargeValue(value),
    });
    if (existing) values.splice(values.indexOf(existing), 1, entry);
    else values.push(entry);
  }
  return Object.freeze({
    kind: "bilattice.relation.matrix" as const,
    points,
    states,
    values: Object.freeze(values),
    rank: count(values),
    samePoint,
    sameState,
  });
}

/**
 * Looks up the entry at (point, state) in a relation matrix: returns a
 * matrixEntry witness when found, otherwise a matrixEntry obstruction.
 */
export function matrixEntryReading<Point, State>(
  matrix: RelationMatrixCarrier<Point, State>,
  point: Point,
  state: State,
): RelationMatrixEntryJudgment<Point, State> {
  const entry = matrix.values.find((candidate) => matrix.samePoint(candidate.point, point) && matrix.sameState(candidate.state, state));
  return entry
    ? Object.freeze({ kind: "bilattice.relation.matrixEntry:witness" as const, entry })
    : Object.freeze({ kind: "bilattice.relation.matrixEntry-obstruction" as const, point, state });
}

/**
 * Builds a RelationCarrier backed by a relation matrix: present coordinates
 * read their stored value, missing ones read the absent charge value
 * (defaulting to active).
 */
export function relationFromMatrix<Point, State>(
  matrix: RelationMatrixCarrier<Point, State>,
  options: { readonly absent?: ChargeValue } = {},
): RelationCarrier<Point, State> {
  return relation(
    matrix.points,
    matrix.states,
    (point, state) => {
      const reading = matrixEntryReading(matrix, point, state);
      return reading.kind === "bilattice.relation.matrixEntry:witness"
        ? relationRead(point, state, reading.entry.value)
        : relationReadAbsence(point, state, asChargeValue(options.absent ?? chargeValue("active")));
    },
    { ...options, samePoint: matrix.samePoint, sameState: matrix.sameState },
  );
}

/**
 * Type guard for RelationCarrier: true when the value is an object whose kind
 * is "bilattice.relation.carrier".
 */
export function isRelationCarrier(value: object): value is RelationCarrier<object, object> {
  return "kind" in value && value.kind === "bilattice.relation.carrier";
}

/**
 * Builds the PointProfileCarrier for a point: its charge value across every
 * state in the carrier.
 */
export function pointProfile<Point, State>(carrier: RelationCarrier<Point, State>, point: Point): PointProfileCarrier<Point, State> {
  const entries = Object.freeze(carrier.states.predicates.map((state) => Object.freeze({
    kind: "bilattice.relation.pointProfileEntry" as const,
    state,
    value: carrier.at(point, state),
  })));
  return Object.freeze({
    kind: "bilattice.relation.pointProfile" as const,
    point,
    entries,
    rank: count(entries),
  });
}

/**
 * Builds the StateProfileCarrier for a state: its charge value across every
 * point in the carrier.
 */
export function stateProfile<Point, State>(carrier: RelationCarrier<Point, State>, state: State): StateProfileCarrier<Point, State> {
  const entries = Object.freeze(carrier.points.entities.map((point) => Object.freeze({
    kind: "bilattice.relation.stateProfileEntry" as const,
    point,
    value: carrier.at(point, state),
  })));
  return Object.freeze({
    kind: "bilattice.relation.stateProfile" as const,
    state,
    entries,
    rank: count(entries),
  });
}

/**
 * Builds the StateExtensionCarrier for a state: the points whose value is
 * potential or stable, that is whose truth coordinate is present.
 */
export function stateExtension<Point, State>(carrier: RelationCarrier<Point, State>, state: State): StateExtensionCarrier<Point, State> {
  
  
  const points = Object.freeze(stateProfile(carrier, state).entries.filter((entry) =>
    sameChargeValue(entry.value, chargeValue("potential")) || sameChargeValue(entry.value, chargeValue("stable"))).map((entry) => entry.point));
  return Object.freeze({
    kind: "bilattice.relation.stateExtension" as const,
    state,
    points: Object.freeze({
      kind: "predication.entitySet" as const,
      entities: points,
    }),
    rank: count(points),
  });
}

/**
 * Swaps points and states of a relation: returns a carrier indexed by the
 * original states over the original points, with each cell's charge value
 * preserved.
 */
export function transpose<Point, State>(carrier: RelationCarrier<Point, State>): RelationCarrier<State, Point> {
  return relation(
    { kind: "predication.entitySet" as const, entities: carrier.states.predicates },
    { kind: "predication.predicateSet" as const, predicates: carrier.points.entities },
    (state, point) => relationRead(state, point, carrier.at(point, state)),
    { absent: carrier.absent, samePoint: carrier.sameState, sameState: carrier.samePoint },
  );
}

/**
 * Swaps points and states of a relation and negates every charge value,
 * including the absent value: returns the dual carrier.
 */
export function dual<Point, State>(carrier: RelationCarrier<Point, State>): RelationCarrier<State, Point> {
  return relation(
    { kind: "predication.entitySet" as const, entities: carrier.states.predicates },
    { kind: "predication.predicateSet" as const, predicates: carrier.points.entities },
    (state, point) => relationRead(state, point, negateValue(carrier.at(point, state))),
    { absent: negateValue(carrier.absent), samePoint: carrier.sameState, sameState: carrier.samePoint },
  );
}

/**
 * Folds a state's profile to a single charge value by reducing its cell values
 * with the given join (knowledge-join by default) from the given identity
 * (absurd by default).
 */
export function settleStateProfile<Point, State>(
  carrier: RelationCarrier<Point, State>,
  state: State,
  join: (left: ChargeValue, right: ChargeValue) => ChargeValue = joinKnowledgeValue,
  identity: ChargeValue = chargeValue("absurd"),
): ChargeValue {
  return stateProfile(carrier, state).entries.reduce((acc, entry) => join(acc, entry.value), identity);
}

/**
 * Folds a point's profile to a single charge value by reducing its cell values
 * with the given join (knowledge-join by default) from the given identity
 * (absurd by default).
 */
export function settlePointProfile<Point, State>(
  carrier: RelationCarrier<Point, State>,
  point: Point,
  join: (left: ChargeValue, right: ChargeValue) => ChargeValue = joinKnowledgeValue,
  identity: ChargeValue = chargeValue("absurd"),
): ChargeValue {
  return pointProfile(carrier, point).entries.reduce((acc, entry) => join(acc, entry.value), identity);
}

/**
 * Checks whether forward and backward form an adjoint transform from source to
 * target: reports forward/backward domain obstructions first, then per-cell
 * adjointness obstructions, returning a witness only when no failures arise.
 */
export function checkRelationTransform<SourcePoint, SourceState, TargetPoint, TargetState>(
  source: RelationCarrier<SourcePoint, SourceState>,
  target: RelationCarrier<TargetPoint, TargetState>,
  forward: RelationForward<SourcePoint, TargetPoint>,
  backward: RelationBackward<TargetState, SourceState>,
): RelationTransformJudgment<SourcePoint, SourceState, TargetPoint, TargetState> {
  const failures: RelationTransformObstructionAtom<SourcePoint, SourceState, TargetPoint, TargetState>[] = [];
  for (const point of source.points.entities) {
    const mapped = forward(point);
    if (!target.points.entities.some((candidate) => target.samePoint(candidate, mapped))) {
      failures.push(Object.freeze({ kind: "bilattice.relation.transform.forwardDomain-obstruction" as const, point, mapped }));
    }
  }
  for (const state of target.states.predicates) {
    const mapped = backward(state);
    if (!source.states.predicates.some((candidate) => source.sameState(candidate, mapped))) {
      failures.push(Object.freeze({ kind: "bilattice.relation.transform.backwardDomain-obstruction" as const, state, mapped }));
    }
  }
  if (failures.length > 0) {
    return Object.freeze({
      kind: "bilattice.relation.transform-obstruction" as const,
      source,
      target,
      failures: Object.freeze(failures),
      rank: count(failures),
    });
  }
  for (const point of source.points.entities) {
    for (const state of target.states.predicates) {
      const left = target.at(forward(point), state);
      const right = source.at(point, backward(state));
      if (!sameChargeValue(left, right)) {
        failures.push(Object.freeze({ kind: "bilattice.relation.transform.adjointness-obstruction" as const, point, state, left, right }));
      }
    }
  }
  if (failures.length > 0) {
    return Object.freeze({
      kind: "bilattice.relation.transform-obstruction" as const,
      source,
      target,
      failures: Object.freeze(failures),
      rank: count(failures),
    });
  }
  return Object.freeze({
    kind: "bilattice.relation.transform:witness" as const,
    source,
    target,
    forward,
    backward,
  });
}

/**
 * Constructs a RelationTransform after checking adjointness: throws a TypeError
 * when forward and backward are not adjoint between source and target.
 */
export function relationTransform<SourcePoint, SourceState, TargetPoint, TargetState>(
  source: RelationCarrier<SourcePoint, SourceState>,
  target: RelationCarrier<TargetPoint, TargetState>,
  forward: RelationForward<SourcePoint, TargetPoint>,
  backward: RelationBackward<TargetState, SourceState>,
): RelationTransform<SourcePoint, SourceState, TargetPoint, TargetState> {
  const check = checkRelationTransform(source, target, forward, backward);
  if (check.kind === "bilattice.relation.transform-obstruction") throw new TypeError(`relationTransform: not adjoint (${check.failures.length} violation(s))`);
  return Object.freeze({ kind: "bilattice.relation.transform" as const, source, target, forward, backward });
}

/**
 * Type guard for RelationTransform: true when the value is an object whose kind
 * is "bilattice.relation.transform".
 */
export function isRelationTransform(value: object): value is RelationTransform<object, object, object, object> {
  return "kind" in value && value.kind === "bilattice.relation.transform";
}

/**
 * The identity transform on a carrier: forward and backward are both the
 * identity map.
 */
export function idTransform<Point, State>(carrier: RelationCarrier<Point, State>): RelationTransform<Point, State, Point, State> {
  return relationTransform(carrier, carrier, (point) => point, (state) => state);
}

/**
 * Composes two transforms sharing an object (left.target must be right.source):
 * forwards compose left-then-right and backwards compose right-then-left,
 * throwing a TypeError when the objects do not match.
 */
export function composeTransforms<SourcePoint, SourceState, MiddlePoint, MiddleState, TargetPoint, TargetState>(
  left: RelationTransform<SourcePoint, SourceState, MiddlePoint, MiddleState>,
  right: RelationTransform<MiddlePoint, MiddleState, TargetPoint, TargetState>,
): RelationTransform<SourcePoint, SourceState, TargetPoint, TargetState> {
  if (left.target !== right.source) throw new TypeError("composeTransforms: left.target must be right.source");
  return relationTransform(
    left.source,
    right.target,
    (point) => right.forward(left.forward(point)),
    (state) => left.backward(right.backward(state)),
  );
}

/**
 * The dual of a transform: a transform from the dual of the target to the dual
 * of the source whose forward is the original backward and whose backward is
 * the original forward.
 */
export function dualTransform<SourcePoint, SourceState, TargetPoint, TargetState>(
  transform: RelationTransform<SourcePoint, SourceState, TargetPoint, TargetState>,
): RelationTransform<TargetState, TargetPoint, SourceState, SourcePoint> {
  return relationTransform(
    dual(transform.target),
    dual(transform.source),
    transform.backward,
    transform.forward,
  );
}
