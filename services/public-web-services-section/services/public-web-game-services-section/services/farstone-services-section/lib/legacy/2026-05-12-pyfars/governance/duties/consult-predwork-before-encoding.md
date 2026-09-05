---
title: "Consult PredWork theory before encoding a new record"
type: jural-relation
kind: duty
active-holder: pyfars-records-officer
passive-party: pyfars-community
scope-action: encode-record
triggering-powers:
  - create-governance-record
  - modify-governance-record
  - create-work-record
  - modify-work-record
required-action: complete-theory-derivation-review
enforcement: substrate-violation
rule-type: N→N
theory-basis: [normative-operational-layering, jural-relation, recurrent-practice]
---


Before encoding (writing to disk) any new PyFARS governance or work record, the officer MUST complete the following review loop.
Skipping it is an unfulfilled duty — a substrate violation that governance machinery is entitled to flag.

## Required action: theory-derivation review

Three steps, in order:

### 1. Read existing records

Survey the records in the relevant area before writing.
For governance: read `governance/` (decisions, conventions, existing offices/powers/duties).
For work: read `work/` in the relevant horizon and task area.

**Why**: New records often duplicate or contradict existing ones.
This step prevents record rot before it starts.

### 2. Study the PredWork theory stack

Look at the PredWork theory (predicated-work theory and its dependencies) for how the CONCEPT being recorded is theorized.
The derivation chain runs:

```
predication-categories
  → predicated-computing
    → agential-orchestration-platform
      → flatfile-agentic-resource-system
        → governance/ and work/
```

Use `pyfars context <slug>` to walk the graph.
Key questions: - Does the theory name this concept?
Does it give it a specific shape (frontmatter fields, relation types)? - Can the record carry more theoretical precision than a prose note would suggest? - Would the record benefit from `depends-on:` links into the theory graph?

**Why**: Records are substrate predications, not just notes.
They should respect the categorical structure of the theory, not just pattern-match against prior records.

### 3. Improve structuration first, then encode

If steps 1–2 reveal a better schema or a better set of frontmatter fields than the first draft assumed, update the draft BEFORE writing.
Do not write the record and plan to "fix it later."

**Why**: Once a record is committed and referenced, schema changes become refactors.
Structuration is cheaper before encoding than after.

## Theory grounding

Per PredWork's normative-operational layering, this duty is a **Type N→N rule**: antecedent reads normative cells (the agent holds `create-governance-record` power), consequent writes normative cells (the duty-record's `active-holder` cell is set).
It gates an operational event (the record creation) via an N→O rule that requires this duty be discharged first.

The loop this duty encodes is structurally a **recurrent practice** (PredWork `recurrent-practice.md`): it fires at every record-creation event, with Markov aggregation (each encoding depends on the immediately prior theory state).
As PyFARS matures toward F3 formality, the practice becomes substrate-automatic rather than prose-dependent.

## Enforcement

An agent that creates or modifies records without completing this loop has an unfulfilled duty.
In current PyFARS (pre-M5), enforcement is manual — the captain or a reviewer can flag it during `pyfars audit-commits`.
Post-M5, the heartbeat closure machinery can emit a substrate violation diagnostic automatically when a record-create event in the event log has no preceding theory-review event.

## Privilege exceptions

None registered yet.
All record creation is subject to this duty regardless of urgency.
(If a time-critical situation warrants waiving the review, the captain can grant a one-time privilege record — but that privilege must itself be created following this duty, or its own creation is a substrate violation.)

## Notes

This duty is the substrate encoding of the captain's expressed requirement: "before we encode the record, look at existing records and study PredWork theories to improve structuration."
It belongs here in `duties/` (not in `processes/` or `decisions/`) because it is a constraint on a power, not a standalone process or a one-time choice.
