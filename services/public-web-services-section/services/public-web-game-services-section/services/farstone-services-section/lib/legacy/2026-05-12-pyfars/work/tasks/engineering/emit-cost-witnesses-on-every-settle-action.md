---
title: "Emit cost witnesses on every settle action"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: cost-discipline-as-substrate-cells
depends-on: [extend-cost-quantale-to-product-shape]
requires-capabilities: [python-editing, witness-emission]
theory-basis: [cost-discipline, first-class-provenance]
---


## Description

Every closure-rule firing that constitutes a settle-action emits a `CostWitness` carrying the `ProductCost` consumed (settlement fuel × dollars × tokens-against-budget).
The witness lives on the substrate's cost-tracking channel; subsequent reads (for ledger projection, for selection-by-cost) walk these witnesses.

Touch points: - `runtime/closure_runner.py` — emits a fuel-only witness per rule firing (in-process; dollars=0, tokens=N_max). - `runtime/agent_compiler.py` and the dispatch graph's `invoke_agent_node` — emit full-product witnesses for endpoint dispatches, with dollars and tokens populated from the endpoint's response. - A new utility `runtime/cost_witness.py` consolidates the witness-emission logic.

Each witness binds to its causing rule firing via `RuleFiring` provenance and the `rsv_hash` discipline.
A settle-action without a corresponding cost-witness is non-conformant — tests will verify no settle-action goes un-witnessed.

## Acceptance

- [ ] `runtime/cost_witness.py` exists and exports `emit(action_id, cost: ProductCost, rsv_hash, rule_firing)`.
- [ ] Every closure-rule firing emits a cost witness (fuel-only for in-process, full-product for endpoint dispatches).
- [ ] Tests verify no settle-action lacks a witness across a full tick.
- [ ] Replay determinism: replaying the event log produces the same cost witnesses.
- [ ] Witnesses carry full `RuleFiring` + `rsv_hash` provenance.

## Progress cells

*(empty — task not yet started)*
