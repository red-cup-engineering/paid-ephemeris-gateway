import { natIsZero, natZero, predecessor, successor, type Natural } from "../../../../articulating/carriers.mjs";
import { mark, type Mark } from "../../../../articulating/carriers.mjs";

/** The zero ordinal: the base point of the ordinal tower, denoting 0. */
export interface ZeroOrdinal {
  readonly kind: "ordinal.closure.ordinal.zero";
}

/**
 * A successor ordinal: wraps its immediate predecessor, denoting predecessor +
 * 1.
 */
export interface SuccessorOrdinal {
  readonly kind: "ordinal.closure.ordinal.successor";
  readonly predecessor: Ordinal;
}

/**
 * A label for a limit ordinal: carries a mark naming the limit as an opaque
 * carrier, never as a display string.
 */
export interface OrdinalLabel {
  readonly kind: "ordinal.closure.ordinalLabel";
  readonly mark: Mark;
}

/** A carrier label for canonical omega multiples. */
export interface OmegaMultipleOrdinalLabel {
  readonly kind: "ordinal.closure.omegaMultipleLabel";
  readonly multiplier: Natural;
}

/** A carrier label for omega squared. */
export interface OmegaSquaredOrdinalLabel {
  readonly kind: "ordinal.closure.omegaSquaredLabel";
}

/**
 * A limit ordinal: a labelled ordinal with a fundamental sequence mapping each
 * natural to an ordinal whose supremum is this limit.
 */
export interface LimitOrdinal {
  readonly kind: "ordinal.closure.ordinal.limit";
  readonly label: OrdinalLabel;
  readonly fundamentalSequence: (n: Natural) => Ordinal;
}

/**
 * An ordinal in the closure tower: either zero, a successor of another ordinal,
 * or a labelled limit with a fundamental sequence.
 */
export type Ordinal = ZeroOrdinal | SuccessorOrdinal | LimitOrdinal;

/**
 * Witness that an ordinal is finite: pairs the ordinal with the natural number
 * value obtained by counting its successor chain to zero.
 */
export interface FiniteOrdinalWitness {
  readonly kind: "ordinal.closure.finiteOrdinal:witness";
  readonly ordinal: Ordinal;
  readonly value: Natural;
}

/**
 * Obstruction to an ordinal being finite: pairs the ordinal with the non-zero
 * residue reached after stripping its successor prefix.
 */
export interface FiniteOrdinalObstruction {
  readonly kind: "ordinal.closure.finiteOrdinal-obstruction";
  readonly ordinal: Ordinal;
  readonly residue: Ordinal;
}

/**
 * The result of testing whether an ordinal is finite: a finite-ordinal witness
 * or an obstruction.
 */
export type FiniteOrdinalJudgment = FiniteOrdinalWitness | FiniteOrdinalObstruction;

/** The finite closure regime: the stabilization ordinal is a finite ordinal. */
export interface FiniteClosureRegime {
  readonly kind: "ordinal.closure.regime.finite";
}

/**
 * The Scott closure regime: stabilization occurs at a limit ordinal whose
 * fundamental sequence is finite, modelling closure at omega.
 */
export interface ScottClosureRegime {
  readonly kind: "ordinal.closure.regime.scott";
}

/**
 * The transfinite closure regime: stabilization occurs at a limit ordinal
 * beyond omega.
 */
export interface TransfiniteClosureRegime {
  readonly kind: "ordinal.closure.regime.transfinite";
}

/**
 * The aperiodic closure regime: the closure does not stabilize within any
 * countable bound, entering only as declared cofinality.
 */
export interface AperiodicClosureRegime {
  readonly kind: "ordinal.closure.regime.aperiodic";
}

/**
 * A closure regime in which the process stabilizes: finite, Scott, or
 * transfinite.
 */
export type StabilizingClosureRegime =
  | FiniteClosureRegime
  | ScottClosureRegime
  | TransfiniteClosureRegime;

