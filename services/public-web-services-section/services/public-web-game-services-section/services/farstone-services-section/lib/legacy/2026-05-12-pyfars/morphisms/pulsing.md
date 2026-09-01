---
type: morphism
class: agent-activation
status: draft
depends-on: [pulse, agent, trigger, tick]
---

# Pulsing

The morphism by which an [agent](../concepts/agent.md) responds to a [trigger](../concepts/trigger.md) with one [pulse](../concepts/pulse.md).
Pulsing is what an active agent *does* in response to triggers: a tick arrives, a witness lands, a watched cell changes — the agent pulses.

Pulsing is the gerund-form of pulse.
A *pulse* is a discrete event (the agent activates once, witnesses, deactivates). *Pulsing* is the ongoing dynamic — the agent's continued cycle of receiving triggers and producing pulses.
An agent that is *pulsing* is the active agent; an agent that has *pulsed* (past) produced a particular pulse-event.

## Action

For an agent $A$ at system state $S$, with trigger $T$ in $A$'s pulse-queue:

$$\mathrm{pulsing}_A \colon (S, T) \;\longrightarrow\; (S', \mathrm{witnesses})$$

— $A$'s pulse-queue advances by one (the trigger $T$ is consumed), the agent reads substrate, makes its decisions, and emits zero or more witness events. $S'$ is the substrate after the pulse's witnesses are applied (and the pulse-cell itself is recorded).

The action is per-trigger; iterated pulsing across all triggers in $A$'s queue produces $A$'s sequence of pulses over time.

## Pulsing's internal structure

Within a single pulse, the agent typically:

1. **Reads relevant substrate** — the cells the agent's role makes it responsible for.
  An auditor reads validation-target cells; a dispatcher reads work-queue cells; a clock-monitor reads its watched clock's state.
2. **Applies its skill / runs its tool** — the [skill](../concepts/skill.md) the trigger maps to, possibly invoking [tools](../concepts/tool.md) per the agent's [capability-table](../concepts/capability-table.md).
3. **Decides what to witness** — the system transitions the agent commits to in response.
  Some pulses produce no witnesses (the agent reads, finds nothing to do, ends the pulse); others produce many.
4. **Emits witnesses** — appends to the JSONL log; closure runs over the new cells; substrate moves to a new state.
5. **Yields** — the pulse ends; the agent waits for the next trigger.

The pulse's closure-ordinal is bounded — by skill-definition, by tool-execution-time, by the agent's attention-span.
Long agent-tasks decompose into many pulses linked by persistent-state cells.

## Pulsing and bounded rationality

Per upstream agent-foundations, an agent has bounded working memory and bounded per-step reasoning.
Pulsing is the system's discipline for bounded rationality: each pulse is *finite work*; what the agent cannot do in one pulse, it does over many pulses, with system cells carrying state between them.

This is why pulses don't loop forever: a pulse is one bounded chunk of agent activity.
An agent that wants to pulse again must wait for its next trigger.

## Pulsing and authority

Each pulse's witnesses must be authorized by the agent's deontic profile.
The agent cannot witness cells outside its action-domain; cannot dispatch work outside its dispatch-authority; cannot audit theories outside its read-permissions.
These checks fire during pulsing — per-witness — and authority-failures produce audit-rejected witnesses (visible in the log) rather than silently dropping the attempt.

## Pulsing and pulse-queue

An agent has a pulse-queue: the system cells representing triggers waiting to fire.
When triggers arrive faster than the agent can pulse, the queue grows.
Pulsing is queue-consuming: each pulse consumes one trigger.

PyFARS's discipline: the pulse-queue is substrate-visible.
A captain reading agent state sees how many pending triggers an agent has — early signal of agent-saturation.
Agents whose queues exceed configured thresholds may be flagged for office-load-rebalancing.

## What pulsing does not specify

- The exact agent-attention-policy.
  Different agents read different substrate during a pulse; the policy depends on the agent-form (officers may read governance; operational-agents may read their work-queue).
  Currently per-agent; richer disciplines open.
- Pulse-priority within a queue.
  When multiple triggers are queued, which fires first?
  Currently FIFO; substrate-cell-priority and trigger-source-priority are program-shaping questions.
- Pulse cancellation.
  If a queued trigger becomes invalid (the watched-cell reverted; the clock paused) before its pulse fires, what happens?
  Discipline open.
- Sub-pulse parallelism.
  Within a pulse, can the agent's skill do parallel work (concurrent tool-invocations)?
  Possible in implementation; discipline for the substrate-recording is open.
