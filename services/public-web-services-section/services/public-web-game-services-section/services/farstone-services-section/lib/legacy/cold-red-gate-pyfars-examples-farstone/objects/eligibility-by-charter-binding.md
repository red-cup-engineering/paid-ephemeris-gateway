---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
shape: disqualification-negative
flag-predicate: charter-binding-violated
flag-object: "true"
consequent-predicate: eligible-by-charter-binding
realizes: [dispatch-closure-rule-system]
depends-on: [dispatch-closure-rule-system]
---

# Eligibility by charter-binding (Farston)

Activates [the canonical rule](../../../../objects/eligibility-by-charter-binding.md).
Disqualification rule: a dispatchable with `charter-binding-violated = true` is F-eligible.
