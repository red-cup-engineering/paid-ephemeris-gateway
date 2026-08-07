import {
  entitySet,
  isCell,
  type Cell,
  type EntitySet,
  type PredicationSite,
  type PredicationPredicate,
  type PredicationTerm,
} from "../../../articulating/carriers.mjs";
import {
  predicationCellCoincidenceHolds,
  predicationPredicateCoincidenceHolds,
  predicationTermCoincidenceHolds,
} from "../../../articulating/carriers.mjs";
import type { ChargeCarrier, ChargeValue } from "../../../articulating/carriers.mjs";
import {
  bottom,
  charge,
  chargeValue,
  isCharge,
  joinKnowledge,
  joinKnowledgeValue,
  joinTruthValue,
  meetKnowledgeValue,
  meetTruthValue,
  sameChargeValue,
  valueOf,
  witnessedPotential,
} from "../../../articulating/carriers.mjs";
import { linearFusionValue, linearResiduumValue } from "../../../articulating/predicating/logic.mjs";
import { presheaf, type PositPresheaf } from "./settling/sheaf.mjs";

/**
 * A single charged assignment within a fiber: binds one predication cell to a
 * charge carrier.
 */
export interface Meme {
  readonly kind: "predication.fiber.meme";
  readonly cell: Cell;
  readonly charge: ChargeCarrier;
}

/**
 * The fiber over one predicate: its label, the entity set ranged over by
 * subject and object terms, and the list of charged cell assignments (memes)
 * for that predicate.
 */
export interface FiberAlgebra {
  readonly kind: "predication.fiber.algebra";
  readonly predicate: PredicationPredicate;
  readonly entities: EntitySet<PredicationTerm>;
  readonly assignments: readonly Meme[];
}

/**
 * A valuation of a predication: the base of the underlying predication site
 * together with one fiber algebra per predicate.
 */
export interface Valuation {
  readonly kind: "predication.fiber.valuation";
  readonly base: PredicationSite["base"];
  readonly fibers: readonly FiberAlgebra[];
}

/** A predication site paired with its fibered valuation. */
export interface FiberCarrier {
  readonly kind: "predication.fiber.carrier";
  readonly predication: PredicationSite;
  readonly valuation: Valuation;
}

/**
 * The name of one of the two lattice orders on charge values: "knowledge" or
 * "truth".
 */
export type OrderName = "knowledge" | "truth";

/**
 * A bounded lattice order on charge values: its name, the join and meet
 * operations, and the bottom and top elements under that order.
 */
export interface Order {
  readonly kind: "predication.fiber.order";
  readonly name: OrderName;
  readonly join: (left: ChargeValue, right: ChargeValue) => ChargeValue;
  readonly meet: (left: ChargeValue, right: ChargeValue) => ChargeValue;
  readonly bottom: ChargeValue;
  readonly top: ChargeValue;
}

/**
 * The knowledge order on charge values: joins and meets by knowledge, with
 * "absurd" as bottom and "stable" as top.
 */
export function knowledgeOrder(): Order {
  return Object.freeze({
    kind: "predication.fiber.order" as const,
    name: "knowledge" as const,
    join: joinKnowledgeValue,
    meet: meetKnowledgeValue,
    bottom: chargeValue("absurd"),
    top: chargeValue("stable"),
  });
}

/**
 * The truth order on charge values: joins and meets by truth, with "active" as
 * bottom and "potential" as top.
 */
export function truthOrder(): Order {
  return Object.freeze({
    kind: "predication.fiber.order" as const,
    name: "truth" as const,
    join: joinTruthValue,
    meet: meetTruthValue,
    bottom: chargeValue("active"),
    top: chargeValue("potential"),
  });
}

/**
 * A cell within a predicate fiber: an ordered pair of a subject term and an
 * object term.
 */
export type PredicateFiberCell = readonly [subject: PredicationTerm, object: PredicationTerm];

/**
 * Evidence that two predicate fiber cells coincide: holds both cells whose
 * subject and object terms are pairwise coincident.
 */
export interface PredicateFiberCellIdentityWitness {
  readonly kind: "predication.fiber.cellIdentity:witness";
  readonly left: PredicateFiberCell;
  readonly right: PredicateFiberCell;
}

/**
 * Evidence that two predicate fiber cells fail to coincide: holds the two
 * non-coincident cells.
 */