/**
 * A closure regime: either a stabilizing regime (finite, Scott, transfinite) or
 * the aperiodic regime.
 */
export type ClosureRegime = StabilizingClosureRegime | AperiodicClosureRegime;

/**
 * A lattice over T: carries a bottom element, an order test leq, a binary join,
 * an equality test eq, and a supremum sup over a sequence of elements.
 */
export interface Lattice<T> {
  readonly bottom: T;
  readonly leq: (left: T, right: T) => boolean;
  readonly join: (left: T, right: T) => T;
  readonly eq: (left: T, right: T) => boolean;
  readonly sup: (sequence: (n: Natural) => T) => T;
}

/** The regime judgment lives on `search`: a witness carries its stabilizing
 *  regime; an obstruction carries no regime claim at all — exhausting the
 *  bounded horizon witnesses nothing about κ beyond `searchedThrough`. */
export interface ClosureCarrier<T> {
  readonly kind: "ordinal.closure.carrier";
  readonly process: ClosureProcessCarrier<T>;
  readonly value: T;
  readonly orbit: readonly ClosureOrbitPoint<T>[];
  readonly search: ClosureStabilizationSearchJudgment<T>;
  readonly stabilization: ClosureStabilizationJudgment<T>;
}

/**
 * A closure process: a lattice, a monotone endomorphism over it, and the search
 * horizon bounding the stabilization search.
 */
export interface ClosureProcessCarrier<T> {
  readonly kind: "ordinal.closure.process";
  readonly lattice: Lattice<T>;
  readonly endomorphism: (value: T) => T;
  readonly horizon: ClosureStabilizationSearchHorizon;
}

/**
 * A point on the closure orbit: the ordinal stage paired with the approximant
 * value reached at that stage.
 */
export interface ClosureOrbitPoint<T> {
  readonly kind: "ordinal.closure.orbitPoint";
  readonly stage: Ordinal;
  readonly value: T;
}

/**
 * Witness that the closure stabilizes at an ordinal: the ordinal, the
 * approximant value there, and its equal successor value.
 */
export interface ClosureStabilizationWitness<T> {
  readonly kind: "ordinal.closure.stabilization:witness";
  readonly ordinal: Ordinal;
  readonly value: T;
  readonly successor: T;
}

/**
 * Obstruction to closure stabilization: the ordinal searched through plus the
 * still-differing value and successor value at that bound.
 */
export interface ClosureStabilizationObstruction<T> {
  readonly kind: "ordinal.closure.stabilization-obstruction";
  readonly searchedThrough: Ordinal;
  readonly value: T;
  readonly successor: T;
}

/**
 * The result of testing stabilization at one ordinal: a stabilization witness
 * or an obstruction.
 */
export type ClosureStabilizationJudgment<T> = ClosureStabilizationWitness<T> | ClosureStabilizationObstruction<T>;

/**
 * Witness that the bounded search found stabilization: the stabilizing ordinal,
 * its classified regime, and the underlying stabilization witness.
 */
export interface ClosureStabilizationSearchWitness<T> {
  readonly kind: "ordinal.closure.stabilizationSearch:witness";
  readonly ordinal: Ordinal;
  readonly regime: StabilizingClosureRegime;
  readonly stabilization: ClosureStabilizationWitness<T>;
}

/**
 * Obstruction from the bounded search: the ordinal searched through and the
 * stabilization obstruction at the horizon, claiming no regime.
 */
export interface ClosureStabilizationSearchObstruction<T> {
  readonly kind: "ordinal.closure.stabilizationSearch-obstruction";
  readonly searchedThrough: Ordinal;
  readonly stabilization: ClosureStabilizationObstruction<T>;
}

/**
 * The result of the bounded stabilization search: a search witness carrying a
 * regime, or a search obstruction.
 */
export type ClosureStabilizationSearchJudgment<T> =
  | ClosureStabilizationSearchWitness<T>
  | ClosureStabilizationSearchObstruction<T>;

