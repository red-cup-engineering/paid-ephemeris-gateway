---
title: "Implement the three rate-limit observation pathways"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: rate-limit-observations-ground-availability-cells
depends-on: [design-evidence-graded-rate-limit-observation-projector]
requires-capabilities: [python-editing, http-header-parsing]
theory-basis: [observation-fiber-isolation]
---


## Description

Implement the projector designed in [`design-evidence-graded-rate-limit-observation-projector`](design-evidence-graded-rate-limit-observation-projector.md).
Wire it into the dispatch graph's `invoke_agent_node` — every endpoint inference call passes its response (and any 429 error) through the projector.

The implementation walks the response in priority order:

1. If response is 429: emit `observed-via: 429-forced-zero` observation with `at-zero=true`, `retry-after=<from-header>`.
2. Else if response has rate-limit headers: emit `observed-via: provider-header` observation with parsed values.
3. Else: emit `observed-via: self-counted` observation incrementing request/token counters from the prior window's tail-most observation.

Idempotent on `(endpoint, call-id)`: replay produces the same observations.

## Acceptance

- [ ] `runtime/rate_limit_observation_projector.py` (or extends `observation_projector.py`) handles the three pathways.
- [ ] Wired into `invoke_agent_node`; tests verify rate-limit observation emission per call.
- [ ] Provider-header pathway tested with sample responses from at least three providers.
- [ ] Self-counted pathway tested for accumulation correctness across multiple calls within one window.
- [ ] 429-forced-zero pathway tested; cooldown emission verified.
- [ ] No fiber pollution — endpoint records' frontmatter is unchanged.

## Progress cells

*(empty — task not yet started)*
