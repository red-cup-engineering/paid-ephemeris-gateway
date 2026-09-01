---
title: "Implement the cost ledger as substrate projection"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: cost-discipline-as-substrate-cells
depends-on: [emit-cost-witnesses-on-every-settle-action]
requires-capabilities: [python-editing, projector-framework]
theory-basis: [projector-framework-counit, cost-discipline]
---


## Description

The cost ledger is a *projector* over substrate cost-witnesses, not a stored aggregate.
Per the projector framework's counit law: `project(witnesses) → ledger; render(ledger) → witnesses` round-trips with canonical-form equivalence.

The projector aggregates witnesses by `(endpoint, period)` (where period defaults to per-rate-limit-window but is configurable) and produces per-endpoint per-period totals along each cost dimension.
Re-rendering the ledger produces the same witnesses (modulo canonical form).

The projector lives at `runtime/projectors/cost_ledger.py` and integrates with the existing projector framework.
CLI exposure: `pyfars run` exposes a UDS endpoint `GET /cost/ledger?since=<ts>&until=<ts>` that returns the projection.
(CLI verbs stay lifecycle-only per the [wiring-protocols spec](../../../governance/specifications/wiring-protocols.md); operational verbs go through the engine API.)

## Acceptance

- [ ] `runtime/projectors/cost_ledger.py` exists; integrates with the projector framework.
- [ ] Counit verification: round-tripping a witness set through ledger projection and back yields the same witnesses (canonical-form equivalence).
- [ ] `GET /cost/ledger` returns per-endpoint, per-period totals across the three product-quantale dimensions.
- [ ] Tests cover: empty witness set (zero ledger), single-endpoint ledger, multi-endpoint ledger, period boundary correctly partitions.
- [ ] No regression: existing dispatches continue producing witnesses; ledger correctness verified end-to-end.

## Progress cells

*(empty — task not yet started)*
