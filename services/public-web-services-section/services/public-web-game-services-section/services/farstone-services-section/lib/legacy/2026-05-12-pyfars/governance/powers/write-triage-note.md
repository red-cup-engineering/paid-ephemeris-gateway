---
title: "Write a triage note"
type: jural-relation
kind: power
active-holder: theory-derivation-officer
passive-party: pyfars-community
scope-action: file-triage-note
correlate-of: liability
theory-basis: [jural-relation, normative-operational-layering, task-cell-system]
---


The theory-derivation-officer may file a triage note under `operations/engineering/triage/`.
A triage note is a substrate record of type `idea` with `status: triage` and a `requires-action:` field directing the XO to route the note appropriately.

This power is the theory-derivation-officer's mechanism for: 1. **Starting a loop cycle** (Phase 1): the audit triage note that opens the loop.
2. **Escalating upstream gaps**: when derivation reveals a missing or incorrect predication-categories entity, the officer stops and files a triage note rather than backfilling the gap from within a downstream layer.
The `requires-action: theory-gap` field routes the note upstream.

## Duty attached

- `escalate-when-theory-gap-found` fires whenever a write-power exercise (Phase 2, 3, 4, 5) reveals a gap or error in the upstream theory.
  The officer must stop the current phase and file a triage note before proceeding.
  The triage note is the formal escalation record.

## Shared power

`write-triage-note` is exercised by multiple offices with different scopes:

- **Theory-derivation-officer**: theory gaps and loop-start audit notes.
- **XO**: routing and classification notes (`create-triage-note`).
- **Theory-officer**: degeneration-signal notes.

Each office's triage notes carry different `requires-action:` values directing the XO to route them appropriately.
The XO's `witness-every-classification` duty fires on any triage note that results from an XO classification event.