export interface PredicateFiberCellIdentityObstruction {
  readonly kind: "predication.fiber.cellIdentity-obstruction";
  readonly left: PredicateFiberCell;
  readonly right: PredicateFiberCell;
}

/**
 * The result of comparing two predicate fiber cells: either a coincidence
 * witness or an obstruction.
 */
export type PredicateFiberCellIdentityJudgment = PredicateFiberCellIdentityWitness | PredicateFiberCellIdentityObstruction;

const predicateFiberCellsCoincide = (left: PredicateFiberCell, right: PredicateFiberCell): boolean =>
  predicationTermCoincidenceHolds(left[0], right[0]) && predicationTermCoincidenceHolds(left[1], right[1]);

/**
 * Compares two predicate fiber cells by term coincidence: returns a witness
 * when both terms coincide, otherwise an obstruction.
 */
export function predicateFiberCellIdentity(left: PredicateFiberCell, right: PredicateFiberCell): PredicateFiberCellIdentityJudgment {
  return predicateFiberCellsCoincide(left, right)
    ? Object.freeze({ kind: "predication.fiber.cellIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "predication.fiber.cellIdentity-obstruction" as const, left, right });
}

/**
 * A predicate fiber: a labelled predicate over an entity set, a list of cells,
 * and an "at" reader giving the charge value at each subject/object pair. The
 * optional "chargeAt" reader yields the full charge carrier, present only on
 * fibers projected straight from an algebra.
 */
export interface PredicateFiber {
  readonly kind: "predication.fiber.predicate";
  readonly label: PredicationPredicate;
  readonly entities: EntitySet<PredicationTerm>;
  readonly cells: readonly PredicateFiberCell[];
  readonly at: (subject: PredicationTerm, object: PredicationTerm) => ChargeValue;
  
  
  
  
  readonly chargeAt?: (subject: PredicationTerm, object: PredicationTerm) => ChargeCarrier;
}

/**
 * The kind of fiber generator: "specialization", "converse",
 * "subject-projection", or "object-projection".
 */
export type GeneratorKind = "specialization" | "converse" | "subject-projection" | "object-projection";

/**
 * A morphism between predicate fibers: its generator kind, domain and codomain
 * cell sets, and the pullback, exists, and forall transforms that move a fiber
 * along it.
 */
export interface FiberGenerator {
  readonly kind: "predication.fiber.generator";
  readonly generator: GeneratorKind;
  readonly domain: readonly PredicateFiberCell[];
  readonly codomain: readonly PredicateFiberCell[];
  readonly pullback: (fiber: PredicateFiber) => PredicateFiber;
  readonly exists: (order: Order, fiber: PredicateFiber) => PredicateFiber;
  readonly forall: (order: Order, fiber: PredicateFiber) => PredicateFiber;
}

/**
 * Constructs a meme: a frozen assignment binding a predication cell to a charge
 * carrier.
 */
export function meme(cell: Cell, charge: ChargeCarrier): Meme {
  return Object.freeze({ kind: "predication.fiber.meme" as const, cell, charge });
}

/**
 * Type guard for Meme: true when the value carries the meme kind tag and holds
 * a cell and a charge.
 */
export function isMeme(value: object): value is Meme {
  const kind = "kind" in value ? value.kind : undefined;
  const cell = "cell" in value ? value.cell : undefined;
  const charge = "charge" in value ? value.charge : undefined;
  return kind === "predication.fiber.meme"
    && typeof cell === "object"
    && cell !== null
    && typeof charge === "object"
    && charge !== null
    && isCell(cell)
    && isCharge(charge);
}

/**
 * The full grid of predicate fiber cells over an entity set: every ordered
 * subject/object pair drawn from the entities.
 */
export function allCells(entities: EntitySet<PredicationTerm>): readonly PredicateFiberCell[] {
  return Object.freeze(entities.entities.flatMap((subject) => entities.entities.map((object) => Object.freeze([subject, object] as const))));
}

/**
 * Builds a predicate fiber from a label, entity set, and a charge-value reader,
 * materializing the value at each cell. Defaults to all cells, and attaches the
 * optional charge-carrier reader when one is supplied; the "at" reader returns
 * "absurd" for cells outside the fiber.
 */
export function predicateFiber(
  label: PredicationPredicate,
  entities: EntitySet<PredicationTerm>,
  read: (subject: PredicationTerm, object: PredicationTerm) => ChargeValue,
  cells: readonly PredicateFiberCell[] = allCells(entities),
  readCharge?: (subject: PredicationTerm, object: PredicationTerm) => ChargeCarrier,
): PredicateFiber {
  const values = cells.map((fiberCell) => Object.freeze({
    cell: fiberCell,
    value: read(fiberCell[0], fiberCell[1]),
  }));
  const at = (subject: PredicationTerm, object: PredicationTerm): ChargeValue =>
    values.find((entry) => predicateFiberCellsCoincide(entry.cell, [subject, object]))?.value ?? chargeValue("absurd");
  return Object.freeze(readCharge === undefined
    ? {
      kind: "predication.fiber.predicate" as const,
      label,
      entities,
      cells: Object.freeze([...cells]),
      at,
    }
    : {
      kind: "predication.fiber.predicate" as const,
      label,
      entities,
      cells: Object.freeze([...cells]),
      at,
      chargeAt: readCharge,
    });
}

/**
 * Projects a fiber algebra into a predicate fiber, reading each cell's charge
 * from the algebra's assignments and falling back to "absurd" for unassigned
 * cells.
 */
export function fiberFromAlgebra(algebra: FiberAlgebra): PredicateFiber {
  const entities = algebra.entities;
  const entries = algebra.assignments.map((assignment) => Object.freeze({
    cell: Object.freeze([assignment.cell.subject, assignment.cell.object] as const),
    charge: assignment.charge,
  }));
  const chargeOf = (subject: PredicationTerm, object: PredicationTerm): ChargeCarrier =>
    entries.find((entry) => predicateFiberCellsCoincide(entry.cell, [subject, object]))?.charge ?? charge(chargeValue("absurd"));
  return predicateFiber(
    algebra.predicate,
    entities,
    (subject, object) => valueOf(chargeOf(subject, object)),
    allCells(entities),
    chargeOf,
  );
}

function cellwiseLinear(
  operation: (left: ChargeValue, right: ChargeValue) => ChargeValue,
  left: PredicateFiber,
  right: PredicateFiber,
  cells: readonly PredicateFiberCell[] = left.cells,
): PredicateFiber {
  return predicateFiber(
    left.label,
    left.entities,
    (subject, object) => operation(left.at(subject, object), right.at(subject, object)),
    cells,
  );
}

function samePredicateFiber(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): boolean {
  return cells.every(([subject, object]) => sameChargeValue(left.at(subject, object), right.at(subject, object)));
}

/**
 * The cellwise linear fusion of two predicate fibers: applies linear fusion to
 * the charge values of the two fibers at each cell.
 */
export function predicationFiberLinearFusion(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): PredicateFiber {
  return cellwiseLinear(linearFusionValue, left, right, cells);
}

/**
 * The cellwise linear residuum of two predicate fibers: applies linear residuum
 * to the charge values of the two fibers at each cell.
 */
export function predicationFiberLinearResiduum(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): PredicateFiber {
  return cellwiseLinear(linearResiduumValue, left, right, cells);
}

/**
 * Tests whether the left fiber is below the right under the truth order: true
 * when, at every cell, the truth join of the two values equals the right value.
 */
export function leqTruthPredicateFiber(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): boolean {
  const order = truthOrder();
  return cells.every(([subject, object]) => sameChargeValue(order.join(left.at(subject, object), right.at(subject, object)), right.at(subject, object)));
}

/**
 * Tests whether a generator's pullback commutes with linear fusion: true when
 * pulling back the fusion equals the fusion of the pullbacks over the
 * generator's codomain.
 */
export function generatorPreservesLinearFusion(generator: FiberGenerator, left: PredicateFiber, right: PredicateFiber): boolean {
  const pulledFusion = generator.pullback(predicationFiberLinearFusion(left, right, generator.domain));
  const fusionOfPullbacks = predicationFiberLinearFusion(generator.pullback(left), generator.pullback(right), generator.codomain);
  return samePredicateFiber(pulledFusion, fusionOfPullbacks, generator.codomain);
}

/**
 * Tests whether a generator's pullback commutes with linear residuum: true when
 * pulling back the residuum equals the residuum of the pullbacks over the
 * generator's codomain.
 */
export function generatorPreservesLinearResiduum(generator: FiberGenerator, left: PredicateFiber, right: PredicateFiber): boolean {
  const pulledResiduum = generator.pullback(predicationFiberLinearResiduum(left, right, generator.domain));
  const residuumOfPullbacks = predicationFiberLinearResiduum(generator.pullback(left), generator.pullback(right), generator.codomain);
  return samePredicateFiber(pulledResiduum, residuumOfPullbacks, generator.codomain);
}

/**
 * Tests the Frobenius reciprocity law for a generator over an order: true when
 * exists of the fusion of a pulled-back alpha with phi equals the fusion of
 * alpha with exists of phi, over the generator's domain.
 */
export function generatorSatisfiesLinearFusionFrobenius(
  generator: FiberGenerator,
  order: Order,
  alpha: PredicateFiber,
  phi: PredicateFiber,
): boolean {
  const left = generator.exists(order, predicationFiberLinearFusion(generator.pullback(alpha), phi, generator.codomain));
  const right = predicationFiberLinearFusion(alpha, generator.exists(order, phi), generator.domain);
  return samePredicateFiber(left, right, generator.domain);
}

const foldJoin = (order: Order, values: readonly ChargeValue[]): ChargeValue =>
  values.reduce((acc, item) => order.join(acc, item), order.bottom);

const foldMeet = (order: Order, values: readonly ChargeValue[]): ChargeValue =>
  values.reduce((acc, item) => order.meet(acc, item), order.top);

/**
 * The converse generator over an entity set: swaps subject and object at each
 * cell. Its pullback, exists, and forall all read the source fiber transposed.
 */
export function converse(entities: EntitySet): FiberGenerator {
  const cells = allCells(entities);
  return Object.freeze({
    kind: "predication.fiber.generator" as const,
    generator: "converse" as const,
    domain: cells,
    codomain: cells,
    pullback: (source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) => source.at(object, subject), cells),
    exists: (_order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) => source.at(object, subject), cells),
    forall: (_order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) => source.at(object, subject), cells),
  });
}

