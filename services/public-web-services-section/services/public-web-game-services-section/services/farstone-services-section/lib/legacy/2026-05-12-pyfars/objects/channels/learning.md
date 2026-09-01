---
type: object
class: channel
status: draft
name: Learning
kind: operation-typology
emit-policy: any
read-policy: any
retention: durable
ordering: total
depends-on: [channel, witness]
---

# Learning channel

*Self-modification*: edits the system's own closure-rule system.
The most expensive kind by cost discipline — every learning event reshapes the polity's future behavior.

Examples: skill registrations, instinct distillation (`make_lesson_witness`), failure-diagnosis records (`make_diagnosis_witness`), refined specs, governance-rule updates.

Learning witnesses are durable and reviewable.
The captain audits the learning channel periodically to confirm the polity's self-modification stays within charter — un-reviewed learning is how a polity drifts from its own governance.
