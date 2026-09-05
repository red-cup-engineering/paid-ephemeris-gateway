---
type: office
title: "Harbormaster"
status: active
reports-to: mayor
charter-section: "Article II — Governance Structure (departmental, harbor and waterfront)"
scope: harbor-and-waterfront
collective: false
quorum: 1
provides-capabilities:
  - harbor-coordination
  - emergency-witnessing
  - jurisdiction-write-on-harbor
provides-skill:
  - issuing-harbor-closure
  - publishing-ferry-status
  - dispatching-marine-emergency-response
duties:
  - declare-harbor-closure-on-severe-storm
  - publish-ferry-status-each-day
  - notify-coast-guard-on-marine-emergency
jurisdiction:
  write:
    - examples/farstone/governance/state/harbor/
    - examples/farstone/operations/harbor/
charter-bindings:
  rules:
    - farston-charter
pulses-on:
  - world-day
  - weather-changed
---


The town-appointed office responsible for the working harbor.
Coordinates with the mainland Coast Guard above the high-tide line for matters beyond the city's chartered authority; with Public Works for the breakwater and harbor-side infrastructure; with the volunteer fire department on marine emergencies (the fire department's mutual-aid agreement with the mainland fireboat is the harbormaster's primary reach for north-shore marine work).

## Daily duties

- Read the ferry-status cell, the tide cells, and the weather cell.
  Publish a daily ferry-status post to the public registry.
  (Pulse-on world-day.)
- On a `weather-changed` witness with the new state being storm or fog, evaluate whether to issue a harbor-closure witness.
  (Pulse-on weather-changed.)
- On marine-emergency dispatch, witness receipt and notify Coast Guard via the (forthcoming) marine-radio integration.

## Authority boundary

Below the high-tide line of [`farston-harbor`](../places/farston-harbor.md): harbormaster's authority.
Above: town's chartered jurisdiction (Building & Safety, Public Works, etc.).
The line itself shifts with sea-level events; the parcels-near-marsh map (referenced in [`marsh-end`](../places/marsh-end.md)) is also the harbor-boundary map.

## Recurring complications

- Storm-closure decisions are joint with Coast Guard for ferry-route matters; the office's autonomy ends at the channel buoys.
- Spring-tide + storm overlap is the worst case; the (forthcoming) ferry-status rule's "delayed | cancelled" projection reads tide-height alongside weather.
- North-shore marine emergencies are the longest-reach problem; mutual aid is regularly invoked.
