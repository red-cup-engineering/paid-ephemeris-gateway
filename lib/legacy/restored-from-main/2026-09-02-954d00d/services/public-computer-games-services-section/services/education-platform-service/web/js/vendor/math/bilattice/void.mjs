// void.mjs — the void reads and the non-finite duals.
//
// The slack the descent leaves open. `gap` reads a least fixed point against its greatest and keeps the
// cells they disagree on; `vanish` is that gap for the knowledge order (settle vs brim) — the honest
// knowledge void cone. `estrange` is the transfinite complement-dual of cohere (the never-related pairs);
// `saturate`/`transfer`/`twistor`/`precipitate` are the aperiodic monad (path composition and its
// unsaturable residue), which re-articulate one fold deeper.

import { stringify as S } from "./internal.mjs";
import { present } from "./charge.mjs";
import { articulate, cohere, settle } from "./descent.mjs";
import { brim } from "./cone.mjs";

const labels = (edge) => (Array.isArray(edge.predicate) ? edge.predicate : [edge.predicate]);

/**
 * μ of the predication monad: path composition over the void cone read as a graph (each cell `(s,c,o)`
 * an edge `s →[c]→ o`). Composes edges across a shared object — `(a,p,b)·(b,q,c) ↦ (a,[p,q],c)` —
 * accumulating concepts as the composite's label. An edge never composes with itself.
 * @param {{ potential: any[] }} cone @returns {{ potential: any[] }}
 */
export function saturate({ potential }) {
  const composites = [];
  for (let i = 0; i < potential.length; i++) {
    for (let j = 0; j < potential.length; j++) {
      if (i === j) continue; // an edge does not compose with itself
      const left = potential[i], right = potential[j];
      if (S(left.object) === S(right.subject)) {
        composites.push({ subject: left.subject, predicate: [...labels(left), ...labels(right)], object: right.object });
      }
    }
  }
  return { potential: [...potential, ...composites] };
}

const atomic = (edge) => (Array.isArray(edge.predicate) ? edge.predicate.length === 1 : true);

/**
 * η of the predication monad: present each void predication as an ATOMIC (uncomposed) path, keeping
 * only the generating edges (label length 1). Non-injective — composites and generators both reopen
 * to atoms (the KZ unit's non-invertibility).
 * @param {{ potential: any[] }} cone @returns {{ potential: any[] }}
 */
export function transfer({ potential }) {
  return { potential: potential.filter(atomic) };
}

/**
 * The KZ comparison 2-cell of μ ⊣ η: run `saturate` then `transfer`; the residue is the concept-sequence
 * each composite accumulated (the labels that never saturate into an object), which descend as the next
 * layer's claims. Non-empty exactly when there was a composable pair.
 * @param {{ potential: any[] }} potential @returns {{ saturated: object, reopened: object, residue: any[][] }}
 */
export function twistor(potential) {
  const saturated = saturate(potential);
  const reopened = transfer(saturated);
  const residue = saturated.potential.filter((edge) => labels(edge).length > 1).map(labels);
  return { saturated, reopened, residue };
}

/**
 * The aperiodic greatest-fixed-point generator, the residue-dual of `saturate`: what μ CANNOT saturate
 * — the unsaturable concept-sequences (the aperiodic void, H¹≠0), which re-articulate one fold deeper.
 * One unfold step (`articulate` then `twistor`); the infinitude lives in iterating the tower.
 * @param {{ apex: any[] }} cone @returns {{ saturated: object, residue: any[][] }}
 */
export function precipitate(cone) {
  const { saturated, residue } = twistor(articulate(cone));
  return { saturated, residue };
}

/**
 * The transfinite greatest-fixed-point generator, the complement-dual of `cohere`: the pairs NEVER
 * related, even after full closure — the complement of the closure within objects×objects.
 * @param {object} category @returns {{ apex: { source: unknown, target: unknown }[] }}
 */
export function estrange(category) {
  const closed = cohere(category).residue;
  const objects = closed.base.objects.predicates;
  const edges = closed.base.specialization;
  const related = (s, t) => edges.some((e) => S(e.source) === S(s) && S(e.target) === S(t)); // cohere's `has` idiom
  const apex = [];
  for (const source of objects) for (const target of objects) {
    if (!related(source, target)) apex.push({ source, target });
  }
  return { apex };
}

const value = (charge) => S(present(charge)); // the FOUR place (value bits), the order-reading

/**
 * The honest void cone: read a least fixed point against a greatest and keep the cells they DISAGREE on
 * by VALUE (LFP ≤ GFP everywhere; they coincide where the closure pins a value, split where pinned from
 * neither side). Throws nothing out — `apex` keeps the bare cells (re-articulable), `evidence` keeps the
 * full interval (both charges, witnesses intact).
 * @param {{ least: object, greatest: object }} pair @returns {{ apex: object[], evidence: object[] }}
 */
export function gap({ least, greatest }) {
  const greatestByCell = new Map();
  for (const fa of greatest["fiber-algebras"])
    for (const { cell, charge } of fa.assignments) greatestByCell.set(S(cell), charge);
  const apex = [], evidence = [];
  for (const fa of least["fiber-algebras"])
    for (const { cell, charge } of fa.assignments) {
      const g = greatestByCell.get(S(cell));
      if (g !== undefined && value(charge) !== value(g)) {
        apex.push(cell); // bare cell — re-articulable
        evidence.push({ cell, least: charge, greatest: g }); // the full interval, witnesses intact
      }
    }
  return { apex, evidence };
}

/**
 * The knowledge void cone: `gap(settle, brim)`. The cells the closure pins from NEITHER side — settle
 * leaves them ⊥, brim leaves them ⊤. Runs both fixed points and takes their gap (a single section
 * cannot tell a genuinely-void cell from a reconciled-conflict ⊥, because it cannot see the GFP).
 * @param {object} category @returns {{ apex: object[], evidence: object[] }}
 */
export function vanish(category) {
  return gap({ least: settle(category).sheaf.section, greatest: brim(category).cone.section });
}
