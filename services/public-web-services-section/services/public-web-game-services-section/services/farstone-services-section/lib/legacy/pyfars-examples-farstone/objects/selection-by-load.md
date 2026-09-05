---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
shape: selection-by-load
consequent-predicate: selection-by-load
realizes: [selection-rule, dispatch-closure-rule-system]
depends-on: [eligibility-by-capabilities, assignment-cell]
---

# Selection by load (Farston)

Farston activates the [`selection-by-load`](../../../objects/selection-by-load.md) closure rule from PyFARS's standard rule-system.
Among council members eligible for a vote, the one with the fewest pending votes wins.
Among equally-eligible inspectors for a water-quality re-inspection, the one with the lighter inspection backlog goes.

This rule's presence in Farston's `objects/` directory is what activates it for `pyfars run examples/farston/`.
Removing this record disables the rule for Farston without affecting other polities.

See [the canonical record](../../../objects/selection-by-load.md) for full specification.
