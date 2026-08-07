/**
 * positing/fiber — the predication fiber algebra and the `posit` morphism.
 *
 * Value enters predication by evidence. A `Meme` binds one cell to a charge; a
 * `FiberAlgebra` collects the charged cells over one predicate; a `Valuation` is
 * one fiber per predicate over a base. A `PredicateFiber` reads a charge value at
 * each subject/object pair, and the generators (converse, subject/object
 * projection, specialization) move fibers along the base with pullback / ∃ / ∀.
 * `posit` values a predication site as fibers and exposes the initial presheaf
 * trace settlement closes over.
 *
 * Coincidence is structural (the package's boundary-first stance); the linear
 * connectives come from positing/logic directly, not a heavy barrel.
 */
import {
  cellCoincides,
  entitySet,
  isCell,
  predicateCoincides,
  termCoincides,
  type Cell,
  type EntitySet,
  type PredicationPredicate,
  type PredicationSite,
  type PredicationTerm,
} from "../predication.mjs";
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
  type ChargeCarrier,
  type ChargeValue,
} from "./bilattice-charge.mjs";
import { linearFusionValue, linearResiduumValue } from "./logic/bilattice-linear-logic.mjs";
import { presheaf, type PositPresheaf } from "./settling/sheaf.mjs";

/** A charged assignment within a fiber: one cell bound to a charge. */
export interface Meme {
  readonly kind: "predication.fiber.meme";
  readonly cell: Cell;
  readonly charge: ChargeCarrier;
}

/** The fiber over one predicate: its label, entity set, and charged assignments. */
export interface FiberAlgebra {
  readonly kind: "predication.fiber.algebra";
  readonly predicate: PredicationPredicate;
  readonly entities: EntitySet<PredicationTerm>;
  readonly assignments: readonly Meme[];
}

/** A valuation: the base plus one fiber algebra per predicate. */
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

/** The name of one of the two lattice orders on charge values. */
export type OrderName = "knowledge" | "truth";

/** A bounded lattice order on charge values. */
export interface Order {
  readonly kind: "predication.fiber.order";
  readonly name: OrderName;
  readonly join: (left: ChargeValue, right: ChargeValue) => ChargeValue;
  readonly meet: (left: ChargeValue, right: ChargeValue) => ChargeValue;
  readonly bottom: ChargeValue;
  readonly top: ChargeValue;
}

/** The knowledge order: absurd bottom, stable top. */
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

/** The truth order: active bottom, potential top. */
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

/** A cell within a predicate fiber: an ordered subject/object pair. */
export type PredicateFiberCell = readonly [subject: PredicationTerm, object: PredicationTerm];

/** Evidence that two predicate fiber cells coincide. */
export interface PredicateFiberCellIdentityWitness {
  readonly kind: "predication.fiber.cellIdentity:witness";
  readonly left: PredicateFiberCell;
  readonly right: PredicateFiberCell;
}

/** Evidence that two predicate fiber cells fail to coincide. */
export interface PredicateFiberCellIdentityObstruction {
  readonly kind: "predication.fiber.cellIdentity-obstruction";
  readonly left: PredicateFiberCell;
  readonly right: PredicateFiberCell;
}

/** The result of comparing two predicate fiber cells. */
export type PredicateFiberCellIdentityJudgment = PredicateFiberCellIdentityWitness | PredicateFiberCellIdentityObstruction;

const predicateFiberCellsCoincide = (left: PredicateFiberCell, right: PredicateFiberCell): boolean =>
  termCoincides(left[0], right[0]) && termCoincides(left[1], right[1]);

