---
type: object
class: channel
status: draft
name: Guard
kind: operation-typology
emit-policy: any
read-policy: any
retention: durable
ordering: total
depends-on: [channel, witness]
---

# Guard channel

Produces an *admissibility value* — true / false / contested — without performing the action being valuated.
Guards are the dispatch-decision and authorization-check shape: they say whether something is permitted, not whether it happened.

Examples: dispatch eligibility witnesses, scope-violation diagnostics, charter-binding admissibility.

A guard's witness carries the verdict in its bilattice axes (truth, evidence).
Downstream operators consume the guard verdict to decide whether to proceed with their mutation.
