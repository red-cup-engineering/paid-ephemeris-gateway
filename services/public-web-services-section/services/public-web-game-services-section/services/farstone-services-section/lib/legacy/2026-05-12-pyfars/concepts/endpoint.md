---
type: concept
class: inference-service
status: draft
depends-on: [agent, entity, tool]
---

# Endpoint

An inference service the polity's dispatch selects from when an [agent](agent.md) needs computational backing — typically an LLM endpoint (Cerebras, Groq, NVIDIA NIM, HuggingFace Router, Mistral, etc.), but possibly a search service, a code-execution sandbox, or any external compute resource. **Endpoints are not agents; they are services agents use.**

Per the captain's polity-level framework: "LLM endpoint records are not agents; they live at `assets/computing/endpoints/` — they are inference services the dispatcher selects from, not roles."

## Endpoint vs. agent

The distinction is structural:

- **Agent** = a role, an identity, a doer.
  An agent has skills, performs actions, is accountable (under delegation).
  The agent's identity persists across the sessions it runs.
- **Endpoint** = a service, an infrastructure, a means.
  An endpoint receives requests (typically with a model name and a prompt), produces responses, has rate limits and costs, but no role-identity in the polity.

A single agent may be backed by *different* endpoints across sessions (e.g., a Claude Code session may run on Anthropic's API; a fallback session may run on Groq for the same agent).
The agent persists; the endpoint is selected per session.

## Endpoint records

In PyFARS substrate, endpoints are records under `governance/assets/computing/endpoints/<slug>.md` (or per the polity's directory taxonomy).
Each endpoint record carries:

- **`provider`**: the service provider (cerebras, groq, anthropic, etc.).
- **`model`**: the specific model exposed (claude-sonnet-4-5, llama-3.3-70b, etc.).
- **`base-url`**: the API base URL.
- **`rate-limits`**: the endpoint's rate-limit budget (requests-per-minute, tokens-per-minute).
- **`provides-capabilities`**: what computational shape the endpoint offers (language, vision, tool-use, etc.) — these ARE [capabilities](capability.md) when associated with the endpoint, since they describe what the endpoint can compute.
- **`provider-rank`**: priority for dispatch selection (free-tier endpoints typically prefer the cheapest; paid endpoints may rank by latency).

## Endpoint in dispatch

For dispatch: - A workitem assigned to an agent must be backed by some endpoint when the agent runs. - The dispatch closure (per [eligibility-by-capabilities](../objects/eligibility-by-capabilities.md)) reads the agent's required capabilities and selects an endpoint that provides them. - Provider-rank cells determine preference among multiple eligible endpoints. - Rate-limit-budget cells gate dispatch — an endpoint with zero remaining budget is excluded for the tick.

The dispatch decision IS: - Workitem → assigned to agent (per eligibility-by-skills, etc.). - Agent + workitem → backed by endpoint (per endpoint selection rules).

These are two separate selections: agent first, endpoint second.
The endpoint binding is per-session, not per-agent.

## Endpoint as resource

In the entity hierarchy, an endpoint is an entity that's also a [resource](resource.md) (it has a system record) — but it is *not* an agent-form.
It does not perform acts in the polity's sense; it provides inference for agents that perform acts.

Endpoints might also be classified as a kind of [tool](tool.md), since agents *invoke* endpoints.
The classification is somewhat overlapping: an endpoint is a service-tool, but its discipline (rate limits, provider-rank, capability declaration) is rich enough to warrant its own concept.

## What this concept does not yet specify

- The complete endpoint-selection discipline.
  Provider-rank, rate-limit-budget, and capability-matching are the main axes; finer policies (cost-vs-latency tradeoffs, geographic proximity, vendor preferences) are open.
- Endpoint health monitoring.
  When an endpoint is degraded (high latency, error rate up), should dispatch deprioritize it?
  The discipline is partly settled.
- Endpoint authentication.
  Most endpoints require API keys; the discipline for managing keys (where they live, how they're rotated) is open.
- Endpoint composition (chaining multiple endpoints for one inference).
  The discipline is open.
