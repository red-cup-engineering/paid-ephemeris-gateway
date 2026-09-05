---
title: "Maintain continuous operational watch"
type: jural-relation
kind: duty
active-holder: pyfars-executive-officer
passive-party: pyfars-community
scope-action: maintain-operational-awareness
triggering-powers: []
required-action: hold-current-watch-state
enforcement: substrate-violation
rule-type: N→N
cadence: continuous
theory-basis: [normative-operational-layering, jural-relation, recurrent-practice, task-cell-system]
---


A standing duty — not triggered by a single power exercise, but by the ongoing fact of holding the XO office.
The XO must maintain current operational awareness at all times.
"Current" means no more than one heartbeat cycle stale.

## Watch state

At any point the XO must be able to answer from substrate observation:

1. **Active frontier**: which tasks are ready (dependencies settled, goal not yet settled)?
2. **Office staffing**: which offices have registered agents within rate and budget limits?
3. **Intent queue**: what intents are queued awaiting the next heartbeat?
4. **Pending closures**: what dispatched tasks are awaiting completion classification?

## Staleness

Watch-state is stale when the XO has not read the substrate since the last heartbeat cycle completed.
A stale watch means incoming messages are being interpreted against outdated enterprise state — routing errors follow.

## Session start protocol

At the beginning of every session, the XO refreshes its watch state before processing any incoming messages.
The `reading-enterprise-state` skill is the watch-refresh operation.

## Enforcement

Pre-M5: a session that begins without executing `reading-enterprise-state` before processing its first message has an unfulfilled `maintain-watch` duty.

Post-M5: the substrate event log can verify that every session's first record-access event is a read of the enterprise state records, not a write.
