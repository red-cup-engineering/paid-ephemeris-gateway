---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
shape: disqualification-negative
flag-predicate: rate-limit-remaining
flag-object: "0"
consequent-predicate: eligible-by-rate-limit
realizes: [dispatch-closure-rule-system]
depends-on: [dispatch-closure-rule-system]
---

# Eligibility by rate-limit (Farston)

Activates [the canonical rule](../../../../objects/eligibility-by-rate-limit.md).
Disqualification rule: a dispatchable with `rate-limit-remaining = 0` is F-eligible.
