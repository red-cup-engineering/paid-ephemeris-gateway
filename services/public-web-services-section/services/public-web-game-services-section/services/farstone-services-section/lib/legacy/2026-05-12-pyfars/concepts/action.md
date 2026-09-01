---
type: concept
class: act-with-attribution
status: draft
depends-on: [act, agent, witness]
realizes: [environmental-action]
---

# Action

An [act](act.md) caused by a specific [agent](agent.md) — an act with agent attribution.
The conceptual bridge between the agent (the doer) and the act (the happening): an action is the agent's contribution to the substrate, recorded as a witness naming the agent.

Realizes the upstream notion of [environmental-action](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/concepts/environmental-action.md) at the PyFARS-realization scope: in the upstream three-condition characterization of agentic systems, environmental action is what makes a system agentic; in PyFARS, an action is the system-tracked occurrence of that.

## Distinguishing action from act and from workitem

- **act**: anything that happens.
  May or may not have agent attribution.
  May or may not be framed as work.
- **action**: an act *with* agent attribution.
  An agent caused this; the witness names the agent.
- **workitem**: an act framed *as work*.
  May or may not have agent attribution at the system level (a workitem in `pending` status has no agent yet; an `assigned` workitem has one).

These specializations cross.
A workitem-in-progress that's being executed is both a workitem (it's work) and an action (an agent is causing the system-changing work).
The two specializations name different aspects:

- "This is work; here's its lifecycle" → workitem.
- "This is something an agent did; here's the agent" → action.

A specific event may carry both framings.

## What an action commits to

1. **Agent attribution** — the action's witness names the agent that caused it.
  No anonymous actions.
2. **Skill bridge** — actions are typically performed via a [skill](skill.md).
  The skill is what the agent *uses* to perform the action; the action is what the agent *does*.
  (Some actions may not flow through named skills — captain-direct interventions, for instance — but the typical case routes through a skill.)
3. **Substrate effect** — actions modify the system (per environmental-action upstream); a "would-be action" that has no system effect is not yet an action, just a planned intent.
4. **Witness traceability** — every action has at least one witness; replay reproduces the action's system effect.

## Action vs. tool-call

The upstream agents theory has [tool-call](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/objects/tool-call.md): a structured invocation of a tool from the agent's action-space.
PyFARS's `action` is the system-side notion; tool-call is the runtime-side notion.
They roughly correspond:

- An agent invokes a tool from its action-space → that's a tool-call (runtime).
- The system transition the tool-call produces → that's an action (substrate).

The two are distinct because PyFARS may have actions that aren't via tool-calls (an agent committing a system transition through its native authority, without invoking a verb), and tool-calls that aren't yet actions (a tool-call that fails before producing system effect).

## What this concept does not yet specify

- The granularity of actions.
  A multi-step procedure may produce multiple actions or a single action; the discipline is partly settled.
- Failed actions.
  An attempted action that doesn't produce its intended system effect is still witnessed (audit-purity), but is it an "action" or a "failed action"?
  The discipline favors witnessing it as an action with a `failed: true` cell rather than as a non-action.
- Cross-polity actions.
  An action by an agent in another polity affecting this polity's system — the discipline for cross-polity agent attribution is open.
