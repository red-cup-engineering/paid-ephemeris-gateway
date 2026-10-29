// cochain.mjs — the cohomology of a settling, CONSTRUCTED from the carriers and read off combinatorially.
//
// We do not import a cochain complex and we do not borrow a name. We build the complex from the cells the
// descent witnesses, and we read its cohomology off the graph itself. The construction is the proof.
//
// A settled relation is a directed graph on entities: each designated cell (s, c, o) the descent
// produces is an edge s → o. From those cells alone we build the cellular cochain complex
//
//   C⁰ = ℤ^{entities}   ──δ⁰──▶   C¹ = ℤ^{cells}        (δ⁰ f)(s → o) = f(o) − f(s)
//
// δ⁰ is the incidence map of the witnessed graph — nothing posited, every entry read off a cell. Its
// cohomology is read with NO linear algebra at all, by the graph's connectivity — the honest combinatorial
// reading (verification.test.mjs already states H¹ = the first Betti number):
//
//   H⁰ = ker δ⁰  — a 0-cochain f is a cocycle iff f(o) = f(s) on every edge, i.e. f is constant on each
//                  connected component. So ker δ⁰ ≅ ℤ^{#components}, and its canonical basis is the
//                  per-component INDICATOR vectors (1 on the component's entities, 0 elsewhere).
//   H¹ = coker δ⁰ — its rank is the first Betti number |cells| − |entities| + #components (= E − rank δ⁰,
//                  since rank δ⁰ = |entities| − #components for the incidence map of a graph).
//
// Connectivity is computed combinatorially by union–find over the entities — no host arithmetic on a
// matrix, no rank over a field. H¹ ≠ 0 exactly when the settled relation carries a cycle a 0-cochain
// cannot bound. This is the cohomology of what the descent actually settled, computed, not asserted.

import { settle, predicate, posit, articulate } from "@lenticule-science/metrologic/bilattice";

const S = (x) => JSON.stringify(x);

/**
 * Build the cellular cochain complex of a relation (a list of cells `{ subject, predicate, object }`) and
 * read its cohomology combinatorially. Returns the constructed pieces (`entities`, `cells`, the
 * differential `d0`) and the cohomology read off the graph's connectivity: `H0` (ker δ⁰, with the explicit
 * per-component indicator basis) and `H1` (coker δ⁰, the first Betti number).
 * @param {{subject:unknown, predicate:unknown, object:unknown}[]} cells
 */
export function cohomologyOfRelation(cells) {
  const entities = [...new Set(cells.flatMap((c) => [S(c.subject), S(c.object)]))];
  const vi = new Map(entities.map((v, i) => [v, i]));
  const V = entities.length, E = cells.length;
  // δ⁰ : ℤ^entities → ℤ^cells, one row per cell (edge): +1 at object, −1 at subject.
  const d0 = cells.map((c) => {
    const row = Array(V).fill(0);
    row[vi.get(S(c.object))] += 1;
    row[vi.get(S(c.subject))] -= 1;
    return row;
  });

  // union–find over the entities, joining the endpoints of every edge — the relation's components.
  const parent = entities.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a, b) => { parent[find(a)] = find(b); };
  for (const c of cells) union(vi.get(S(c.subject)), vi.get(S(c.object)));
  const roots = [...new Set(entities.map((_, i) => find(i)))]; // one per connected component
  const components = roots.length;

  // H⁰ basis: the per-component INDICATOR 0-cochains (1 on the component's entities, 0 elsewhere). Each is
  // constant on its component, so δ⁰ kills it — a genuine 0-cocycle, read not posited.
  const cocycles = roots.map((r) => entities.map((_, i) => (find(i) === r ? 1 : 0)));

  return {
    entities,
    cells,
    d0,
    H0: { rank: components, cocycles },                      // ker δ⁰ — locally-constant 0-cocycles
    H1: { rank: E - V + components, vanishes: E - V + components === 0 }, // coker δ⁰ — the first Betti number
  };
}

/** The designated relation a settling settles to — the cells the descent drives to **t**. */
export const settledRelation = (category) =>
  settle(category).sheaf.section["fiber-algebras"].flatMap((fa) => fa.assignments.map((a) => a.cell));

/**
 * The cohomology of the relation an utterance settles to: articulate → predicate → posit → settle, then
 * read ker/im of the settled graph. Everything is constructed from the utterance's own carriers.
 * @param {[unknown, unknown]} utterance
 */
export const cohomologyOf = (utterance) =>
  cohomologyOfRelation(settledRelation(posit(predicate(articulate(utterance)))));
