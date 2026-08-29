---
type: morphism
class: epistemic-act
status: draft
depends-on: [observation, agent, witness, substrate]
---

# Observing

The morphism by which an [agent](../concepts/agent.md) reads substrate (or external state) and witnesses what they read.
Observing produces an [observation](../concepts/observation.md) — the substrate-recordable noun that this morphism produces.

The observed cells are unchanged by the act of observing.
The witness records *that the agent read them at this moment*, with what value, under what authority.
Observing is read-shaped on the observed-side, write-shaped on the witnessing-side.

## Action

For an agent $A$ with read-authority over target $T$, at system state $S$:

$$\mathrm{observing}_A \colon (S, T) \;\longrightarrow\; S \cup \{w_{A,T,\tau}\}$$

— the substrate gains an observation-witness $w_{A,T,\tau}$ recording $A$'s read of $T$ at moment $\tau$.
Crucially, $T$ itself is unchanged.

## Observing and trigger

Observing is typically triggered: a tick fires, an agent's pulse fires, the agent observes target cells (or external state).
Observing-as-pulse-content is one of the most common things agents do — auditors observe before they validate, dispatchers observe before they decide, monitors observe their watched targets each tick.

## Observing and authority

Authority bounds what an agent can observe.
Cells outside the agent's read-domain produce audit-rejected observations rather than substrate-recorded ones.
This is what makes observing align with least-privilege.

## Observing and external state

When the target is *external* (host metrics, an external API's response, OS-level state), the substrate gains an observation-witness recording what was perceived; the external state itself is not under substrate control.
Replay reproduces the recorded observation, not the external state at the time.

## What this morphism does not specify

- The schema of observation-witnesses (per-target-kind currently).
- Observing-frequency policy (every-tick vs on-demand vs cadence-driven).
- The relation to *monitoring* — an ongoing observing-stream as an interval-shaped process.
