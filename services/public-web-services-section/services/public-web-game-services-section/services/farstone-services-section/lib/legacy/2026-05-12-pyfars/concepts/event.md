---
type: concept
class: act-specialization
status: draft
depends-on: [act, moment, witness, time]
---

# Event

An [act](act.md) located at a [moment](moment.md), with a [witness](witness.md) recording its system effect.
Events are the system-readable specializations of acts: every event is an act, but not every act is an event (an unwitnessed happening, in a system not designed for substrate-purity, has no event-status).

In PyFARS, the substrate IS a structure built from events: the JSONL log is a sequence of event-witnesses; system state at a moment is the closure of events with moment $\leq \tau$.
Acts are the philosophical category; events are the substrate-engineering category.

## What an event has

An event in PyFARS substrate has:

1. **An act** — the abstract happening it instantiates.
  The act is what makes the event a doing-or-occurrence rather than a static fact.
2. **A moment** — a [moment](moment.md) locating the event in time.
  The 4-tuple of (wall-clock-ts, event-order-idx, closure-ordinal, cadence-position).
3. **An actor** — the [agent](agent.md) (or other doer) that caused the event.
  For events with no agent attribution (system events, scheduled triggers), the actor may be the polity itself or a designated background actor.
4. **System cells** — the cells the event introduces or modifies.
  The event's *content* in the system-engineering terms.
5. **A witness** — the JSONL log entry recording the event.
  The witness IS the event's substrate residue.
6. **Optional context** — rationale, verb that produced the event, parent-event-reference (for chained events).

These constitute the event's substrate identity.
Two events with identical moments, actors, and cells are the same event (idempotent under retry).

## Distinguishing event from act, action, and witness

The four-way distinction is precise and load-bearing:

- **[Act](act.md)** — the abstract happening.
  "Something occurs."
  May be philosophical or physical or substrate-relevant.
- **[Action](action.md)** — an act *with agent attribution*.
  "An agent caused this happening."
  Adds the agent dimension.
- **Event (this concept)** — an act *with moment and witness*.
  "This happening is at this moment, recorded."
  Adds the temporal and substrate-recording dimensions.
- **[Witness](witness.md)** — the JSONL log entry recording the event.
  The serialized form.

A specific operational thing typically carries multiple of these framings: - A captain dispatching a task is an *action* (the captain enacted it), an *event* (it happened at a moment, witnessed), and an *act* (in the broad sense).
It has a *witness* (the JSONL log entry). - A heartbeat-tick firing is an *event* (substrate-recorded at a moment) and an *act* (something happened); it may not have a clear *action* if the heartbeat process is treated as a system actor without the agent's deliberative shape.

The framings overlap; substantive precision happens by choosing the right framing for the question at hand.

## Events and the JSONL log

The JSONL log IS a sequence of events, each event serialized as one log line (the witness).
The log's invariants are the events':

- **Append-only**: events are appended at moments after their predecessors; no rewriting.
- **Total internal ordering**: events within an instance have a total order (by event-order-idx).
- **Witnessed**: every cell change in the system is the consequence of an event in the log.

Per [`jsonl-is-canonical-state`](../claims/jsonl-is-canonical-state.md), system state is the closure of events with moment $\leq$ the observation time.
The substrate IS the events' closure under closure-rule-system.

## Event categories

PyFARS recognizes several event categories, distinguished by what kind of the system effect they produce:

- **Witness events** — the most common; record system cell changes (assignments, status transitions, settlement-cells).
- **Observation events** — record observations of external state (rate-limit-budget snapshots, external-system-status checks).
- **Audit events** — record findings produced by audit verbs (validate diagnostics, derivation-chain coverage results).
- **Coordination events** — synchronization markers (cadence-boundary witnesses, cross-practice sync points).
- **Control events** — operational signals (heartbeat-tick start, service-start, service-stop).

The categorization is a working taxonomy; the realization adds categories as needed.
The substrate doesn't enforce categories at the storage level — they're convention plus frontmatter discipline.

## Events vs. processes

A workitem of [process](process.md) subtype is *not* a single event — it's a long-running thing that *produces* many events over its lifecycle (start-event, progress-events, suspend-events, resume-events, completion-event).
Each is a discrete event; the process is the structure that ties them together.

Distinguishing events from processes is important for OS-analog reasoning: in classical OS, an event is point-shaped (an interrupt, a timer-fire); a process is interval-shaped (running over time).
PyFARS preserves this distinction: events are point-shaped; processes are interval-shaped and produce multiple events.

## What this concept does not yet specify

- The precise event schema.
  Each event-category has its own conventions; a uniform schema is partly settled.
- Event compression / archival.
  Long-lived polities accumulate vast event streams; the discipline for compaction without losing the audit trail is open.
- Cross-instance event ordering.
  Federated polities have multi-instance events whose ordering routes through bilattice network-sheaf consensus upstream.
- The relationship to *signed* events.
  Whether events should carry actor signatures (cryptographic proof of authorship) is a program-shaping question; current realization does not sign.
