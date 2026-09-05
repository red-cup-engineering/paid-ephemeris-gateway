---
title: "Lift rate-limit headers from agent invocations into substrate cells"
type: task
area: engineering
status: open
horizon: doing
milestone: m3-continuous-loop
goal: rate-limit-observations-close-loop
depends-on: []
requires-capabilities: [python-editing]
theory-basis: [operations-loop]
---


## Description

PydanticAI's `Agent.run()` returns a result object.
For OpenAI-compatible endpoints (Cerebras, Groq, NVIDIA NIM, Mistral, HF Router — all the free-tier endpoints currently registered) the underlying response carries rate-limit headers that PydanticAI's HTTP client preserves in some form (verify the exact attribute path against PydanticAI 1.89.1; it's typically `result.usage` or `result._raw_response.headers`).

After each `agent_invoked` witness, project the relevant headers into substrate cells:

- `x-ratelimit-remaining-requests` → `(<endpoint-slug>, rate-limit-remaining-requests, "<n>") = T`
- `x-ratelimit-remaining-tokens` → `(<endpoint-slug>, rate-limit-remaining-tokens, "<n>") = T`
- `x-ratelimit-reset-requests` → `(<endpoint-slug>, rate-limit-reset-requests, "<n>") = T`
- (and similar for tokens-reset, daily-remaining, etc.)

Plus a derived `rate-limit-remaining` (no axis qualifier) computed as the minimum of the per-axis remaining values, since `eligibility-by-rate-limit` reads the unqualified predicate.

Implementation locus: a new `runtime/observation_projector.py` (or extension of `dispatch_graph.invoke_agent_node`) that runs after agent invocation, parses the response's headers, and either writes the cells directly to the `PredicationStore` (impure, but in-process) or emits witnesses that a follow-up projector consumes on the next tick (purer; matches the substrate-purity discipline).

## Acceptance

- [ ] After a tick where `invoke_agent_node` runs against an endpoint with rate-limit headers, the next tick's loaded store contains the corresponding cells.
- [ ] The derived `rate-limit-remaining` cell carries the minimum of the per-axis remaining values.
- [ ] When `rate-limit-remaining` reads `"0"`, `eligibility-by-rate-limit` disqualifies the endpoint on the next tick.
- [ ] A response without rate-limit headers (e.g., a `provider: test` endpoint) produces no cells and no errors.
- [ ] Tests cover the happy path, missing-headers, and the disqualification interaction end-to-end.

## Progress cells

*(empty — task not yet started)*
