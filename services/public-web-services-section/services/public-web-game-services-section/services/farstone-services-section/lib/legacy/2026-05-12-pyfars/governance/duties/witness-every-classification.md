---
title: "Witness every classification the XO makes"
type: jural-relation
kind: duty
active-holder: pyfars-executive-officer
passive-party: pyfars-community
scope-action: produce-classification-witness
triggering-powers:
  - queue-intent
  - create-triage-note
  - dispatch-task-to-office
  - create-work-record
required-action: file-classification-witness
enforcement: substrate-violation
rule-type: N→O
theory-basis: [normative-operational-layering, jural-relation, task-cell-system]
---


Every time the XO queues an intent, files a triage note, dispatches a task, or creates a work record, it MUST produce a classification witness: a substrate record or frontmatter annotation documenting what the incoming item was, how it was classified, and where it was routed.

Silent drops are substrate violations.
There is no message the XO may receive and simply ignore.
Even FYI messages and noise must be classified ("classified as FYI — no work item created") with a witness.

## Required classification witness fields

At minimum: - What was the source and content of the incoming item - What type was it classified as (task / question / FYI / intent / escalation / noise) - Which office or queue it was routed to (or why no routing was performed) - Timestamp

In current PyFARS (pre-M5), the witness is the frontmatter of the created triage note or task record itself.
Post-M5, a separate witness record per classification is produced automatically by the event log.

## Enforcement

Pre-M5: manual.
The captain or a reviewer can audit the XO's classification history by checking whether every incoming message in the session log has a corresponding substrate record.

Post-M5: the closure rule system checks that every session event of type `message-received` has a downstream `record-created` event with a `classified-by: pyfars-executive-officer` cell.
Missing downstream event produces a governance-rule diagnostic.
