---
type: concept
class: act-specialization
status: draft
depends-on: [act, witness, predication-cell]
---

# Observation

An [act](act.md) of perceiving substrate (or external) state and recording what was perceived, *without modifying the perceived state*.
An observation produces a substrate event: the observer pulses, reads, and witnesses what they read.
The witness records the observation, but the observed cells themselves are unchanged by the observation.

Observation is one of the act-specializations alongside [event](event.md), [action](action.md), [workitem](workitem.md), [certification](certification.md), and [validation](validation.md).

## Observation vs. witness

The distinction is precise:

- A **witness** records that *something happened to the substrate* — typically a system transition (a cell was set, a state changed).
  The witness IS the system transition's residue.
- An **observation** is an act of perceiving — typically reading existing substrate or external state — *resulting in* a witness recording what was observed.

Every observation produces a witness (the observation-witness, recording observer, observed-target, observed-value, moment).
But not every witness is an observation: a dispatch-witness records an assignment, not an observation.

Put another way: observations are *read-shaped acts* that produce *write-shaped witnesses* (the witness records the read).
The substrate-write is in the meta — recording-the-fact-that-an-observation-occurred — not in the observed cells themselves.

## Why observations are first-class

A polity's epistemic state — what it has seen, what it has not seen, what its observers have reported — is part of the system.
Without observations being substrate-recordable, the polity could read external state but never *witness* having read it.
Audits would lose their support; "we checked X at moment $\tau$" would have no substrate-trace.

Observations make epistemic state system-resident:

- "What rate-limit-budget did we observe at moment $\tau$?" — read the observation-witness.
- "When did we last check the build status?" — read the most recent build-status-observation.
- "What did the auditor see when they ran?" — read the audit-observation-stream.

## Observation categories

PyFARS recognizes several observation kinds, by what they perceive:

- **External-state observations** — readings of state outside the substrate (rate-limits, host-system metrics, external-API responses, external-system status).
- **Substrate-state observations** — read-only readings of system cells, recorded for audit-witness or freshness-tracking.
  (E.g., "auditor read this set of cells at moment $\tau$.")
- **Self-observations** — an agent observing its own state (current pulse-queue depth, recent witnesses produced, current work-load).
- **Peer observations** — one agent observing another's substrate-trace (read-only; recording what the peer's recent activity looked like).

The distinction is by *what* is observed; the substrate-recording form is the same.

## Observation and authority

Observation requires read-authority over the observed target.
An agent without authority to read certain system cells cannot witness having observed them; the attempted observation produces an audit-rejected witness.
This is what makes observations align with least-privilege — observations are bounded by what the observer is permitted to see.

External observations require their own authority: the polity may bound which agents can observe external systems (which agents can read OS metrics, query external APIs, etc.).

## Observation and substrate-purity

Observations preserve substrate-purity.
The observed cells are unchanged.
The observation-witness is a new cell.
Replay reproduces observations: re-running the observer at the same moment over the same substrate (and external state) produces the same observation.

External-state observations have a subtlety: external state may change between observations.
Replay does *not* reproduce the external state at $\tau$; it reproduces the recorded observation of external state at $\tau$.
The polity's epistemic record of external state is durable; the external state itself is not under substrate control.

## What this concept does not specify

- The schema of observation-witnesses.
  Per-observation-category currently; uniform schema partly settled.
- Observation-frequency policy.
  How often the polity observes external state (every tick? on-demand? per cadence?) is configured per-observation-purpose.
- Observation-staleness.
  Observations age; the polity's view of "current external rate-limit" may be hours-old.
  Discipline for staleness-tracking partly settled.
- The relationship to *monitoring* — an ongoing observation-stream as a process.
  A monitor is a process that produces a stream of observations; one process, many observation-events.