/**
 * The subject-projection generator over an entity set: pullback reads the
 * diagonal cell for each subject, while exists and forall fold the join or meet
 * over all objects onto diagonal cells, leaving off-diagonal cells at the
 * order's bottom or top.
 */
export function subjectProjection(entities: EntitySet): FiberGenerator {
  const cells = allCells(entities);
  return Object.freeze({
    kind: "predication.fiber.generator" as const,
    generator: "subject-projection" as const,
    domain: cells,
    codomain: cells,
    pullback: (source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject) => source.at(subject, subject), cells),
    exists: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      predicationTermCoincidenceHolds(subject, object) ? foldJoin(order, source.entities.entities.map((item) => source.at(subject, item))) : order.bottom, cells),
    forall: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      predicationTermCoincidenceHolds(subject, object) ? foldMeet(order, source.entities.entities.map((item) => source.at(subject, item))) : order.top, cells),
  });
}

/**
 * The object-projection generator over an entity set: pullback reads the
 * diagonal cell for each object, while exists and forall fold the join or meet
 * over all subjects onto diagonal cells, leaving off-diagonal cells at the
 * order's bottom or top.
 */
export function objectProjection(entities: EntitySet): FiberGenerator {
  const cells = allCells(entities);
  return Object.freeze({
    kind: "predication.fiber.generator" as const,
    generator: "object-projection" as const,
    domain: cells,
    codomain: cells,
    pullback: (source: PredicateFiber) => predicateFiber(source.label, source.entities, (_subject, object) => source.at(object, object), cells),
    exists: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      predicationTermCoincidenceHolds(subject, object) ? foldJoin(order, source.entities.entities.map((item) => source.at(item, object))) : order.bottom, cells),
    forall: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      predicationTermCoincidenceHolds(subject, object) ? foldMeet(order, source.entities.entities.map((item) => source.at(item, object))) : order.top, cells),
  });
}

