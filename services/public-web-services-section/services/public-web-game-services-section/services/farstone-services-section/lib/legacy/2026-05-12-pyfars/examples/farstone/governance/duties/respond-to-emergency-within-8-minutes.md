---
title: "Respond to emergency within 8 minutes"
type: jural-relation
kind: duty
active-holder: fire-chief
passive-party: farston-residents
scope-action: emergency-response
triggering-powers:
  - dispatch-emergency-response
required-action: commit-units-en-route
enforcement: substrate-violation
rule-type: N→N
cadence: per-emergency-dispatch
---


The fire chief's office is bound to commit volunteers and equipment en route within 8 minutes of receiving an emergency dispatch within city limits.

## Trigger

An emergency-dispatch record landing at the fire-chief office.

## Required action

Within 8 minutes of dispatch receipt: page the volunteer roster, commit equipment, mark the dispatch record as `units-en-route`.
If the response window will be missed, request mutual aid from a neighboring township.

## Enforcement

A dispatch record showing more than 8 minutes between `received-at` and `units-en-route-at` produces a duty-violation witness.
Repeated violations escalate to mayor and council for review.

## Immunity exception

The fire-chief office holds `immunity-from-good-faith-emergency-decisions`.
A response delay attributable to weather, simultaneous-incident overload, or mutual-aid coordination is reviewable but not automatically a violation.
