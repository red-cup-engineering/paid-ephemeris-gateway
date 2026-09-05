---
title: "Author the selection-by-load substrate rule record"
type: task
area: engineering
status: open
horizon: doing
milestone: m2-substrate-dispatch
goal: selection-rule-as-substrate
depends-on: []
requires-capabilities: [corpus-editing, theory-derivation]
theory-basis: [dispatch-readiness, charter-as-closure-system]
---


## Description

Author `objects/selection-by-load.md` declaring the closure rule whose firing emits `(W, preferred-by-load, D) = T` cells.
The rule's antecedent is "(W, eligible-by-capabilities, D) = T AND no other dispatchable D' has fewer open assignments than D."
The consequent is the preferred-by-load cell.

The record fixes the rule's name, antecedent shape, consequent shape, and the predicates it reads (`eligible-by-capabilities`, `current-load`, `assigned-to` — the last two need their own conventions).
The instantiator that grounds the rule against the live store is a separate task (`implement-selection-by-load-instantiator`).

This is theory-side work: get the rule statement right before code is written for it.
The captain's "use PyFARS, don't hand-author what should be derived" memo applies in reverse here — the rule itself is authored substrate; its effect on selection is derived.

## Acceptance

- [ ] `objects/selection-by-load.md` exists with `type: definition`, `class: substrate-tracked-closure-rules`, frontmatter listing the predicates the rule reads.
- [ ] The body states the antecedent, consequent, and bilattice value emitted in formal notation matching the existing `objects/eligibility-by-*.md` records.
- [ ] The body cites the upstream theorem (`dispatch-as-closure-rule-system`) the rule realizes.
- [ ] The body explicitly notes how `current-load` is supposed to be computed from substrate cells (transitive count of open assignments naming the dispatchable) so the instantiator has a clear contract.

## Progress cells

*(empty — task not yet started)*