/**
 * The bound on the stabilization search: the number of finite stages probed per
 * block and the number of limit blocks searched.
 */
export interface ClosureStabilizationSearchHorizon {
  readonly kind: "ordinal.closure.stabilizationSearchHorizon";
  readonly finiteStages: Natural;
  readonly limitBlocks: Natural;
}

/**
 * One block of the stabilization search: a base ordinal and the count of finite
 * stages to probe above it.
 */
export interface ClosureSearchBlock {
  readonly kind: "ordinal.closure.searchBlock";
  readonly base: Ordinal;
  readonly finiteStages: Natural;
}

const naturalFromInternalBound = (bound: number): Natural => {
  let value = natZero;
  for (let index = 0; index < bound; index += 1) value = successor(value);
  return value;
};

const two = naturalFromInternalBound(2);
const defaultFiniteStages = naturalFromInternalBound(64);
const defaultLimitBlocks = naturalFromInternalBound(4);

const omegaMultipleOrdinalLabel = (multiplier: Natural): OmegaMultipleOrdinalLabel => Object.freeze({
  kind: "ordinal.closure.omegaMultipleLabel" as const,
  multiplier,
});

const omegaSquaredOrdinalLabel = (): OmegaSquaredOrdinalLabel => Object.freeze({
  kind: "ordinal.closure.omegaSquaredLabel" as const,
});

/** The zero ordinal. */
export const zeroOrdinal: ZeroOrdinal = Object.freeze({ kind: "ordinal.closure.ordinal.zero" as const });
/** Constructs the successor of the given ordinal. */
export const successorOrdinal = (predecessorOrdinal: Ordinal): SuccessorOrdinal => Object.freeze({
  kind: "ordinal.closure.ordinal.successor" as const,
  predecessor: predecessorOrdinal,
});
/** Constructs an ordinal label wrapping the given mark. */
export const ordinalLabel = (label: Mark): OrdinalLabel => Object.freeze({
  kind: "ordinal.closure.ordinalLabel" as const,
  mark: label,
});
/**
 * Constructs a limit ordinal from a label and a fundamental sequence of
 * ordinals.
 */
export const limitOrdinal = (label: OrdinalLabel, fundamentalSequence: (n: Natural) => Ordinal): LimitOrdinal => Object.freeze({
  kind: "ordinal.closure.ordinal.limit" as const,
  label,
  fundamentalSequence,
});

/**
 * Builds the finite ordinal of value n by applying successor to zero n times.
 */
export const finiteOrdinal = (n: Natural): Ordinal => {
  let ordinal: Ordinal = zeroOrdinal;
  for (const _member of n.members) ordinal = successorOrdinal(ordinal);
  return ordinal;
};

/**
 * Returns the ordinal obtained by applying successor to the given ordinal n
 * times.
 */
export const ordinalPlusFinite = (ordinal: Ordinal, n: Natural): Ordinal => {
  let out = ordinal;
  for (const _member of n.members) out = successorOrdinal(out);
  return out;
};

/**
 * Constructs omega: the limit ordinal whose fundamental sequence enumerates the
 * finite ordinals.
 */
export const omegaOrdinal = (): Ordinal => limitOrdinal(ordinalLabel(mark(omegaMultipleOrdinalLabel(successor(natZero)))), (n) => finiteOrdinal(n));
/**
 * Constructs omega times k: zero when k is zero, otherwise the limit whose
 * fundamental sequence adds finite stages to omega times (k - 1).
 */
export const omegaMultipleOrdinal = (k: Natural): Ordinal => natIsZero(k)
  ? zeroOrdinal
  : limitOrdinal(
    ordinalLabel(mark(omegaMultipleOrdinalLabel(k))),
    (n) => ordinalPlusFinite(omegaMultipleOrdinal(predecessor(k)), n),
  );
/**
 * Constructs omega squared: the limit ordinal whose fundamental sequence
 * enumerates the omega multiples.
 */
