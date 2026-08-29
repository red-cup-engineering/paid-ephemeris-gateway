---
type: concept
class: system-transition
status: draft
depends-on: [substrate, predication-cell, jsonl-event-log]
realizes: [witness-as-increment]
---

# Witness

The substrate-transitioning record of an event.
Realizes [witness-as-increment](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/witness-as-increment.md) at the PyFARS-runtime level.
Every change to PyFARS system state is a witness; nothing changes without one.

A witness is a JSONL line appended to the [event log](../objects/jsonl-event-log.md).
The line carries: a timestamp, an actor, a verb, the system cells the event introduces, and any rationale or auxiliary metadata.
Closure runs over the new cells, propagating consequences into the substrate.

## Why witnesses are first-class

Witnesses are how PyFARS keeps the substrate pure.
The substrate is a function of its event log: system state at time $\tau$ is the closure of all witnesses with timestamp $\leq \tau$, against the closure-rule-system active at $\tau$.
No state exists without a witness.

This is what makes PyFARS auditable.
Every cell can be traced to the witness that introduced it.
Every change can be replayed.
The corpus is a projection; the witnesses are the source.

## Witnesses and verbs

Most verbs in PyFARS produce witnesses (those that are system transitions; pure-projection verbs do not).
The verb's command-line invocation, its system effects, and the resulting witness are tightly coupled — the witness *is* the system effect, recorded.

Some witnesses have multiple cells.
A `dispatch` witness produces an assignment cell *and* updates the actor's load *and* possibly fires consequence cells through closure.
The witness records the *primary* cells; closure produces the rest.

## Witness vs. observation vs. finding

These distinctions matter:

- A **witness** is a substrate-transitioning event.
  It introduces or modifies cells.
  Adds truth.
- An **observation** is a read-only record of system state.
  It does not introduce new cells; it records what *was* observed (used in audits, retrospectives, and in surfacing surprise).
- A **finding** is the conclusion of an audit or analysis.
  It interprets observations (or sequences of witnesses) to surface a pattern or recommend action.
  Findings produce *new* witnesses if they trigger remediation.

PyFARS uses all three; the verb naming reflects them (`witness`, `observe`, audit verbs that produce findings).

## What every witness commits to

1. **Atomicity** — a witness either fires fully (its cells are accepted, closure runs) or not at all.
  There are no half-witnesses.
2. **Idempotency at the JSONL level** — appending the same line twice is a no-op for the substrate (the closure of two identical witnesses is the closure of one).
  This means safe retries.
3. **Total ordering by timestamp** — within a single PyFARS instance, witnesses are totally ordered.
  Across-instance ordering uses upstream network-sheaf consensus.
  PyFARS-the-package supports single-instance witnesses today; multi-instance is out of scope for the current realization.
4. **Actor attribution** — every witness names the actor responsible.
  This binds the witness to authority chains.
5. **Verb attribution** — every witness names the verb that produced it.

## Witnesses and authority

A witness fires only if the actor has authority to produce its cells.
The authority check is per-verb (does this verb's authorization profile cover the actor?) and per-cell (does this cell's settlement domain include the actor's authority?).
Failed authority checks produce a *different* kind of witness — an audit-rejected witness — recording the attempted-but-failed transition.
The substrate then has both the failed attempt and the unchanged state; the rejection itself is auditable.

## What this concept does not yet specify

- The schema of the JSONL line.
  Currently per-verb; a uniform schema is partly settled and partly open.
- Witness compression / archival.
  A long-running polity accumulates witnesses; the discipline for compaction (without losing the audit trail) is open.
- Witness signing.
  Whether witnesses should be cryptographically signed by the actor is a program-shaping question — relevant for federation and for adversarial settings.