/** Compare two predicate fiber cells by term coincidence. */
export function predicateFiberCellIdentity(left: PredicateFiberCell, right: PredicateFiberCell): PredicateFiberCellIdentityJudgment {
  return predicateFiberCellsCoincide(left, right)
    ? Object.freeze({ kind: "predication.fiber.cellIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "predication.fiber.cellIdentity-obstruction" as const, left, right });
}

/** A predicate fiber: a labelled predicate over entities, with a charge-value reader. */
export interface PredicateFiber {
  readonly kind: "predication.fiber.predicate";
  readonly label: PredicationPredicate;
  readonly entities: EntitySet<PredicationTerm>;
  readonly cells: readonly PredicateFiberCell[];
  readonly at: (subject: PredicationTerm, object: PredicationTerm) => ChargeValue;
  readonly chargeAt?: (subject: PredicationTerm, object: PredicationTerm) => ChargeCarrier;
}

/** The kind of fiber generator. */
export type GeneratorKind = "specialization" | "converse" | "subject-projection" | "object-projection";

/** A morphism between predicate fibers: pullback, ∃, ∀ along a generator. */
export interface FiberGenerator {
  readonly kind: "predication.fiber.generator";
  readonly generator: GeneratorKind;
  readonly domain: readonly PredicateFiberCell[];
  readonly codomain: readonly PredicateFiberCell[];
  readonly pullback: (fiber: PredicateFiber) => PredicateFiber;
  readonly exists: (order: Order, fiber: PredicateFiber) => PredicateFiber;
  readonly forall: (order: Order, fiber: PredicateFiber) => PredicateFiber;
}

/** Construct a meme binding a cell to a charge. */
export function meme(cell: Cell, charge: ChargeCarrier): Meme {
  return Object.freeze({ kind: "predication.fiber.meme" as const, cell, charge });
}

/** Type guard for a meme. */
export function isMeme(value: object): value is Meme {
  const kind = "kind" in value ? value.kind : undefined;
  const cell = "cell" in value ? value.cell : undefined;
  const charge = "charge" in value ? value.charge : undefined;
  return kind === "predication.fiber.meme"
    && typeof cell === "object" && cell !== null
    && typeof charge === "object" && charge !== null
    && isCell(cell) && isCharge(charge);
}

/** Every ordered subject/object pair over an entity set. */
export function allCells(entities: EntitySet<PredicationTerm>): readonly PredicateFiberCell[] {
  return Object.freeze(entities.entities.flatMap((subject) => entities.entities.map((object) => Object.freeze([subject, object] as const))));
}

/** Build a predicate fiber from a label, entities, and a charge-value reader. */
export function predicateFiber(
  label: PredicationPredicate,
  entities: EntitySet<PredicationTerm>,
  read: (subject: PredicationTerm, object: PredicationTerm) => ChargeValue,
  cells: readonly PredicateFiberCell[] = allCells(entities),
  readCharge?: (subject: PredicationTerm, object: PredicationTerm) => ChargeCarrier,
): PredicateFiber {
  const values = cells.map((fiberCell) => Object.freeze({ cell: fiberCell, value: read(fiberCell[0], fiberCell[1]) }));
  const at = (subject: PredicationTerm, object: PredicationTerm): ChargeValue =>
    values.find((entry) => predicateFiberCellsCoincide(entry.cell, [subject, object]))?.value ?? chargeValue("absurd");
  return Object.freeze(readCharge === undefined
    ? { kind: "predication.fiber.predicate" as const, label, entities, cells: Object.freeze([...cells]), at }
    : { kind: "predication.fiber.predicate" as const, label, entities, cells: Object.freeze([...cells]), at, chargeAt: readCharge });
}

/** Project a fiber algebra into a predicate fiber. */
export function fiberFromAlgebra(algebra: FiberAlgebra): PredicateFiber {
  const entities = algebra.entities;
  const entries = algebra.assignments.map((assignment) => Object.freeze({
    cell: Object.freeze([assignment.cell.subject, assignment.cell.object] as const),
    charge: assignment.charge,
  }));
  const chargeOf = (subject: PredicationTerm, object: PredicationTerm): ChargeCarrier =>
    entries.find((entry) => predicateFiberCellsCoincide(entry.cell, [subject, object]))?.charge ?? charge(chargeValue("absurd"));
  return predicateFiber(algebra.predicate, entities, (subject, object) => valueOf(chargeOf(subject, object)), allCells(entities), chargeOf);
}

function cellwiseLinear(
  operation: (left: ChargeValue, right: ChargeValue) => ChargeValue,
  left: PredicateFiber,
  right: PredicateFiber,
  cells: readonly PredicateFiberCell[] = left.cells,
): PredicateFiber {
  return predicateFiber(left.label, left.entities, (subject, object) => operation(left.at(subject, object), right.at(subject, object)), cells);
}

function samePredicateFiber(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): boolean {
  return cells.every(([subject, object]) => sameChargeValue(left.at(subject, object), right.at(subject, object)));
}

/** The cellwise linear fusion of two predicate fibers. */
export function predicationFiberLinearFusion(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): PredicateFiber {
  return cellwiseLinear(linearFusionValue, left, right, cells);
}

/** The cellwise linear residuum of two predicate fibers. */
export function predicationFiberLinearResiduum(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): PredicateFiber {
  return cellwiseLinear(linearResiduumValue, left, right, cells);
}

/** Whether the left fiber is below the right under the truth order. */
export function leqTruthPredicateFiber(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): boolean {
  const order = truthOrder();
  return cells.every(([subject, object]) => sameChargeValue(order.join(left.at(subject, object), right.at(subject, object)), right.at(subject, object)));
}

/** Whether a generator's pullback commutes with linear fusion. */
export function generatorPreservesLinearFusion(generator: FiberGenerator, left: PredicateFiber, right: PredicateFiber): boolean {
  const pulledFusion = generator.pullback(predicationFiberLinearFusion(left, right, generator.domain));
  const fusionOfPullbacks = predicationFiberLinearFusion(generator.pullback(left), generator.pullback(right), generator.codomain);
  return samePredicateFiber(pulledFusion, fusionOfPullbacks, generator.codomain);
}

/** Whether a generator's pullback commutes with linear residuum. */
export function generatorPreservesLinearResiduum(generator: FiberGenerator, left: PredicateFiber, right: PredicateFiber): boolean {
  const pulledResiduum = generator.pullback(predicationFiberLinearResiduum(left, right, generator.domain));
  const residuumOfPullbacks = predicationFiberLinearResiduum(generator.pullback(left), generator.pullback(right), generator.codomain);
  return samePredicateFiber(pulledResiduum, residuumOfPullbacks, generator.codomain);
}

/** The Frobenius reciprocity law for a generator over an order. */
export function generatorSatisfiesLinearFusionFrobenius(generator: FiberGenerator, order: Order, alpha: PredicateFiber, phi: PredicateFiber): boolean {
  const left = generator.exists(order, predicationFiberLinearFusion(generator.pullback(alpha), phi, generator.codomain));
  const right = predicationFiberLinearFusion(alpha, generator.exists(order, phi), generator.domain);
  return samePredicateFiber(left, right, generator.domain);
}

const foldJoin = (order: Order, values: readonly ChargeValue[]): ChargeValue => values.reduce((acc, item) => order.join(acc, item), order.bottom);
const foldMeet = (order: Order, values: readonly ChargeValue[]): ChargeValue => values.reduce((acc, item) => order.meet(acc, item), order.top);

/** The converse generator: swaps subject and object. */
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

/** The subject-projection generator. */
export function subjectProjection(entities: EntitySet): FiberGenerator {
  const cells = allCells(entities);
  return Object.freeze({
    kind: "predication.fiber.generator" as const,
    generator: "subject-projection" as const,
    domain: cells,
    codomain: cells,
    pullback: (source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject) => source.at(subject, subject), cells),
    exists: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      termCoincides(subject, object) ? foldJoin(order, source.entities.entities.map((item) => source.at(subject, item))) : order.bottom, cells),
    forall: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      termCoincides(subject, object) ? foldMeet(order, source.entities.entities.map((item) => source.at(subject, item))) : order.top, cells),
  });
}

