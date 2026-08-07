/**
 * observer-category.test — the social base is a genuine OBSERVER CATEGORY O (a site),
 * not a bare undirected channel graph.
 *
 * socializing realizes the corpus's multi-observer system V: O → Settlings_B
 * (content/_archive spatiotemporal-knowledge-presheaf): the base IS the observer
 * category O, whose objects are the observers (members, by index) and whose
 * non-identity morphisms are directed translation settling-morphisms α: source →
 * target (perspective maps V(α): V(source) → V(target)). These theorem-shaped tests
 * assert that structure: translations are directed, identities are units, translations
 * compose associatively, the undirected comparison graph converge reads is forgotten
 * from O (direction dropped, deduped), a one-observer base is a DISCRETE O (the
 * degenerate diagonal case), and a replica-cover is the family of translations into an
 * observer (the site's covering family that consensus glues over). A base that stayed a
 * bare symmetric edge list — with no composition, no identity, no direction — fails
 * these.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  translation,
  identityTranslation,
  composeTranslations,
  completeTranslations,
  comparisonEdges,
  neighborsFrom,
  translationBetween,
  coverOf,
  emptyField,
  admitAction,
} from "@emsenn/socializing";

const key = (e) => `${e[0]},${e[1]}`;

// --- a translation is a directed morphism of O ---

test("a translation is a directed morphism α: source → target carrying a channel", () => {
  const a = translation(0, 1);
  assert.equal(a.kind, "socializing.translation");
  assert.equal(a.source, 0);
  assert.equal(a.target, 1);
  assert.equal(a.channel.kind, "communicating.messaging.channel", "the translation travels a reused channel");
});

// --- identity is the unit of composition ---

test("identity is the unit of composition (left and right unit laws)", () => {
  const a = translation(0, 1);
  const id0 = identityTranslation(0);
  const id1 = identityTranslation(1);
  // id_1 ∘ a = a  (left unit on the target side)
  const left = composeTranslations(a, id1);
  assert.equal(left.source, 0);
  assert.equal(left.target, 1);
  // a ∘ id_0 = a  (right unit on the source side)
  const right = composeTranslations(id0, a);
  assert.equal(right.source, 0);
  assert.equal(right.target, 1);
});

// --- translations compose; composition is associative ---

test("translations compose: α:0→1 then β:1→2 gives 0→2; mismatched arrows do not compose", () => {
  const composed = composeTranslations(translation(0, 1), translation(1, 2));
  assert.equal(composed.source, 0);
  assert.equal(composed.target, 2);
  assert.throws(() => composeTranslations(translation(0, 1), translation(2, 3)),
    /does not compose/, "the codomain of the first must be the domain of the second");
});

test("composition is associative on a chain 0→1→2→3", () => {
  const a = translation(0, 1), b = translation(1, 2), c = translation(2, 3);
  const leftAssoc = composeTranslations(composeTranslations(a, b), c);
  const rightAssoc = composeTranslations(a, composeTranslations(b, c));
  assert.equal(leftAssoc.source, rightAssoc.source);
  assert.equal(leftAssoc.target, rightAssoc.target);
  assert.equal(leftAssoc.source, 0);
  assert.equal(leftAssoc.target, 3);
});

// --- the comparison graph converge reads is forgotten from O ---

test("the comparison graph forgets direction and dedups (both arrows of a pair ⇒ one edge)", () => {
  const base = { kind: "socializing.social-base", translations: completeTranslations(3) };
  // completeTranslations(3) = 6 directed arrows (each ordered pair i≠j)…
  assert.equal(base.translations.length, 6, "complete O on 3 observers has 6 directed translations");
  // …whose undirected comparison graph is the 3 edges of the triangle.
  const edges = comparisonEdges(base).map(key).sort();
  assert.deepEqual(edges, ["0,1", "0,2", "1,2"], "direction forgotten, deduped to the triangle");
});

// --- a one-observer base is a DISCRETE O (the degenerate diagonal) ---

test("a one-observer base is a discrete O — no non-identity translations (the diagonal case)", () => {
  assert.deepEqual(completeTranslations(1), [], "one observer ⇒ no translations (nothing off-diagonal)");
  assert.deepEqual(completeTranslations(0), [], "the empty society is the empty category");
});

// --- neighbours: whom an observer can address out of O ---

test("neighborsFrom gives the targets of an observer's outgoing translations", () => {
  const base = { kind: "socializing.social-base", translations: completeTranslations(3) };
  assert.deepEqual([...neighborsFrom(base, 0)].sort(), [1, 2]);
  assert.equal(translationBetween(base, 0, 2)?.target, 2, "the 0→2 arrow is present");
  assert.equal(translationBetween(base, 2, 2), null, "no stored identity self-arrow");
});

// --- the site: a replica-cover is the family of translations into an observer ---

test("a replica-cover of an observer is the family of translations INTO it (the covering family)", () => {
  const base = { kind: "socializing.social-base", translations: completeTranslations(3) };
  const cover = coverOf(base, 2);
  assert.deepEqual([...cover.map((t) => t.source)].sort(), [0, 1],
    "observer 2 is covered by the views of observers 0 and 1 — the site's covering family converge glues over");
  for (const t of cover) assert.equal(t.target, 2);
});

// --- admit builds the observer category, not a bare edge list ---

test("admit grows the observer category: admitting n observers builds completeTranslations(n)", () => {
  let field = emptyField();
  for (const id of ["a|exists", "b|exists", "c|exists"]) field = admitAction.run(field, { agent: id });
  assert.equal(field.members.length, 3);
  assert.equal(field.base.translations.length, 6, "3 observers ⇒ 6 directed translations (the complete category)");
  assert.equal(comparisonEdges(field.base).length, 3, "whose comparison graph is the triangle");
  for (const t of field.base.translations) assert.equal(t.kind, "socializing.translation");
});