export const omegaSquaredOrdinal = (): Ordinal => limitOrdinal(ordinalLabel(mark(omegaSquaredOrdinalLabel())), (n) => omegaMultipleOrdinal(n));
/** Type guard: tests whether an ordinal is the zero ordinal. */
export const isZeroOrdinal = (ordinal: Ordinal): ordinal is ZeroOrdinal =>
  ordinal.kind === "ordinal.closure.ordinal.zero";
/** Type guard: tests whether an ordinal is a successor ordinal. */
export const isSuccessorOrdinal = (ordinal: Ordinal): ordinal is SuccessorOrdinal =>
  ordinal.kind === "ordinal.closure.ordinal.successor";
/** Type guard: tests whether an ordinal is a limit ordinal. */
export const isLimitOrdinal = (ordinal: Ordinal): ordinal is LimitOrdinal =>
  ordinal.kind === "ordinal.closure.ordinal.limit";

/** The finite closure regime value. */
export const finiteClosureRegime: FiniteClosureRegime = Object.freeze({
  kind: "ordinal.closure.regime.finite" as const,
});

/** The Scott closure regime value. */
export const scottClosureRegime: ScottClosureRegime = Object.freeze({
  kind: "ordinal.closure.regime.scott" as const,
});

/** The transfinite closure regime value. */
export const transfiniteClosureRegime: TransfiniteClosureRegime = Object.freeze({
  kind: "ordinal.closure.regime.transfinite" as const,
});

/** The aperiodic closure regime value. */
export const aperiodicClosureRegime: AperiodicClosureRegime = Object.freeze({
  kind: "ordinal.closure.regime.aperiodic" as const,
});

/**
 * Constructs a stabilization search horizon from a count of finite stages and a
 * count of limit blocks.
 */
export const closureStabilizationSearchHorizon = (
  finiteStages: Natural,
  limitBlocks: Natural,
): ClosureStabilizationSearchHorizon => Object.freeze({
  kind: "ordinal.closure.stabilizationSearchHorizon" as const,
  finiteStages,
  limitBlocks,
});

/**
 * Constructs a closure process from a lattice and an endomorphism, defaulting
 * the horizon to 64 finite stages over 4 limit blocks.
 */
export const closureProcess = <T,>(
  lattice: Lattice<T>,
  endomorphism: (value: T) => T,
  horizon: ClosureStabilizationSearchHorizon = closureStabilizationSearchHorizon(defaultFiniteStages, defaultLimitBlocks),
): ClosureProcessCarrier<T> => Object.freeze({
  kind: "ordinal.closure.process" as const,
  lattice,
  endomorphism,
  horizon,
});

/**
 * Constructs a search block from a base ordinal and a count of finite stages to
 * probe above it.
 */
export const closureSearchBlock = (
  base: Ordinal,
  finiteStages: Natural,
): ClosureSearchBlock => Object.freeze({
  kind: "ordinal.closure.searchBlock" as const,
  base,
  finiteStages,
});

/**
 * Builds the ordered search blocks for a horizon: a finite block based at zero,
 * then one block based at each omega multiple up to the limit-block count.
 */
export function closureSearchBlocks(horizon: ClosureStabilizationSearchHorizon): readonly ClosureSearchBlock[] {
  
  
  return Object.freeze([
    closureSearchBlock(zeroOrdinal, horizon.finiteStages),
    ...horizon.limitBlocks.members.map((member) =>
      closureSearchBlock(omegaMultipleOrdinal(successor(member)), horizon.finiteStages)),
  ]);
}

/**
 * Tests whether an ordinal is finite by stripping its successor chain: returns
 * a witness with the counted value if it reaches zero, otherwise an obstruction
 * carrying the non-zero residue.
 */
export function finiteOrdinalJudgment(ordinal: Ordinal): FiniteOrdinalJudgment {
  let current = ordinal;
  let value = natZero;
  while (current.kind === "ordinal.closure.ordinal.successor") {
    value = successor(value);
    current = current.predecessor;
  }
  return current.kind === "ordinal.closure.ordinal.zero"
    ? Object.freeze({
      kind: "ordinal.closure.finiteOrdinal:witness" as const,
      ordinal,
      value,
    })
    : Object.freeze({
      kind: "ordinal.closure.finiteOrdinal-obstruction" as const,
      ordinal,
      residue: current,
    });
}

