---
type: concept
class: invocable-mechanism
status: draft
depends-on: [agent, skill, action, capability]
realizes: [tool-schema]
---

# Tool

An external invocable mechanism that an [agent](agent.md) uses, via a [skill](skill.md), to produce an [action](action.md) whose effect goes beyond the agent's own internal [capabilities](capability.md).
Tools are how shit gets done when "thinking about it" isn't enough.

Realizes (in PyFARS-realization terms) the upstream notion of [tool-schema](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/concepts/tool-schema.md) and the broader notion of agent-invocable instruments.
Whatever the agent calls *out* to in order to effect system change — that's a tool.

## What distinguishes a tool from a capability

- **Capability** is what an agent IS (computationally) — its intrinsic abilities.
  An LLM agent's language-capability, planning-capability, code-generation-capability are all internal.
  They don't require external invocation.
- **Tool** is what an agent INVOKES — a mechanism that the agent calls out to.
  Even when a tool is "embedded" (e.g., bundled with the agent runtime), it remains a tool: it has an interface, it's invokable, it's distinguishable from the agent's own thinking.

The boundary is sometimes contextual.
A "calculator" tool versus the agent's "internal arithmetic capability" — depending on the agent, arithmetic might be internal (for a sufficiently strong model) or tool-mediated (for a weaker model).
The substantive question for the polity is: what's invoked vs. what's intrinsic? — and the answer is per-agent.

## What a tool has

A tool, in PyFARS terms, has:

- **A schema** — typed inputs and typed outputs (per upstream tool-schema).
  The schema is what makes the tool *invocable*: the agent forms a tool-call conforming to the schema and the tool produces a result.
- **An invocation surface** — how is the tool called?
  Examples: a CLI command (a verb, like `pyfars validate`); a Python function; an HTTP endpoint; a script's argv interface; another agent's MCP-exposed methods.
- **An effect domain** — what substrate scope does invocation potentially modify?
  Tools that modify the system are gated through eligibility-by-jurisdiction; pure-projection tools (read-only) have empty effect domain.
- **A recipe role** — most tools are invoked through skills.
  The skill's `act` slot names which tool(s) it invokes.
  A skill that "writes a task record" might invoke the `pyfars new task-record` verb (a tool) plus the `git add` and `git commit` tools.

## Tool subtypes

PyFARS commits at minimum to several tool subtypes:

- **[script](script.md)** — executable artifact (Python, shell, native binary).
  One file, one schema (its argv + stdin), one set of outputs.
- **[runbook](runbook.md)** — composed procedure invoking multiple tools (and possibly other runbooks).
  Runbooks have branching, bound state, recovery.
  The runbook IS itself a tool when treated as a single invocable unit.
- **verb** — a PyFARS CLI command.
  A verb is a specific kind of script-like tool with substrate-purity discipline and witness production.
- **external-api** — an HTTP endpoint, an LLM endpoint, a webhook receiver.
  Tool by virtue of being invokable from the agent.
- **agent-as-tool** — when one agent invokes another agent (e.g., a captain-agent dispatching to a developer-agent), the invoked agent is, from the invoker's perspective, a tool.
  The recursion is admissible; it bottoms out at agents acting through non-agent tools.

These specializations may have their own concepts (script, runbook); others (verb, external-api) overlap with existing PyFARS concepts and don't need separate entries unless their tool-role discipline diverges.

## The agent → skill → tool → action → act chain

The full chain from agent intent to the system effect:

$$\text{agent} \;\xrightarrow{\text{has}}\; \text{skill} \;\xrightarrow{\text{invokes}}\; \text{tool} \;\xrightarrow{\text{effects}}\; \text{action} \;\xrightarrow{\text{is-a}}\; \text{act}$$

Each arrow is a distinct relation.
Composition gives "what the agent ultimately does to the system."
This composition is the structural backbone of dispatch + execution + witnessing.

The captain has noted this structure has clean categorical algorithms; the specific mathematics is open program-shaping work.
Plausibly: skills, tools, and actions form categories; the relations are functors; composition along the chain is functor composition.

## Tools and capability matching

For dispatch:

- A workitem may declare `requires-tools: [tool-X, tool-Y]` — must have access to these tools.
- An agent's accessible-tools set is determined by the harness exposing it (the harness gates which tools the agent can invoke).
- The eligibility check for tools is parallel to skills and capabilities: subset matching.

This is a third dimension of dispatch eligibility (alongside skills and capabilities).
Currently most workitems specify `requires-skills:` and `requires-capabilities:` but not `requires-tools:`; the discipline for when to specify tools explicitly is partly settled.

## What this concept does not yet specify

- The full categorical structure of tool composition.
  Runbooks compose tools (sequence, parallel, branch); the algebra of composition is partly evident from upstream workflow-composition theorem, but PyFARS-side specifics are open.
- The handling of dynamic tool-sets.
  The upstream agents theory's `dynamic action space` (frameworks like PydanticAI) admits tools that appear/disappear during a session.
  PyFARS-side discipline for this is open.
- Tool versioning.
  A tool's schema may evolve; in-flight skill invocations may be calibrated against an old schema.
  The migration discipline is open.
- The relation to agent-as-tool: when does treating one agent as another's tool cleanly preserve accountability chains?
  Per upstream delegation-does-not-transfer-accountability, the calling agent's accountability extends; the discipline is partly settled.
