---
title: "Design the evidence-graded rate-limit observation projector"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: rate-limit-observations-ground-availability-cells
depends-on: [enforce-llm-endpoint-record-invariants-at-load-time]
requires-capabilities: [projector-framework, observation-design]
theory-basis: [rate-limit-as-time-windowed-availability-predication, observation-fiber-isolation]
---


## Description

Specify a projector that takes inference-call response context (provider headers, response status, byte counts) and produces rate-limit observation records under `<substrate-root>/observations/rate-limit/<endpoint-slug>/<window-start>.md`.

The projector emits per-call observations with `observed-via` carrying one of:

- `provider-header` — the response had explicit rate-limit headers (`X-RateLimit-Remaining`, etc.).
  High-evidence; provider is authoritative.
- `self-counted` — no headers; the runtime counts requests/tokens since window-start.
  Medium-evidence.
- `429-forced-zero` — response was 429.
  Maximum-evidence on `at-zero`; cooldown derived from `retry-after`.

Each observation carries: window-start, window-duration, requests-used, tokens-used, observed-at, observed-via, plus a baseline (rate-limit-rpm/tpm from the endpoint record).

The design document goes at `work/specs/rate-limit-observation-projector.md`.

## Acceptance

- [ ] Spec at the path above.
- [ ] Spec describes: input context shape (response object + endpoint record), output observation shape, evidence-grade assignment logic, the most-recent-first walk discipline for consumers.
- [ ] Spec covers all three pathways with worked examples.
- [ ] Spec specifies counit-law verification: re-rendering observation set into call-context yields original-equivalent.

## Progress cells

*(empty — task not yet started)*
