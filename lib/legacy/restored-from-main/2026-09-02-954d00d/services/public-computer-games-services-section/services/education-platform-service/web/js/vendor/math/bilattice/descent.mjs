// descent.mjs — the four-regime descent and its modal closure.
//
// An utterance `[token, claim]` settles to a finite fixed point through
//     articulate → predicate → (cohere) → posit → (commutate) → settle.
// `posit` MEASURES each cell from its givens (it never seeds a value); the modal generators
// `possibilize`/`necessitate` raise/lower across the fiber-algebras on each order; `settle` iterates
// the knowledge closure to its least fixed point (the sheaf). `compare` splits a settled section into
// its consistent and paraconsistent (⊤) parts.

import { joinKnowledge, meetKnowledge, joinTruth, meetTruth, isTop } from "./charge.mjs";
import { stringify as S } from "./internal.mjs";

/**
 * The root morphism: witness a thing into a potential. It asserts NO semantics about the parts —
 * `predicate` later reads the left as the entity dimension and the right as the predicate dimension.
 * Polymorphic over what it witnesses: a bare utterance `[left, right]` (cycle 0), or a void cone
 * `{ apex }` handed up by vanishing (the re-entry, one fold down). A missing side is malformed input.
 * @param {[unknown, unknown] | { apex: unknown[] }} thing @returns {{ potential: unknown[] }}
 */
export function articulate(thing) {
  if (thing && !Array.isArray(thing) && thing.apex) return { potential: [...thing.apex] };
  const [left, right] = /** @type {[unknown, unknown]} */ (thing);
  if (left === undefined || right === undefined) {
    throw new TypeError("articulate: malformed utterance — expected [left, right], both given");
  }
  return { potential: [left, right] };
}

const initialPredicateCategory = (predicateSet) => ({
  objects: predicateSet, specialization: [], converse: [], "subject-projection": [], "object-projection": [],
});

/**
 * The transfinite generator. Reads the potential cell `[token, claim]`: left = token is the entity
 * dimension E, right = claim is the unsaturated concept Π; emits the cell-set Φ = E × Π × E and the
 * value-free fiber over it.
 * @param {{ potential: unknown[] }} category @returns {object}
 */
export function predicate(category) {
  const [object, concept] = category.potential; // left = token (the object E), right = claim (the concept Π)
  const entitySet = { entities: [object] };
  const predicateSet = { predicates: [concept] };
  const cellSet = { "entity-set": entitySet, "predicate-set": predicateSet };
  return {
    "cell-set": cellSet,
    fiber: { "cell-set": cellSet, base: initialPredicateCategory(predicateSet), "entity-set": entitySet },
  };
}

function closeSpecialization(specialization) {
  const edges = specialization.map((e) => [e.source, e.target]);
  const has = (a, b) => edges.some(([s, t]) => S(s) === S(a) && S(t) === S(b));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, b] of [...edges]) for (const [c, d] of [...edges]) {
      if (S(b) === S(c) && S(a) !== S(d) && !has(a, d)) { edges.push([a, d]); changed = true; }
    }
  }
  return edges.map(([source, target]) => ({ source, target }));
}
const closeBase = (base) => ({ ...base, specialization: closeSpecialization(base.specialization) });

/**
 * The transfinite coherence (Beck–Chevalley). `saturated` = the relational cell-set; `residue` = the
 * value-free fiber over the composition-closed (transitively closed specialization) base `posit` consumes.
 * @param {object} category @returns {{ saturated: object, residue: object }}
 */
export function cohere(category) {
  const fiber = category.fiber;
  return {
    saturated: category["cell-set"],
    residue: { "cell-set": fiber["cell-set"], base: closeBase(fiber.base), "entity-set": fiber["entity-set"] },
  };
}

/**
 * The scott-continuous generator. Consumes `cohere`'s residue; packages it as a presheaf whose stalks
 * take charges, and MEASURES each cell from its givens: the knowledge bit is witnessed by the given
 * token, the truth bit is FREE. So a fresh cell measures POTENTIAL `[T,F]`, never a stamped absurd.
 * @param {object} category @returns {{ presheaf: object, traces: object[] }}
 */
export function posit(category) {
  const { residue: fiber } = cohere(category);
  const entitySet = fiber["entity-set"];
  const entities = entitySet.entities;
  const predicates = fiber["cell-set"]["predicate-set"].predicates;
  const fibers = predicates.map((predicate) => ({
    "entity-set": entitySet,
    assignments: entities.flatMap((subject) => entities.map((object) =>
      ({ cell: { subject, predicate, object },
        charge: { value: [true, false], evidence: [[subject], []] } }))),
    predicate,
  }));
  const presheaf = { fiber, base: fiber.base, "entity-set": fiber["entity-set"], fibers };
  const valuation = { base: fiber.base, "fiber-algebras": fibers };
  return { presheaf, traces: [{ valuations: [valuation] }] };
}