function approx<T>(
  lattice: Lattice<T>,
  phi: (value: T) => T,
  ordinal: Ordinal,
): T {
  switch (ordinal.kind) {
    case "ordinal.closure.ordinal.zero":
      return lattice.bottom;
    case "ordinal.closure.ordinal.successor":
      return phi(approx(lattice, phi, ordinal.predecessor));
    case "ordinal.closure.ordinal.limit":
      return lattice.sup((n) => approx(lattice, phi, ordinal.fundamentalSequence(n)));
  }
}

/**
 * Computes the closure approximant of a process at an ordinal stage: bottom at
 * zero, the endomorphism applied at a successor, and the lattice supremum of
 * the fundamental sequence at a limit.
 */
export const closureApproximant = <T,>(
  process: ClosureProcessCarrier<T>,
  ordinal: Ordinal,
): T => approx(process.lattice, process.endomorphism, ordinal);

function* closureOrbit<T>(lattice: Lattice<T>, phi: (value: T) => T): Generator<ClosureOrbitPoint<T>> {
  let value = lattice.bottom;
  let stage: Ordinal = zeroOrdinal;
  yield closureOrbitPoint(stage, value);
  for (;;) {
    value = phi(value);
    stage = successorOrdinal(stage);
    yield closureOrbitPoint(stage, value);
  }
}

/**
 * Generates the closure orbit of a process: the infinite sequence of orbit
 * points obtained by iterating the endomorphism from bottom, stage by stage.
 */
export function* closureOrbitOfProcess<T>(process: ClosureProcessCarrier<T>): Generator<ClosureOrbitPoint<T>> {
  yield* closureOrbit(process.lattice, process.endomorphism);
}

const closureOrbitPoint = <T,>(stage: Ordinal, value: T): ClosureOrbitPoint<T> => Object.freeze({
  kind: "ordinal.closure.orbitPoint" as const,
  stage,
  value,
});

/**
 * Builds a supremum operator from a lattice equality test: returns the first
 * sequence value equal to its predecessor, assuming the sequence eventually
 * stabilizes.
 */
export const stabilizingSup = <T,>(lattice: Pick<Lattice<T>, "eq">) => (sequence: (n: Natural) => T): T => {
  let previous = sequence(natZero);
  for (let index = successor(natZero); ; index = successor(index)) {
    const current = sequence(index);
    if (lattice.eq(current, previous)) return current;
    previous = current;
  }
};

/**
 * Classifies the stabilizing regime of an ordinal: finite for a finite ordinal,
 * Scott for a limit whose fundamental sequence is finite, otherwise
 * transfinite.
 */
export function closureRegimeOfOrdinal(ordinal: Ordinal): StabilizingClosureRegime {
  const finite = finiteOrdinalJudgment(ordinal);
  if (finite.kind === "ordinal.closure.finiteOrdinal:witness") return finiteClosureRegime;
  if (
    ordinal.kind === "ordinal.closure.ordinal.limit"
    && finiteOrdinalJudgment(ordinal.fundamentalSequence(two)).kind === "ordinal.closure.finiteOrdinal:witness"
  ) return scottClosureRegime;
  return transfiniteClosureRegime;
}

/**
 * Tests whether a process stabilizes at an ordinal: compares the approximant
 * there to its successor approximant, returning a stabilization witness when
 * equal and an obstruction otherwise.
 */
