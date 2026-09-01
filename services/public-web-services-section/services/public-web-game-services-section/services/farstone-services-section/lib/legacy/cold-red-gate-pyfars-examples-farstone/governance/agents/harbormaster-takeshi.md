---
type: human
name: "Takeshi Aoki"
role: "Harbormaster of Farston"
description: "Town-appointed harbormaster, three-year term, commercial-fishing background."
serves: [harbormaster]
provides-capabilities:
  - harbor-coordination
  - emergency-witnessing
provides-skill:
  - issuing-harbor-closure
  - publishing-ferry-status
  - dispatching-marine-emergency-response
jurisdiction:
  write:
    - examples/farstone/governance/state/harbor/
    - examples/farstone/operations/harbor/
duties:
  - declare-harbor-closure-on-severe-storm
  - publish-ferry-status-each-day
  - notify-coast-guard-on-marine-emergency
charter-bindings:
  rules:
    - farston-charter
pulses-on:
  - world-day
  - weather-changed
---


Harbormaster of Farston.
Resident of Farston since 1998; thirty-plus-year career in commercial fishing before taking the office in 2023.
Lives on a sailboat moored at the harbor in the warm half of the year, in a rented flat above [`harbor-cafe`](../businesses/harbor-cafe.md) in winter.

## Office

Serves [`harbormaster`](../offices/harbormaster.md).
Holds the duties and jurisdiction described there.

## Active concerns

- Aging breakwater — the western face shows storm damage from the 2024 winter; budget request pending for FY2027.
- Mainland Coast Guard staffing changes — the harbormaster's after-hours contact has shifted twice in 18 months; the runbook for marine-emergency notification needs an update.
- North-shore mutual aid — agreement renewal with the mainland fireboat service is up at end of FY2026.
