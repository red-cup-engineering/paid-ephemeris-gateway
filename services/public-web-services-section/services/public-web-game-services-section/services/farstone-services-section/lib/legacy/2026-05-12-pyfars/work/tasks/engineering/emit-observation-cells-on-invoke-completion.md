---
title: "Emit observation cells when an invocation completes"
type: task
area: engineering
status: open
horizon: later
milestone: m4-memory-feedback
goal: observation-cells-from-invocations
depends-on: [design-invocation-to-observation-projector]
requires-capabilities: [python-editing, projector-framework]
theory-basis: [observation, projector-framework-counit]
---


## Description

Implement `runtime/observation_projector.py` per the spec written by [`design-invocation-to-observation-projector`](design-invocation-to-observation-projector.md).
Wire it into the dispatch graph's `invoke_agent_node` so that a completed invocation produces the observation records before the node returns.

The implementation must be idempotent on `(invocation-id, observation-method)` — re-emitting from a replayed event log produces no duplicate records (or, if duplicates would arise from divergent values, a `⊤` cell on the affected predicate per the [`anomaly-surfacing-via-contradiction-cells`](../../goals/anomaly-surfacing-via-contradiction-cells.md) discipline).

## Acceptance

- [ ] `runtime/observation_projector.py` exists and exports a `project_invocation(result, session_id) -> List[ObservationRecord]` function.
- [ ] The dispatch graph's `invoke_agent_node` calls the projector after each invocation and writes the records to the substrate's observation location.
- [ ] Idempotency: replaying the same invocation event produces no new records (or a `⊤` if values diverge).
- [ ] The dispatchable's frontmatter is *not* modified — fiber-isolation preserved (verified by a test that asserts unchanged dispatchable record after observations land).
- [ ] Tests cover: success path emits 4 standard observations, error path emits outcome plus partial latency/tokens, rate-limited emits the rate-limit cells too (joining with [`lift-rate-limit-headers-into-substrate-cells`](lift-rate-limit-headers-into-substrate-cells.md)).

## Progress cells

*(empty — task not yet started)*
