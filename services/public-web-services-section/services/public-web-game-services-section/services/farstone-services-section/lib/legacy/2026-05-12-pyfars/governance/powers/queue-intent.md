---
title: "Queue an intent for heartbeat processing"
type: jural-relation
kind: power
active-holder: pyfars-executive-officer
passive-party: pyfars-substrate
scope-action: place-intent-in-queue
correlate-of: liability
theory-basis: [jural-relation, normative-operational-layering, dispatch-readiness]
---


The XO may place an intent into the substrate's intent queue.
The substrate (passive party) has a liability: the intent will be processed on the next heartbeat cycle.
The intent takes normative effect when queued — the heartbeat is obligated to process it or produce a diagnostic explaining why it was skipped.

Triggers the `witness-every-classification` duty: every queued intent must have a classification witness recording what the intent is and why it was queued rather than dispatched directly.
