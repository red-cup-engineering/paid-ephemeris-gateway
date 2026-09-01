---
title: "Integrate rate-limit observations with the cost-quantale tokens dimension"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: rate-limit-observations-ground-availability-cells
depends-on: [implement-provider-header-self-counted-and-429-pathways, emit-cost-witnesses-on-every-settle-action]
requires-capabilities: [python-editing, cost-quantale]
theory-basis: [cost-discipline, rate-limit-as-time-windowed-availability-predication]
---


## Description

The cost-quantale's third dimension (`tokens_against_budget`) reads its value from the most-recent rate-limit observation for the dispatching endpoint.
The integration:

1. Per dispatch decision, the cost-projection step (in `instantiate_selection_by_cost`) walks observations for the candidate endpoint, picks the highest-evidence most-recent.
2. The observation's `requests-used` and `tokens-used` give consumed budget; rate-limit-rpm/tpm from the endpoint record give max budget; `tokens_against_budget = max - used`.
3. If the observation is `429-forced-zero`, `tokens_against_budget = 0` regardless of computed value (provider is authoritative).
4. The composite ProductCost includes this dimension; selection-by-cost reads it; bilattice-bound disqualification fires at `0`.

The integration is the load-bearing connection between M7's rate-limit observation pathways and the cost-quantale's selection-by-cost machinery.

## Acceptance

- [ ] `instantiate_selection_by_cost` reads the most-recent rate-limit observation per candidate endpoint.
- [ ] Highest-evidence-takes-precedence semantics implemented; tests verify `429-forced-zero` overrides newer-but-lower-evidence observations.
- [ ] Cost-quantale tokens-dimension reflects current budget; verified end-to-end.
- [ ] `0` budget produces F-disqualification; verified.
- [ ] Tests cover: full budget (cost-axis-only ranking), partially-consumed budget (partial cost), exhausted budget (disqualified).

## Progress cells

*(empty — task not yet started)*
