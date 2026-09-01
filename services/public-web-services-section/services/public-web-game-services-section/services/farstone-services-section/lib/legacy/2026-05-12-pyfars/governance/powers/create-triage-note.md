---
title: "Create a triage note"
type: jural-relation
kind: power
active-holder: pyfars-executive-officer
passive-party: pyfars-community
scope-action: create-file-in-triage
correlate-of: liability
theory-basis: [jural-relation, normative-operational-layering, task-cell-system]
---


The XO may file a triage note in `operations/engineering/triage/` (or domain-appropriate triage directory) with a `requires-action:` field set to a routing predicate.
The passive party has a liability: the note will be picked up by the heartbeat's task-readiness policy and dispatched to an eligible agent.

Distinct from `create-work-record` (which creates classified, structured work items) and `queue-intent` (which puts an intent directly in the queue).
A triage note is used when the right classification or office is uncertain — it is a pre-classified routing request.

Triggers the `witness-every-classification` duty.