export function closureStabilizationAt<T>(
  process: ClosureProcessCarrier<T>,
  ordinal: Ordinal,
): ClosureStabilizationJudgment<T> {
  const value = closureApproximant(process, ordinal);
  const successorValue = closureApproximant(process, successorOrdinal(ordinal));
  return process.lattice.eq(successorValue, value)
    ? Object.freeze({
      kind: "ordinal.closure.stabilization:witness" as const,
      ordinal,
      value,
      successor: successorValue,
    })
    : Object.freeze({
      kind: "ordinal.closure.stabilization-obstruction" as const,
      searchedThrough: ordinal,
      value,
      successor: successorValue,
    });
}

/**
 * Runs the bounded stabilization search over a process: iterates the finite
 * block recording the orbit, then probes each search block, returning a closure
 * carrier whose search is a witness if it stabilizes within the horizon or an
 * obstruction if it does not.
 */
export function closeOrdinalProcess<T>(process: ClosureProcessCarrier<T>): ClosureCarrier<T> {
  const at = (ordinal: Ordinal): T => closureApproximant(process, ordinal);
  const orbit: ClosureOrbitPoint<T>[] = [];

  const closeAt = (stabilization: ClosureStabilizationWitness<T>): ClosureCarrier<T> => {
    const regime = closureRegimeOfOrdinal(stabilization.ordinal);
    const search: ClosureStabilizationSearchWitness<T> = Object.freeze({
      kind: "ordinal.closure.stabilizationSearch:witness" as const,
      ordinal: stabilization.ordinal,
      regime,
      stabilization,
    });
    return Object.freeze({
      kind: "ordinal.closure.carrier" as const,
      process,
      value: stabilization.value,
      orbit: Object.freeze(orbit),
      search,
      stabilization,
    });
  };
  const closeWitness = (stabilization: ClosureStabilizationJudgment<T>): ClosureCarrier<T> | undefined => {
    switch (stabilization.kind) {
      case "ordinal.closure.stabilization:witness":
        return closeAt(stabilization);
    }
  };

  
  
  
  
  {
    let value = process.lattice.bottom;
    let ordinal: Ordinal = zeroOrdinal;
    orbit.push(closureOrbitPoint(ordinal, value));
    for (const _stage of process.horizon.finiteStages.members) {
      const successorValue = process.endomorphism(value);
      if (process.lattice.eq(successorValue, value)) {
        return closeAt(Object.freeze({
          kind: "ordinal.closure.stabilization:witness" as const,
          ordinal,
          value,
          successor: successorValue,
        }));
      }
      ordinal = successorOrdinal(ordinal);
      value = successorValue;
      orbit.push(closureOrbitPoint(ordinal, value));
    }
  }

  for (const block of closureSearchBlocks(process.horizon)) {
    const base = block.base;
    switch (base.kind) {
      case "ordinal.closure.ordinal.zero":
        continue;
      case "ordinal.closure.ordinal.limit": {
        const closed = closeWitness(closureStabilizationAt(process, base));
        if (closed) return closed;
        break;
      }
    }
    for (const member of block.finiteStages.members) {
      const closed = closeWitness(closureStabilizationAt(process, ordinalPlusFinite(base, member)));
      if (closed) return closed;
    }
  }
  const omegaSquare = omegaSquaredOrdinal();
  const omegaSquareClosure = closeWitness(closureStabilizationAt(process, omegaSquare));
  if (omegaSquareClosure) return omegaSquareClosure;
  const searchedThrough = omegaMultipleOrdinal(successor(process.horizon.limitBlocks));
  const value = at(searchedThrough);
  const stabilization: ClosureStabilizationObstruction<T> = Object.freeze({
    kind: "ordinal.closure.stabilization-obstruction" as const,
    searchedThrough,
    value,
    successor: at(successorOrdinal(searchedThrough)),
  });
  
  
  
  
  const search: ClosureStabilizationSearchObstruction<T> = Object.freeze({
    kind: "ordinal.closure.stabilizationSearch-obstruction" as const,
    searchedThrough,
    stabilization,
  });
  return Object.freeze({
    kind: "ordinal.closure.carrier" as const,
    process,
    value,
    orbit: Object.freeze(orbit),
    search,
    stabilization,
  });
}
