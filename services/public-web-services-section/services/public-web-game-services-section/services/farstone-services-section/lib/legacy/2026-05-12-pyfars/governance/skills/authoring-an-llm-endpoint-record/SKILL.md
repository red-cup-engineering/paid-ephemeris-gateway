---
name: "Authoring an LLM endpoint record"
description: "Creates an LLM endpoint record in work/endpoints/ as an outbound-only AgentRecord specialization with cost cells, rate-limit cells, and no signing key. Use when registering a new LLM provider/model that PyFARS will dispatch through, or when migrating an ad-hoc endpoint configuration to spec-conformant form."
---


## Requirements

- The [`m7-boundary-handedness-and-outbound-endpoints`](../../work/milestones/m7-boundary-handedness-and-outbound-endpoints.md) milestone's [`author-llm-endpoint-record-template`](../../work/tasks/engineering/author-llm-endpoint-record-template.md) task is complete (or the template exists at `governance/templates/llm-endpoint.md`).
- The corresponding boundary record exists in [`work/boundaries/`](../../work/boundaries/) with `handedness: outbound-only`; author it first per [`authoring-a-boundary-record`](authoring-a-boundary-record.md) if not.
- The provider's API surface is documented sufficiently to populate cost-quantale cells (per-token input cost, per-token output cost, monthly rate limits, per-minute rate limits).

## Steps

1. Read the LLM endpoint template at `governance/templates/llm-endpoint.md` and the [`llm-endpoint-record`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md) theory object.
2. **Identify the slug** as `<provider>-<model>-<variant>` (e.g., `anthropic-claude-opus-4-7`, `openai-gpt-4o-2024-08`).
3. Author frontmatter with:
   - `type: llm-endpoint`
   - `boundary:` — slug of the corresponding outbound boundary
   - `provider:`, `model:`, `version:`
   - `cost-quantale:` — sub-fiber with `(input-tokens-per-dollar, output-tokens-per-dollar, fuel-per-call)` per the product Lawvere quantale per [`extend-cost-quantale-to-product-shape`](../../work/tasks/engineering/extend-cost-quantale-to-product-shape.md)
   - `rate-limits:` — sub-fiber with `(per-minute-tokens, per-day-tokens, per-month-tokens, concurrent-requests)`
   - `availability:` — bilattice cell, settled by rate-limit observations per [`integrate-rate-limit-observations-with-cost-quantale-tokens-dimension`](../../work/tasks/engineering/integrate-rate-limit-observations-with-cost-quantale-tokens-dimension.md)
   - **No `signing-key:`** — outbound-only endpoints do not sign witnesses; the substrate-native dispatcher signs on behalf of the call
4. Author body sections per the theory object's spec:
   - **What this endpoint is** — provider, model, version, capability surface
   - **Cost discipline** — how the cost-quantale cells are populated; cite [`cost-discipline-as-substrate-cells`](../../work/goals/cost-discipline-as-substrate-cells.md)
   - **Rate-limit handling** — how observations of provider headers and 429 responses settle availability; cite [`design-evidence-graded-rate-limit-observation-projector`](../../work/tasks/engineering/design-evidence-graded-rate-limit-observation-projector.md)
   - **Selection eligibility** — what conditions make this endpoint eligible for dispatch selection per [`dispatch-chooses-endpoint-by-cost-quantale`](../../work/goals/dispatch-chooses-endpoint-by-cost-quantale.md)
   - **What this endpoint is NOT** — per [`author-honest-non-claims-section`](../duties/author-honest-non-claims-section.md): "this endpoint is not a sovereign peer", "this endpoint does not sign its own witnesses"
5. Cross-reference the boundary record: ensure the boundary's `peer-class: llm-endpoint` matches and references this endpoint slug.

## Outcomes

A new file in [`work/endpoints/`](../../work/endpoints/) with `type: llm-endpoint`, complete cost-quantale cells, rate-limit cells, and explicit non-claims.
Dispatch's cost-axis composition reads the cost-quantale cells; the rate-limit projector reads the rate-limit cells; selection-by-cost considers this endpoint as a candidate when its `availability:` cell settles to truthy.

## Discipline notes

- **Outbound-only is structurally distinct from bidirectional.** An LLM endpoint is *not* a peer in any classical-swarm sense.
  Per [`llm-swarms-fail-classical-conditions`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/theories/swarm-intelligence/theorems/llm-swarms-fail-classical-conditions.md), the endpoint violates scalability, local-determinism, and local-rule-coordination.
  Calling it a "swarm participant" is overclaim; call it an outbound-only dispatch target.
- **Cost cells are settled, not asserted.** When the provider changes pricing, update the cost-quantale cells via [`modify-work-record`](../powers/modify-work-record.md); the closure-rule subsystem will re-settle eligibility on the next dispatch tick.
  Don't pre-bake "expected cost" into dispatch logic.
- **Availability is evidence-graded.** A `429` response from the provider is high-evidence for `availability = ⊥`; an empty rate-limit-remaining header is moderate-evidence.
  The bilattice settles availability as the join of evidence cells, not as a single boolean.
- **Per [`enforce-llm-endpoint-record-invariants-at-load-time`](../../work/tasks/engineering/enforce-llm-endpoint-record-invariants-at-load-time.md)**, the substrate validates record completeness on load; a record missing cost-quantale cells fails to load rather than dispatching with $\bot$ values.
