---
title: "Author the LLMEndpointRecord template per FARS spec"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: llm-endpoint-record-fully-spec-conformant
depends-on: [author-boundary-record-type]
requires-capabilities: [substrate-authoring, fars-spec-conformance]
theory-basis: [llm-endpoint-record, agent-record]
---


## Description

Author `governance/templates/llm-endpoint.md` with the full FARS [`LLMEndpointRecord`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md) spec frontmatter:

```yaml
---
title: "<provider> <model>"
type: llm-endpoint
slug: <provider>--<model>
status: active | deprecated
provider: <provider-slug>            # cerebras | groq | nvidia-nim | mistral-la-plateforme | …
model-name: <provider-side-model-id>
model-version: <version-string>
base-url: <openai-compatible-url>
auth-env-var: <ENV_VAR_NAME>          # the variable NAME, never the secret
handedness: outbound-only             # FIXED — invariant
provides-capabilities: [<capability>...]
work-types: [<work-type>...]
context-window-tokens: <integer>
supports-tool-calling: true | false
supports-structured-output: true | false
grade: small | mid | large | frontier
cost-per-token-in: <dollars>          # may be 0 for free tier
cost-per-token-out: <dollars>
monthly-budget-tokens: <integer-or-null>
rate-limit-rpm: <integer>
rate-limit-rpd: <integer-or-null>
rate-limit-tpm: <integer>
rate-limit-tpd: <integer-or-null>
enrolled-at: <ISO-timestamp>
enrolled-by: <agent-record-slug>      # the office that admitted this endpoint
survey-cited: <text-record-slug>
deprecated-at: <ISO-timestamp-or-null>   # populated on deprecation
---
```

Author at least three example endpoint records under `governance/endpoints/`: - `governance/endpoints/cerebras--llama-3.3-70b.md` - `governance/endpoints/groq--llama-3.3-70b.md` - `governance/endpoints/nvidia--llama-3.3-70b.md`

Each example demonstrates the full spec; the values are populated from the survey cited (e.g., [survey-of-free-cloud-model-endpoints-may-2026](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/survey-of-free-cloud-model-endpoints-may-2026.md) when accessible).

## Acceptance

- [ ] `governance/templates/llm-endpoint.md` exists with the full FARS frontmatter.
- [ ] At least three example endpoints under `governance/endpoints/`.
- [ ] Each example carries every required FARS field; missing fields produce $\top$ on load.
- [ ] No `signing-key:` field in any endpoint record (FARS invariant).
- [ ] All endpoints have `handedness: outbound-only` (FARS invariant).

## Progress cells

*(empty — task not yet started)*
