---
type: concept
class: system-event-shape
status: draft
depends-on: [entity, witness, predication-cell]
---

# Act

An [entity](entity.md) that *happens* — a system occurrence with a beginning, an effect, and a witness.
Acts are what populate the polity's history; the JSONL event log is, at its core, a sequence of act-witnesses.

The concept names a substantial branch of the entity hierarchy: many entities of practical interest in PyFARS are acts (or specializations of acts).
The other major branch from entity is [agent](agent.md) — the entities that *cause* acts.
Acts and agents form complementary halves of the polity's system dynamics.

## What distinguishes an act from a non-act entity

A polity, an office, a concept — these are entities but not acts.
They are system-stable; they exist, they are subjects of cells, they don't *happen*.
An act, by contrast, is fundamentally temporal — it has a moment of occurrence, and its effects propagate forward via closure.

Operationally: - **An entity can be a subject of cells without being an act.** "The polity exists" is not an act; it's a system-stable fact. - **An act produces cells via witness.** "The captain was inducted" is an act; it produced witness events whose cells modify the system.

Acts are the dynamic entities; non-act entities are the stable scaffold acts move within.

## Acts and the JSONL event log

Per [`jsonl-is-canonical-state`](../claims/jsonl-is-canonical-state.md), system state is the closure of log events.
Each log event is a [witness](witness.md) of an act.
The log is, in this sense, a sequence of (witnessed) acts ordered by time.

The relationship: act ←→ witness ←→ log entry.
An act *produces* a witness; the witness *is* the log entry; the log's closure produces system cells.
Acts are the subject; witnesses are the recording; logs are the storage.

## Specializations of act

PyFARS commits to several structured specializations:

- **[workitem](workitem.md)** — an act framed *as work*: with assignment, lifecycle, capability requirements, accountability.
  Workitems further specialize into process, procedure, derivation, inquiry.
- **[event](event.md)** — an act with a [moment](moment.md) and a [witness](witness.md).
  Events are the system-readable specializations: every cell change in the system is the consequence of an event, and the JSONL log is a sequence of event-witnesses.
- **[action](action.md)** — an act *with agent attribution*.
  Actions are caused by an [agent](agent.md); the witness names the agent.

These specializations cross.
A specific operational thing typically carries multiple framings simultaneously: a captain dispatching a task is a workitem-act (it's work), an event-act (it happened at a moment, witnessed), and an action-act (the captain caused it).
Each framing names a different aspect.

Other specializations are admissible (and likely): observations (acts of perceiving without modifying), declarations (acts of asserting without doing), failures (acts that intended one effect but produced another).
The realization adds these as the polity's needs surface.

## What this concept does not yet specify

- The complete taxonomy of acts beyond workitem.
  Other act-subtypes will be authored as patterns emerge.
- The temporal granularity of acts.
  Some acts are point-events (a witness fires); some are extended (a multi-step execution).
  Both are acts; the discipline for boundaries is partly settled.
- The relationship to upstream "act" notions in non-PyFARS theory.
  Speech-act theory, action theory, philosophy of action — these are adjacent.
  Pyfars-side `act` is the system's dynamic-entity notion; cross-pollination is open.
