---
type: concept
class: entity-specialization
status: draft
depends-on: [entity, predication-cell, witness]
realizes: [agentic-system]
---

# Agent

An [entity](entity.md) that *causes* [acts](act.md) — the doer-side of the polity's system dynamics, complementary to the workitem-side.
Agents are the entities that perform workitems; workitems are the acts agents perform.

Realizes (in PyFARS-realization terms) the upstream [agentic-system](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/concepts/agentic-system.md) concept when the agent is computational.
PyFARS's `agent` is broader: it includes humans (the captain, external users) plus computational agents (Claude Code sessions, MCP clients, OpenClaw sessions) plus possibly less-than-agentic actors (workflows, scheduled triggers) when those are framed as "the doer."

## Two senses of agent in PyFARS

PyFARS uses *agent* in two related but distinct senses:

1. **Broad sense (this concept)**: any entity that causes acts.
  Includes humans, computational agents, workflows, and other doers.
  The role is *caused-acts*; the entity-kind is whatever entity plays that role.

2. **Strict sense (computational agentic system)**: per the upstream three-condition characterization, an agent strictly is an entity that performs environmental action + goal-directed planning + persistent state.
  Most PyFARS-relevant computational agents (Claude Code sessions, OpenClaw sessions) are agents in this strict sense.
  Workflows and scheduled triggers typically are *not* (they lack goal-directed planning).

The broad sense names the role; the strict sense names a particular kind of entity playing that role.
When precision matters (e.g., for accountability, for capability matching, for saturation-threshold reasoning), the strict sense is what's relevant.

## The agent-form catalogue

Per the captain's polity-level framework, agent specializes into a catalogue of *agent-forms* — distinct first-class ways an entity is bound to the polity as a doer or as a member-or-incumbent.
These are NOT synonyms; they are orthogonal aspects, and a single entity may simultaneously instantiate multiple forms.

| Agent-form | What it is | Example |
|---|---|---|
| [persona](persona.md) | Persistent voice-bearing identity | Cassia Lorne (diviner persona); the captain's persona |
| [personnel](personnel.md) | Recognized polity member; subject to charter | emsenn (currently sole personnel of 561) |
| [officer](officer.md) | Office-incumbency; holds powers and duties | emsenn-as-captain (office:command incumbent) |
| operational-agent | In-context AI role dispatched against work | Claude Code subagent, OpenClaw agent, codi |

A single entity may be all four simultaneously: emsenn is personnel + persona + officer (multiple offices) + operates operational agents.

[Endpoints](endpoint.md) are *not* agents — they are inference services agents use.
The captain's polity makes this distinction explicit: agents are roles; endpoints are infrastructure.

The catalogue is open.
New agent-forms may emerge as the polity's needs surface (e.g., delegate-officer for non-personnel office-holders; AI-persona for AI-operated personas; cross-polity-personnel for multi-polity membership).

## Distinguishing agent from workitem and act

- **Workitem** is what gets done. **Agent** is what does it.
- **Act** is what happens. **Agent** is what causes it.

In dispatch: an [assignment-cell](../objects/assignment-cell.md) `(W, assigned-to, A) = t` binds a workitem $W$ to an agent $A$.
Both are entities; their structural roles are distinct.

## What an agent has (in PyFARS terms)

An agent in PyFARS substrate carries:

- **Identity** — a slug, possibly multiple (a Claude Code session may have a session-slug AND map to a user-account principal AND map to a personnel record).
- **[Skills](skill.md)** — system cells declaring `provides-skill:`; the named procedures the agent invokes to perform [actions](action.md).
  Skills are the bridge between agent and action.
- **Action space** — the set of [actions](action.md) the agent can perform; derived from its skills plus capability claims.
  For agentic systems attached via MCP, the action space is bounded by PyFARS's verb-registry exposed through the harness ([upstream tool-schema-bounds-action-space](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/theorems/tool-schema-bounds-action-space.md)).
- **Capability claim** — system cells declaring `provides-capability:` for broader functional attributes (typically inherited from the office the agent acts under).
- **Authority chain** — for an agent acting on the polity's behalf, the chain of delegations from a human principal down to this agent.
  Per upstream [delegation-does-not-transfer-accountability](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/theorems/delegation-does-not-transfer-accountability.md), accountability stays with the human at the top of the chain.
- **Session state** — for agentic systems, an [agent-session](../objects/agent-session.md) (forthcoming) tracks the bounded execution period.

The chain from agent to the system effect: **agent (with capabilities) → skill (knows recipe) → tool (external mechanism the skill invokes) → action (effected change) → act (system transition)**.
[Capabilities](capability.md) are agent-intrinsic shape (what the agent IS).
[Skills](skill.md) are agent procedural knowledge (what the agent KNOWS).
[Tools](tool.md) are external mechanisms invoked through skills (what the agent CAN INVOKE).
The triple compose: an agent's capability + skill + tool-access determines what kinds of actions it can perform.

## Agents and accountability

Per upstream [accountability-chain-must-be-total](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/theorems/accountability-chain-must-be-total.md), every outcome in the polity traces to exactly one human principal.
Agents (in either sense) are not themselves the accountable party; they execute under delegated authority.
The captain (or whichever human personnel principal is at the top of the chain) is accountable for what agents do under their delegation.

This is a sharp claim: PyFARS does not invent agent-as-accountable-party.
Even if a Claude Code session does the work, the captain answers for the outcome.

## Distinguishing agent from principal

The distinction is subtle:

- **[Principal](principal.md)** — an external authenticated identity, typically a user-account record.
  Principal is identity-shaped (who is this).
- **Agent** — an entity that causes acts.
  Agent is role-shaped (what does this do).

A single human (the captain) is both: a principal (their user-account-emsenn-google identity) and an agent (the doer when they authoritatively act on the polity).

A Claude Code session may have no principal (anonymous, unauthenticated) but still be an agent (it does the work).
Or it may have a principal (the captain's user-account) and act under that authority.

## What this concept does not yet specify

- The complete agent taxonomy (human, AI-agent, scripted-workflow, ...).
  The realization adds kinds as needed.
- The discipline for a non-agentic actor (a scheduled cron job, a deterministic workflow) being assigned work — is it an "agent" in the broad sense even though not in the strict?
  The realization tolerates the broad reading; precision matters in specific reasoning.
- Cross-polity agents.
  An agent acting for multiple polities — how the authority chains compose is open.