/**
 * The specialization generator restricting from an ambient cell set to a
 * support subset: pullback reads the source on the support, while exists and
 * forall keep source values on support cells and fill the rest with the order's
 * bottom or top across the ambient cells.
 */
export function specialization(
  entities: EntitySet,
  support: readonly PredicateFiberCell[],
  ambient: readonly PredicateFiberCell[] = allCells(entities),
): FiberGenerator {
  return Object.freeze({
    kind: "predication.fiber.generator" as const,
    generator: "specialization" as const,
    domain: ambient,
    codomain: Object.freeze([...support]),
    pullback: (source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) => source.at(subject, object), support),
    exists: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      support.some((cell) => predicateFiberCellsCoincide(cell, [subject, object])) ? source.at(subject, object) : order.bottom, ambient),
    forall: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      support.some((cell) => predicateFiberCellsCoincide(cell, [subject, object])) ? source.at(subject, object) : order.top, ambient),
  });
}

/**
 * Builds the fibered valuation carrier from a predication site: one fiber
 * algebra per predicate, with each of that predicate's cells assigned the
 * witnessed potential of its subject.
 */
export function fiberCarrier(predication: PredicationSite): FiberCarrier {
  const fibers = predication.cells.predicates.predicates.map((predicate) => {
    const cells = predication.cells.cells
      .filter((c) => predicationPredicateCoincidenceHolds(c.predicate, predicate))
      .map((c) => meme(c, witnessedPotential(c.subject.mark)));
    return Object.freeze({
      kind: "predication.fiber.algebra" as const,
      predicate,
      entities: predication.cells.entities,
      assignments: Object.freeze(cells),
    });
  });
  return Object.freeze({
    kind: "predication.fiber.carrier" as const,
    predication,
    valuation: Object.freeze({ kind: "predication.fiber.valuation" as const, base: predication.base, fibers: Object.freeze(fibers) }),
  });
}

