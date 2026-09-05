---
title: "Rate-limit observations ground availability cells"
type: goal
milestone: m7-boundary-handedness-and-outbound-endpoints
status: open
horizon: captured
theory-basis: [rate-limit-as-time-windowed-availability-predication, observation-fiber-isolation]
tasks:
  - design-evidence-graded-rate-limit-observation-projector
  - implement-provider-header-self-counted-and-429-pathways
  - integrate-rate-limit-observations-with-cost-quantale-tokens-dimension
---


After this goal, rate-limit-budget [observations](../observations/_index.md) ground availability predications on each endpoint with bilattice-graded evidence.
The observation's `observed-via` cell carries `provider-header` (high evidence), `self-counted` (medium evidence), or `429-forced-zero` (maximum evidence on at-zero plus a cooldown derived from `retry-after`).
Dispatch reads the most-recent observation; cost-quantale's tokens-against-budget dimension is grounded in those readings.

This goal closes the M3-tier feedback loop ([`rate-limit-observations-close-loop`](rate-limit-observations-close-loop.md)) for the *outbound endpoint* case specifically.
M3's loop is general; M7's specifies the discipline for endpoint-class participants.

## Why

The captain's outbound-endpoint use case requires real-time rate-limit awareness.
An endpoint at `requests-used = rate-limit-rpm` mid-window is unavailable until the window resets.
Without that being a substrate fact, dispatch keeps trying and gets 429s; with it, dispatch routes around the exhausted endpoint until the next window.

The M3 feedback loop already handles flag-cell rate-limit reading.
M7 generalizes to **multi-window, evidence-graded budget tracking**: the observation entity carries window-start, window-duration, requests-used, tokens-used, observed-at, observed-via — substantially richer than a single flag-cell.

## Theory grounding

**1.
Rate-limit as time-windowed availability predication** ([FARS open question](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/rate-limit-as-time-windowed-availability-predication.md)).
Rate-limit availability is a **tracking-stage observation**, not a static field.
The endpoint record carries the rate-limit *parameters* (max requests per window, max tokens per window, window duration); the *current budget* is held on a separate observation entity that dispatch consults via walk-most-recent-first. **This is what makes the discipline compose with [observation-fiber-isolation](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/observation-fiber-isolation.md)**: the budget-state isn't on the endpoint record (which would pollute the endpoint's fiber with metric data), it's on observations referencing the endpoint.

**2.
Evidence-grading as bilattice value** (FARS [`witness`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/) — when authored).
Three observation pathways with different evidence levels:

- **`provider-header`** — the inference response carries explicit rate-limit headers (e.g., `X-RateLimit-Remaining`, `X-RateLimit-Reset`).
  High evidence; provider is authoritative.
- **`self-counted`** — the runtime counts its own requests/tokens since window-start.
  Medium evidence; substrate's count may diverge from provider's (clock skew, retried requests counted twice).
- **`429-forced-zero`** — the endpoint returned 429 Too Many Requests.
  Maximum evidence on `at-zero` plus a cooldown derived from `retry-after`. **The 429 is itself evidence: provider has explicitly told us we're rate-limited.**

The substrate's most-recent-first walk picks the highest-evidence cell when multiple observations conflict.

**3.
Bilattice supersession** (per FARS observation discipline).
Newer observations supersede older ones in the most-recent-first fold. **Higher evidence outranks newer-but-lower-evidence**: a `429-forced-zero` from 30 seconds ago outranks a `self-counted` from 1 second ago indicating capacity.
This is the bilattice's $\leq_t$ vs $\leq_k$ structure: knowledge increase is monotone in $\leq_k$, but specific evidence-laden observations supersede speculative ones in $\leq_t$.

### Design constraints from this grounding

- **The observation entity is what carries the budget state.** Per fiber-isolation: `(observation, observes-rate-limit-of, <endpoint>) = T`, plus the budget cells on the observation.
  The endpoint record's frontmatter doesn't change; only the observation's cells do.
  Dispatch walks from endpoint to observations.
- **`observed-via` is required and read by selection.** Without `observed-via`, the substrate cannot evidence-grade the budget claim.
  Selection rules (specifically [`selection-by-cost`](dispatch-chooses-endpoint-by-cost-quantale.md)) read `observed-via` and weight observations accordingly.
- **A 429 emits multiple cells**: the `at-zero` budget claim, the `retry-after` cooldown duration, and a normative cell (`(endpoint, was-rate-limited, true) = T`) that downstream review/audit reads.

## Acceptance

- [ ] A projector at `runtime/rate_limit_observation_projector.py` (or equivalent) emits rate-limit observations from each three pathway.
- [ ] After every endpoint invocation: provider-header observations land if headers are present; self-counted observations land regardless; 429-forced-zero observations land on 429 responses.
- [ ] The cost-discipline's tokens-against-budget dimension reads from the most-recent rate-limit observation; cost-quantale composition uses the budget value.
- [ ] Tests cover: clean response with headers (provider-header observation), clean response without headers (self-counted observation only), 429 response (429-forced-zero observation, plus cooldown enforcement), conflicting observations (most-recent supersedes; high-evidence outranks low-evidence-but-newer).
- [ ] No fiber pollution: the endpoint record's frontmatter is unchanged across many invocations.
