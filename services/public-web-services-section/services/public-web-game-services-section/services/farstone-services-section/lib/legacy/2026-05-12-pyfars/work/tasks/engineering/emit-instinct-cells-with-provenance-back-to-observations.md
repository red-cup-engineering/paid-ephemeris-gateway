---
title: "Emit instinct cells with provenance back to observations"
type: task
area: engineering
status: open
horizon: later
milestone: m4-memory-feedback
goal: instinct-cells-via-consolidation
depends-on: [implement-promote-runner-as-consolidation-step]
requires-capabilities: [python-editing, closure-rule-authoring]
theory-basis: [consolidation-as-settlement, first-class-provenance]
---


## Description

Author the `instinct-emission-rule` closure rule and its instantiator: takes the consolidation runner's output (aggregated `(dispatchable, workitem-class)` groups) and emits instinct records into the substrate.

Each instinct record carries:

- `(instinct, of-dispatchable, <D>) = T`
- `(instinct, for-workitem-class, <C>) = T`
- `(instinct, value, <V>) = T` — the aggregated value (e.g., success-rate, p99-latency, average-cost)
- `(instinct, value-method, <method-slug>) = T` — how the value was aggregated
- `(instinct, confidence, <K>) = T` — confidence on a documented Stevens scale (interval per the FARS [confidence-as-bilattice-coordinate](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/) reading; `ordinal` if simpler is appropriate)
- `(instinct, derived-from-observations, [O1, O2, ...]) = T` — load-bearing provenance
- `(instinct, derived-at, <ts>) = T`
- `(instinct, consolidation-cycle-id, <cycle-id>) = T`

The provenance cell `derived-from-observations` is what makes [replay-determinism-verified](../../goals/replay-determinism-verified.md) extend to consolidation: the audit chain `instinct ← consolidation-cycle ← observations ← invocation-events` is intact and traversable.

## Acceptance

- [ ] An `objects/instinct-emission-rule.md` record exists, authorizing the rule.
- [ ] An instantiator at `runtime/consolidation_rules.py` (or equivalent) implements the emission per the consolidation runner's output.
- [ ] Instinct records land at `<substrate-root>/instincts/<dispatchable-slug>/<workitem-class>--<cycle-id>.md` (or a similar canonical path; finalize during implementation).
- [ ] Replay determinism: replay of the event log → same observations → same consolidation runner output → same instinct records.
- [ ] Tests cover: low-observation-count emits low-confidence instincts, divergent observations produce $\top$ on conflicting predicates, idempotency under replay.
- [ ] Provenance audit: starting from any instinct, walking `derived-from-observations` reaches the original invocation events; chain integrity is verified by a test.

## Progress cells

*(empty — task not yet started)*
