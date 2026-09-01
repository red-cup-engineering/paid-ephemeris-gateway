---
type: question
status: open
explores: [entity, predication-cell, kind-discriminator, structural-fitness, projector, predication-categories, fars-spec]
---

# Should PyFARS identify entities by *predication-shape fitness* rather than by nominal `kind:` discriminators or directory location?

PyFARS today identifies entities nominally.
A record is an Office because it lives in `governance/offices/` and/or carries `kind: office` (or `type: office`) in frontmatter.
The pydantic loaders (`parse_office`, `parse_polity`, `parse_ship`, `parse_personnel`) consume frontmatter via the file's directory placement; the discriminator is *announced*, not *measured*.

The structural-fitness alternative: an entity *is* an Office because its frontmatter satisfies the predication-categorical definition of an Office — its predications shape the cell that an Office must be.
Identity is derived from cell shape, not declared by author or location.
The corollary: anything whose predications fit the Office definition *is* an Office, regardless of where it lives or what `kind:` it claims; and anything whose predications do not fit *is not* an Office, regardless of its declared `kind:`.

This shift moves identity from *observer-assignment* to *shape-fitness*.
It is structurally aligned with the broader corpus thesis that whether something is a thing is not dependent on whether some observer identifies it as such (a non-Western epistemic stance the corpus carries elsewhere).

## What is known

- The substrate already carries `pyfars.substrate.projector.*` — projector pairs `(extract, create)` between bytes-of-format and `pypredcalc.
  PredicationCell` cells.
  This is the substrate-side machinery that turns a flatfile's bytes into typed predications.
- The pydantic entity classes (`Office`, `Polity`, `Ship`, `Personnel`, `AgentRecord`, …) describe the *predication shape* an entity-of-that-kind must have — they're effectively schemas, but currently used only as deserialization targets.
- The closure-rule system (`runtime/eligibility_rules.py`, `runtime/closure_runner.py`) already evaluates rules over the typed predication store.
  A "shape-fitness" check would be a closure rule that classifies a cell against an entity-kind schema.
- The FARS spec carries the eight-component office template (identity, authority, normative-system, deontic-profile, accountability, action-domain, capabilities, installation).
  A cell either has these components or it doesn't — the test is structural.

## What would settle it

A claim that establishes:

1. The mapping from pydantic entity schemas to predication-categorical classifiers — given an `Office` schema and a cell, *is this cell an Office?* is a closure rule with a decidable answer.
2. The substrate-resident apparatus needed: a `classify(cell, schema)` morphism, classification witnesses, the layering against the existing nominal discriminators (do `kind:` and directory location become hints, become deprecated, or become integrity checks?).
3. The migration path: which loaders adopt structural-fitness first, in what order, and how the existing nominal discriminators are deprecated without breaking the existing corpus.

## Where the answer would live

Several artifacts:

- A claim in `claims/` named something like `entity-identity-by-predication-shape` stating the structural thesis and grounding it in predication-categories theory (the predication-fibration index, the closure 2-monad's classifier role).
- A new morphism `classifying-entity-shape` in `morphisms/`.
- A new object in `objects/` — perhaps `entity-shape-classifier` — naming the structure that does the fitness measurement.
- Open subquestions on (a) which closure-rule regime classification belongs in (strict / Scott-continuous / aperiodic), (b) how the projector framework feeds into the classifier, and (c) what happens to records that match multiple entity shapes.

## What this commits the codebase to (long-term)

- The pydantic entity classes evolve from "deserialization targets" to "structural schemas the substrate can evaluate."
  They carry a `classifier()` method (or similar) that returns a closure rule.
- Nominal discriminators (`kind:`, `type:`, directory placement) become hints / integrity checks / discoverability aids — *evidence*, not identity.
- The `parse_X(path)` loaders are joined by `classify(cell, X)` operations that return a typed entity if the cell fits the shape, regardless of where the cell came from.
- New entity kinds become available by authoring a schema; no need to designate a directory or invent a `kind:` name.

## Provenance

Filed 2026-05-10 during the office/polity/ship/personnel decruft pass that drained `runtime/group.py`'s parallel dataclass record types into `entities/`.
The captain named the structural-fitness direction explicitly during the pass and asked it be marked as the long-term direction so the in-progress decrufting choices preserve space for it.
The local choice this pass made — drop `kind:`-prefixed slug synthesis — is consistent with the structural direction.
