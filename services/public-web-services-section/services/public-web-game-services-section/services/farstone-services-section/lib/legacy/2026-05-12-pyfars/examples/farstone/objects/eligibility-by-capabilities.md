---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
shape: subset-cover-positive
requires-predicate: requires-capabilities
provides-predicate: provides-capabilities
consequent-predicate: eligible-by-capabilities
realizes: [dispatch-closure-rule-system]
depends-on: [dispatch-closure-rule-system]
---

# Eligibility by capabilities (Farston)

Activates [the canonical rule](../../../../objects/eligibility-by-capabilities.md).
Subset-cover on the capabilities axis: a workitem-dispatchable pair is T-eligible-by-capabilities iff D's `provides-capabilities` cover W's `requires-capabilities`.
