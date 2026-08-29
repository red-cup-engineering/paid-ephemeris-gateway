---
type: question
status: open
explores: [derived-from, provenance, closure-rule, settlement-path, promote-operator, substrate-driven-dispatch, identifying-entities-by-predication-shape]
---

# What is the substrate-resident shape of provenance walking? `derived_from` predications + closure-rule query, or something richer?

The pre-decruft `runtime/promote.py:PromoteSubstrate` carried an in-memory `dict[str, Record]` keyed by canonical hash, with a `promote_chain(record)` method that walked `derived_from` transitively to return the chain of source records.
It was a Group-pattern aggregator: a Python-side index over substrate cells.

This pass deleted `PromoteSubstrate`.
The settlement-path entities (`Observation`, `Instinct`, `Skill`, `Tool`, `Idea`, `Plan`) carry `derived_from: list[str]` (and `Plan` carries `promoted_from: str`) as substrate-resident predications.
The provenance walk that `promote_chain` performed must now be re-expressed as a substrate query.

This question asks what shape the substrate-resident equivalent should take.

## What is known

- The substrate already has the closure-rule machinery (`runtime/eligibility_rules.py`, `runtime/closure_runner.py`) for evaluating quantified predications over the `PredicationStore`.
- Each settlement-path entity carries `derived_from: list[str]` as a frontmatter-aliased field, so it projects into the substrate as `(record-slug, derived-from, ancestor-hash)` cells.
- The dispatch graph already loads-store-runs-rules-selects-enacts; provenance traversal is structurally a closure-rule query of the form "for each (R, derived-from, A): if (A, derived-from, B) then (R, derived-from-transitive, B)."
- The hash-based addressing (records cite ancestors by canonical SHA-256, not by slug) is currently a parallel namespace to the substrate's slug-based addressing.
  This is a real design choice with consequences — see below.

## What would settle it

A claim that establishes:

1. **The shape of the provenance-walk closure rule**: what antecedent reads from the substrate, what consequent it emits, what regime it lives in (strict / Scott-continuous / aperiodic).
  Probably strict (finite carrier; quantifier-free); the realizer is the existing `_subset_cover_rules` pattern or a sibling.

2. **Hash-vs-slug addressing for `derived_from`**: the dataclass used `derived_from: tuple[str, ...]
  ` of canonical SHA-256 hashes.
  This made provenance content-addressed (renaming a slug doesn't break ancestry; identical-content records share a hash).
  The substrate's general convention is slug-addressed.
  Either:
   - **Keep hash addressing for `derived_from`** — provenance is content-addressed, distinct from slug references.
     Closure rule has to translate hash↔slug at query time.
   - **Switch to slug addressing** — provenance becomes a slug reference like every other substrate edge.
     Loses content-addressing's rename-resilience but uniforms the addressing model.
   - **Carry both** — `derived_from_hash` (content addressing) and `derived_from_slug` (substrate convention); closure rule joins them.
     Probably overkill.

3. **The query API**: what does `provenance_chain(record_slug)` look like as a substrate query?
  Likely a closure-rule application whose output is a derived predicate `(record-slug, ancestor-of-transitive, ancestor-slug)` over which the runtime can iterate.
  The previous Python-side `promote_chain` becomes a wrapped `analyze/`-layer function over the closure result.

The decision interacts with [identifying-entities-by-predication-shape](identifying-entities-by-predication-shape.md): under structural-fitness, "this is a settlement-path record" is itself a shape-classifier, and provenance is a derived predicate over the classifier's output.

## Where the answer would live

- A claim in `claims/` named `provenance-as-substrate-closure-rule` describing the closure-rule shape.
- A new closure-rule object record in `objects/<slug>.md` (per the substrate-authorized-rules convention; the rule is active iff the record is present).
- A new analyze function in `runtime/analyze/` that wraps the substrate-side closure result for callers that want a Python-side traversal.
- The settlement of the hash-vs-slug addressing question in a sibling claim.

## What this commits the codebase to (long-term)

- `derived_from` becomes a *substrate predication* whose semantics are defined by a substrate-resident closure rule, not by Python-side traversal logic.
- The promote operator's `_record_hash` function becomes a substrate-resident hash predication on each record (computed once, projected into the cell), not a Python-side computation re-run on every reference.
- Future settlement-path-derived structures (consolidations, lineage queries, replay verification) compose closure rules over the same provenance predicate, rather than each re-implementing a Python walker.

## Provenance

Filed 2026-05-10 during the settlement-path entity-migration pass that deleted `runtime/promote.py:PromoteSubstrate` (the in-memory provenance aggregator).
The deletion was a clean cut — the entities carry `derived_from` predications themselves — but the substrate-resident replacement for the provenance-walk operation was deferred to this question rather than silently re-implemented.