/**
 * The scott-continuous coherence (◇□ = □◇, invertible). `saturated` = the presheaf; `residue` = the
 * traces (the unsaturated gluing) `settle` consumes.
 * @param {object} category @returns {{ saturated: object, residue: object }}
 */
export function commutate(category) {
  return { saturated: category.presheaf, residue: category.traces };
}

// the modal generators: raise/lower each cell to the join/meet across the valuation's fiber-algebras,
// then APPEND the new valuation to each trace. The four differ ONLY in the binary op they fold with.
const modalStep = (fold) => (valuation) => {
  const algebras = valuation["fiber-algebras"].map((fa) => {
    const byCell = new Map();
    for (const { cell, charge } of fa.assignments) {
      const k = S(cell);
      byCell.set(k, byCell.has(k) ? fold({ left: byCell.get(k), right: charge }) : charge);
    }
    const seen = new Set();
    const assignments = [];
    for (const { cell } of fa.assignments) {
      const k = S(cell);
      if (seen.has(k)) continue;
      seen.add(k);
      assignments.push({ cell, charge: byCell.get(k) });
    }
    return { ...fa, assignments };
  });
  return { ...valuation, "fiber-algebras": algebras };
};

const appendValuation = (step) => (category) => ({
  ...category,
  traces: category.traces.map((trace) => {
    const vs = trace.valuations;
    return { ...trace, valuations: [...vs, step(vs[vs.length - 1])] };
  }),
});

/** Raise a valuation to the knowledge-join across its fiber-algebras (◇_k's step). */
export const raiseKnowledge = modalStep(joinKnowledge);
/** Lower a valuation to the knowledge-meet across its fiber-algebras (□_k's step). */
export const lowerKnowledge = modalStep(meetKnowledge);
/** Raise a valuation to the truth-join across its fiber-algebras (◇_t's step). */
export const raiseTruth = modalStep(joinTruth);
/** Lower a valuation to the truth-meet across its fiber-algebras (□_t's step). */
export const lowerTruth = modalStep(meetTruth);

/** ◇_k — the forward modal generator on the knowledge order: append the knowledge-raised valuation. */
export const possibilizeKnowledge = appendValuation(raiseKnowledge);
/** □_k — the backward modal generator on the knowledge order: append the knowledge-lowered valuation. */
export const necessitateKnowledge = appendValuation(lowerKnowledge);
/** ◇_t — the forward modal generator on the truth order: append the truth-raised valuation. */
export const possibilizeTruth = appendValuation(raiseTruth);
/** □_t — the backward modal generator on the truth order: append the truth-lowered valuation. */
export const necessitateTruth = appendValuation(lowerTruth);

/** The last valuation of a category's first trace — the current state of the closure. */
export const lastValuation = (cat) => { const t = cat.traces[0].valuations; return t[t.length - 1]; };

/**
 * The finite generator. Iterates the commutating closure `possibilizeKnowledge ∘ necessitateKnowledge`
 * to its knowledge-least fixed point (unique by confluence; terminates by Knaster–Tarski over the
 * bounded knowledge lattice). The glued section is the sheaf.
 * @param {object} category @returns {{ sheaf: { base: object, section: object } }}
 */
export function settle(category) {
  const { saturated: presheaf, residue: traces } = commutate(category);
  let current = { presheaf, traces };
  let prev;
  do {
    prev = current;
    current = possibilizeKnowledge(necessitateKnowledge(current));
  } while (S(lastValuation(current)) !== S(lastValuation(prev)));
  const section = lastValuation(current);
  return { sheaf: { base: section.base, section } };
}

const keep = (valuation, pred) => ({
  ...valuation,
  "fiber-algebras": valuation["fiber-algebras"].map((fa) => ({
    ...fa,
    assignments: fa.assignments.filter(({ charge }) => pred(charge)),
  })),
});

/**
 * The truth–knowledge coherence: split a section into its consistent part (cells valued ⊥/t/f) and its
 * paraconsistent part (cells valued ⊤ — the inconsistency locus, the "told both" overdetermined evidence).
 * @param {object} valuation @returns {{ consistent: object, paraconsistent: object }}
 */
export function compare(valuation) {
  return {
    consistent: keep(valuation, (c) => !isTop(c)),
    paraconsistent: keep(valuation, isTop),
  };
}