/** The object-projection generator. */
export function objectProjection(entities: EntitySet): FiberGenerator {
  const cells = allCells(entities);
  return Object.freeze({
    kind: "predication.fiber.generator" as const,
    generator: "object-projection" as const,
    domain: cells,
    codomain: cells,
    pullback: (source: PredicateFiber) => predicateFiber(source.label, source.entities, (_subject, object) => source.at(object, object), cells),
    exists: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      termCoincides(subject, object) ? foldJoin(order, source.entities.entities.map((item) => source.at(item, object))) : order.bottom, cells),
    forall: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      termCoincides(subject, object) ? foldMeet(order, source.entities.entities.map((item) => source.at(item, object))) : order.top, cells),
  });
}

/** The specialization generator restricting an ambient cell set to a support subset. */
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

/** Build the fibered valuation carrier from a site: each cell witnessed-potential by its subject. */
export function fiberCarrier(predication: PredicationSite): FiberCarrier {
  const fibers = predication.cells.predicates.predicates.map((predicate) => {
    const cells = predication.cells.cells
      .filter((c) => predicateCoincides(c.predicate, predicate))
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

/** Posit a predication site into the presheaf settlement reads. */
export function posit(predication: PredicationSite): PositPresheaf {
  return presheaf(fiberCarrier(predication));
}

/** Fold a list of memes into a valuation over a base, combining coincident cells by knowledge join. */
export function composeFibers(memes: readonly Meme[], base: PredicationSite["base"]): Valuation {
  const byPredicate: Array<{ readonly predicate: PredicationPredicate; readonly assignments: Meme[] }> = [];
  for (const m of memes) {
    const bucket = byPredicate.find((item) => predicateCoincides(item.predicate, m.cell.predicate));
    if (bucket) {
      const index = bucket.assignments.findIndex((a) => cellCoincides(a.cell, m.cell));
      if (index >= 0) {
        const prior = bucket.assignments[index]!;
        bucket.assignments[index] = meme(m.cell, joinKnowledge(prior.charge, m.charge));
      } else bucket.assignments.push(m);
    } else byPredicate.push({ predicate: m.cell.predicate, assignments: [m] });
  }
  const fibers = byPredicate.map(({ predicate, assignments }) => Object.freeze({
    kind: "predication.fiber.algebra" as const,
    predicate,
    entities: entitySet(assignments.flatMap((m) => [m.cell.subject, m.cell.object]), termCoincides),
    assignments: Object.freeze(assignments),
  }));
  return Object.freeze({ kind: "predication.fiber.valuation" as const, base, fibers: Object.freeze(fibers) });
}

/** The charge a valuation assigns to a cell, or bottom when none coincides. */
export function chargeAt(valuation: Valuation, cell: Cell): ChargeCarrier {
  for (const fiber of valuation.fibers) {
    for (const assignment of fiber.assignments) if (cellCoincides(assignment.cell, cell)) return assignment.charge;
  }
  return bottom;
}

/** Convert a predicate fiber back into a valuation over a base. */
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