/**
 * Posits a predication site into the presheaf that settlement reads:
 * predication is first valued as fibers, then exposed as the initial presheaf
 * trace for closure.
 */
export function posit(predication: PredicationSite): PositPresheaf {
  return presheaf(fiberCarrier(predication));
}

/**
 * Folds a list of memes into a valuation over the given base: groups memes by
 * predicate, and combines memes on coincident cells by knowledge join, yielding
 * one fiber algebra per predicate.
 */
export function composeFibers(memes: readonly Meme[], base: PredicationSite["base"]): Valuation {
  const byPredicate: Array<{ readonly predicate: PredicationPredicate; readonly assignments: Meme[] }> = [];
  for (const m of memes) {
    const bucket = byPredicate.find((item) => predicationPredicateCoincidenceHolds(item.predicate, m.cell.predicate));
    if (bucket) {
      const index = bucket.assignments.findIndex((a) => predicationCellCoincidenceHolds(a.cell, m.cell));
      if (index >= 0) {
        const prior = bucket.assignments[index]!;
        bucket.assignments[index] = meme(m.cell, joinKnowledge(prior.charge, m.charge));
      } else bucket.assignments.push(m);
    } else byPredicate.push({ predicate: m.cell.predicate, assignments: [m] });
  }
  const fibers = byPredicate.map(({ predicate, assignments }) => Object.freeze({
    kind: "predication.fiber.algebra" as const,
    predicate,
    entities: entitySet(assignments.flatMap((m) => [m.cell.subject, m.cell.object]), predicationTermCoincidenceHolds),
    assignments: Object.freeze(assignments),
  }));
  return Object.freeze({ kind: "predication.fiber.valuation" as const, base, fibers: Object.freeze(fibers) });
}

/**
 * The charge carrier a valuation assigns to a cell: the charge of the first
 * matching assignment across its fibers, or bottom when none coincides.
 */
export function chargeAt(valuation: Valuation, cell: Cell): ChargeCarrier {
  for (const fiber of valuation.fibers) {
    for (const assignment of fiber.assignments) if (predicationCellCoincidenceHolds(assignment.cell, cell)) return assignment.charge;
  }
  return bottom;
}

/**
 * Converts a predicate fiber back into a valuation over the given base: one
 * fiber algebra holding a meme per cell, using the fiber's charge-carrier
 * reader when present and otherwise a charge built from its value.
 */
export function valuationFromPredicateFiber(fiber: PredicateFiber, base: PredicationSite["base"]): Valuation {
  const assignments = fiber.cells.map(([subject, object]) =>
    meme({ subject, predicate: fiber.label, object }, fiber.chargeAt?.(subject, object) ?? charge(fiber.at(subject, object))),
  );
  return Object.freeze({
    kind: "predication.fiber.valuation" as const,
    base,
    fibers: Object.freeze([Object.freeze({
      kind: "predication.fiber.algebra" as const,
      predicate: fiber.label,
      entities: fiber.entities,
      assignments: Object.freeze(assignments),
    })]),
  });
}
