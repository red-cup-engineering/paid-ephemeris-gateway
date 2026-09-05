---
title: "Review the federation spec against the closure-merge commutation lemma"
type: task
area: research
status: open
horizon: captured
milestone: m6-federation
goal: fars-federation-spec-section-authored
depends-on: [draft-fars-federation-spec-section]
requires-capabilities: [theory-review, lemma-application]
theory-basis: [closure-merge-commutation]
---


## Description

For each operational discipline the draft spec proposes, verify it preserves the closure-merge commutation lemma:

$$\mathrm{cl}_p(\mathrm{cl}_p(X) \vee_k Y) = \mathrm{cl}_p(X \vee_k Y)$$

In particular: - Does the envelope serialization preserve the cells' values exactly (no lossy projection)? - Does the per-peer sync-scope restriction commute with the cellwise join (restricted-then-joined = joined-then-restricted)? - Does the conflict-resolution rule (conflicts → $\top$) match the lemma's definition? - Does the replay correctness section's argument cite the right invariants?

Output a [finding](../../findings/_index.md) record at `work/findings/federation-spec-lemma-preservation-review.md` with each operational discipline marked `preserves: T | F | ⊥` and rationale.

## Acceptance

- [ ] A finding record at the path above.
- [ ] Each operational discipline has a cell stating preservation status.
- [ ] Any non-preserving disciplines are flagged with adjustment recommendations (queue tasks to fix the spec).
- [ ] The review is conducted by a reader other than the spec's author (or with a fresh re-read after time has passed).

## Progress cells

*(empty — task not yet started)*
