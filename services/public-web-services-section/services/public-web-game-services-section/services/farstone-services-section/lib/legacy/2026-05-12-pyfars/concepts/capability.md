---
type: concept
class: agent-intrinsic-shape
status: draft
depends-on: [agent, skill, tool, action]
---

# Capability

The intrinsic computational shape of an [agent](agent.md) — what the agent IS, not what it knows or what it invokes.
Capabilities describe the agent's modalities, internal cognition, and inherent abilities.
They are agent-level attributes that determine *what kinds of work the agent can engage with at all*, before any specific procedural knowledge ([skill](skill.md)) or external mechanism ([tool](tool.md)) enters the picture.

Distinguishing capability from skill and tool is the load-bearing move: pre-predication-theory PyFARS used "capability" loosely to mean any of these.
The corrected framing distinguishes:

- **Capability** = agent-intrinsic (what the agent IS).
- **Skill** = agent-known procedure (what the agent KNOWS).
- **Tool** = external mechanism (what the agent INVOKES).

## What a capability looks like

Capabilities are typically modal or kind-of-cognition attributes:

- **Language capability** — the agent processes and produces natural language.
- **Vision capability** — the agent processes images.
- **Audio capability** — the agent processes speech or other audio.
- **Code-generation-internal** — the agent produces code without external compilation/sandbox (just "writes code as text").
- **Multi-step planning** — the agent decomposes goals into causally-dependent action sequences (per upstream goal-directed-planning).
- **Persistent-state capability** — the agent maintains state across interactions (per upstream persistent-state).
- **Tool-use** — the agent can engage with tool-call schemas (this is somewhat boundary-crossing: tool-use is the *capability* to use tools, distinct from the tools themselves).

The rule-of-thumb test: if removing the capability changes what *kinds* of work the agent can engage with at all, it's a capability.
If removing it just changes which *specific procedures* the agent knows, it's a skill.
If removing it just changes which *external mechanisms* the agent can call, it's a tool.

## Capabilities and the three-condition characterization

Per upstream [agentic-system](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/concepts/agentic-system.md), the three conditions (environmental action, goal-directed planning, persistent state) are partly capability-shaped:

- *Goal-directed planning* is a capability — the agent's intrinsic ability to decompose and select.
- *Persistent state* is a capability — the agent's intrinsic ability to maintain state.
- *Environmental action* is enabled by *tools* (not a capability of the agent in isolation; it requires tool-mediated effects on the environment).

The three-condition characterization, read through this distinction: an agentic-system is an agent with the planning + state capabilities, deployed with tools that grant it environmental-action.

## Capabilities in dispatch

For dispatch: - A workitem declares `requires-capabilities: [...]
` — what kind of agent shape is needed. - An agent declares `provides-capabilities: [...]
` — what its intrinsic shape is. - [Eligibility-by-capabilities](../objects/eligibility-by-capabilities.md) checks coverage.

Capabilities discriminate at a coarser grain than skills: - *Capability* check filters out the wrong *kind* of agent (e.g., a workflow without language-capability cannot be assigned writing-shaped work). - *Skill* check filters out the right kind of agent without the right *procedural knowledge*. - *Tool* check filters out cases where the agent has the kind and the knowledge but lacks access to the needed external mechanism.

A workitem typically requires a coherent triple: a capability to engage at all, a skill to do the specific procedure, tools to effect the result.
When the requirements don't compose (e.g., a skill that requires a capability the agent lacks), the workitem is ill-formed and surfaces at validation.

## Migration from existing PyFARS usage

The current PyFARS realization mixes capability/skill/tool in `provides-capabilities:` declarations on agent and endpoint records.
Common existing values include `tool-use`, `sandbox-execution`, `internet-access`, `read`, `write` — some of these are capabilities (tool-use is borderline; agents either have or don't have the ability to invoke tool-call schemas), some are tool-access (sandbox-execution is access to a sandbox tool), some are skill-shaped (`read`/`write` are usually about workitem-side touched-paths, not agent-side capability).

The corrected discipline: - `provides-capabilities:` should describe agent-intrinsic shape (language, vision, multi-step planning, etc.). - `provides-skill:` should describe agent procedural knowledge (named procedures the agent knows). - Tool-access should be expressed as `accessible-tools:` (or implicitly via the harness that exposes the agent).

Existing records mixing these will need migration; the migration is friction for governance refactor and a finding to surface as work-records get audited under the new taxonomy.

## What this concept does not yet specify

- The complete capability vocabulary.
  PyFARS-the-package commits to a default set; polities may extend.
- The precise discipline for when an attribute is capability vs. tool-access.
  The boundary is conceptually clear but operationally fuzzy in some cases.
- Capability composition / hierarchy.
  A `multi-modal` capability might subsume `language` and `vision`; the discipline for capability-subsumption is partly upstream, partly open.
- The relation to bounded rationality.
  Per upstream agent-foundations, capabilities are bounded; the discipline for declaring resource bounds (compute, memory, attention) as capability-attributes is open.
