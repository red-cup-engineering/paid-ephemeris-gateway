---
title: "Rate-limit observations close the feedback loop"
type: goal
milestone: m3-continuous-loop
status: open
horizon: soon
theory-basis: [operations-loop, recurrent-practice, dispatch-readiness]
tasks:
  - lift-rate-limit-headers-into-substrate-cells
---


After this goal, rate-limit headers from the LLM endpoints' HTTP responses are lifted out of agent-invocation responses and projected into substrate cells (`(<endpoint>, rate-limit-remaining, "<n>") = T`) that the next tick reads.
The existing `eligibility-by-rate-limit` closure rule starts firing on real data instead of only on hand-authored test cells.

## Why

The `eligibility-by-rate-limit` closure rule is already in place — it's one of the default rules per `runtime/eligibility_rules.py`.
But it only fires when an endpoint's `rate-limit-remaining` cell is `0` in the substrate, and right now nothing in the runtime writes that cell.
The disqualification path is wired but the input side is dark.

This goal lights the input side: every `agent_invoked` witness produced by the dispatch graph carries a response whose HTTP headers (where applicable) include `x-ratelimit-remaining-requests`, `x-ratelimit-remaining-tokens`, etc. A small projector lifts those into `rate-limit-remaining` cells the next tick reads.

## Theory grounding

**1.
Observation-fiber-isolation** ([`flatfile-agentic-resource-system/concepts/observation-fiber-isolation`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/observation-fiber-isolation.md)).
Observations live on their own fiber, not on the operational fiber they observe.
The endpoint's rate-limit-remaining is an *observation about* the endpoint, not a predication declared by the endpoint itself.
The substrate carries observations as cells under the observing entity's fiber (the engine, in this case) referencing the observed entity (the endpoint). **This means the projector emits cells whose subject is `<endpoint-slug>` but whose source is the engine's witness chain, not the endpoint's authored record.** Audit can trace which observation came from which tick because the witness chain is preserved.

**2.
Event-sourcing direction** ([`flatfile-agentic-resource-system/concepts/event-sourcing`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/event-sourcing.md), per `governance/decisions/event-log-is-jsonl.md`).
The witness in the JSONL log is canonical; the substrate cell is derived.
The projector's output (rate-limit cells) must be reproducible by replaying the witness chain. **A projector that consults out-of-substrate state (live network calls, current wall-clock time without recording it) breaks event-sourcing replay determinism.** The HTTP headers must be captured in the `agent_invoked` witness's `details` at invocation time; the projector reads those details, not a re-fetched response.

**3.
Bilattice values for observed numbers** ([`predication-categories/objects/bilattice`](../../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/bilattice.md), referenced by `substrate/bilattice.py`).
The bilattice carries truth, not magnitude.
`(<endpoint>, rate-limit-remaining, "47") = T` means "it is true that the remaining count is 47," not "47 remaining."
When the next observation produces `(<endpoint>, rate-limit-remaining, "23") = T`, the new cell's truth value joins with the old via `∨_k`; both hold true at different points (47 then 23), but at the snapshot the closure runner reads, the most recent observation dominates because **the projector should also emit `(<endpoint>, rate-limit-remaining, <old>) = F` when superseding** — this is how observation-supersession stays in the algebra rather than in code.

### Design constraints from this grounding

- **Capture rate-limit headers in the `agent_invoked` witness's `details` at invocation time**, not in a separate observation event later.
  The witness is the canonical source; cells derive from it.
- **One cell per axis per observation.** Don't conflate `remaining-requests`, `remaining-tokens`, `remaining-rpm`, `remaining-rpd` into a single `remaining` cell — the eligibility-by-rate-limit rule reads the per-axis cells, and a derived `rate-limit-remaining` cell (the minimum) can be computed by a sibling closure rule.
- **Supersede previous observations explicitly.** When projecting cell `(<endpoint>, rate-limit-remaining-tokens, "23") = T`, if the prior observation was `(<endpoint>, rate-limit-remaining-tokens, "47") = T`, emit `(<endpoint>, rate-limit-remaining-tokens, "47") = F` to retract the older value.
  Otherwise the closed store carries both `T` cells indefinitely and the eligibility-by-rate-limit rule sees stale data.
- **Test the round-trip end-to-end** (witness → projector → cell → eligibility-by-rate-limit → disqualification).
  The witness side is straightforward; the projector side is where bugs hide.
  Replay-determinism testing (the parallel `replay-determinism-verified` goal) is what guards this.

## Acceptance

- [ ] After a tick where `invoke_agent_node` runs and the endpoint's response carries rate-limit headers, the next tick's loaded `PredicationStore` contains `(<endpoint-slug>, rate-limit-remaining, "<n>") = T` cells reflecting those headers.
- [ ] When the rate-limit-remaining cell for an endpoint reads `0`, `instantiate_eligibility_by_rate_limit` fires (already true), `select_winners_node` excludes that endpoint (already true), and the lifecycle's tick witnesses the disqualification.
- [ ] Tests cover: endpoint with no rate-limit headers (no cells lifted), endpoint with headers (cells lifted), endpoint hits zero (next tick disqualifies it).
- [ ] The projection is replay-deterministic: replaying the event log reproduces the same cells in the same order.
