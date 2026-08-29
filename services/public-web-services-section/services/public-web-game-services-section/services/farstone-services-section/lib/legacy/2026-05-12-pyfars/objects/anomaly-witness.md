---
type: definition
class: system-event
status: draft
realizes: [anomaly-as-contradiction, witness]
depends-on: [anomaly-as-contradiction, witness, jsonl-event-log, guard, predication-cell, dispatch-closure-rule-system]
implementation: pyfars.engine.anomaly
---

# Anomaly witness

The substrate-event PyFARS emits when a closure-rule application during settling produces a $\top$-valued cell — the realization of upstream [anomaly-as-contradiction](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/anomaly-as-contradiction.md).
One JSONL line on the [`guard`](channels/guard.md) channel per anomaly, naming the contradicting cells, the rule(s) that produced them, the affected entity, the severity, and (when present) the repair-catalog pointer.

The anomaly-witness is *the* operational realization of "anomalies are substrate-visible $\top$-cells, not signals from a separate monitoring layer."
Without it, $\top$-cells produced during settling would sit in the closed store with no operational consequence; with it, contradictions surface on a channel readers (humans, reviewing offices, monitoring exports) can subscribe to.

## Event shape

A single anomaly-witness event in the [JSONL event log](jsonl-event-log.md):

```json
{
  "ts": "2026-05-09T14:23:01.412Z",
  "actor": "engine",
  "verb": "emit-anomaly",
  "channel": "guard",
  "cells": [
    {"s": "task-87", "p": "anomaly-stale", "o": "true", "v": "t"}
  ],
  "anomaly": {
    "rule": "stale-task-detection",
    "severity": "warning",
    "match-radius": 1,
    "contradicting-cells": [
      {"s": "task-87", "p": "status", "o": "in-progress"},
      {"s": "task-87", "p": "last-activity", "o": "2026-04-22T..."}
    ],
    "repair-catalog-entry": "abandon-or-revive-stale-task"
  },
  "rationale": "task-87 in-progress for 17 days exceeds 7-day stale threshold"
}
```

The `cells` field carries the $\top$-cell asserted on the entity's fiber (this is what other rules and queries read); the `anomaly` field is structured metadata that the `guard`-channel consumers (review queues, dashboards, repair recipes) parse.

## When emitted

For every closure-rule application during a settling pass that produces a $\top$-cell on any entity fiber:

$$\mathrm{settling}(S) = S' \quad \text{with} \quad (\exists \text{cell } c \in S' : c.v = \top \text{ and } c \notin S) \;\Longrightarrow\; \mathrm{emit\text{-}anomaly\text{-}witness}(c, R)$$

where $R$ is the rule whose application produced $c$.
One witness per fresh $\top$-cell, not one per closure pass — repeated settlings against the same $\top$-cell do not re-emit (idempotency on the cell-identity, witnessed by the anomaly's `cells` field).

Anomaly emission is part of the engine's tick, not a separate monitor pass: the same closure runner that produces dispatch decisions produces anomaly witnesses.

## Severity

- `warning` — substrate observation only; does not block dispatch (e.g., a long-running task surfacing as `anomaly-stale` does not stop it; it only files the witness).
- `error` — gates downstream rules: the affected entity becomes ineligible for further dispatch this tick (e.g., a `capacity-overrun` anomaly disqualifies the office from receiving more assignments).
- `critical` — escalation: the engine queues a review-workitem on the appropriate office in addition to emitting the witness.

The severity is declared by the rule that produced the anomaly (in its frontmatter), not by the engine.
Editing the rule's `severity:` cell in markdown changes the runtime behavior next tick per [substrate-purity](../claims/substrate-purity.md).

## Discussion

Anomaly-witnesses compose with the bilattice's $\top$ value the same way ordinary witnesses compose with $\mathbf{t}$ — they are not a separate event-class, they are *witnesses whose cell-content is a $\top$-cell*.
The `guard` channel is the reading-discipline; the anomaly metadata is the structuring convention; the cell itself is what other rules read.

This unifies "monitoring" (humans watching for trouble), "validation" (the substrate rejecting bad inputs), and "capacity-management" (the substrate refusing to over-allocate offices) into one mechanism: closure rules whose conclusions are $\top$, whose outputs are cells, whose audit-trail is the JSONL log.
