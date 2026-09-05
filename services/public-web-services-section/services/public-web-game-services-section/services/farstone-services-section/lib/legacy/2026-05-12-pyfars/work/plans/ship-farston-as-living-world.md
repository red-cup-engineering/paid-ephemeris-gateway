---
title: "Ship Farston-as-living-world (testbed plan)"
type: plan
status: doing
milestone: null
tasks:
  - route-enactment-by-workitem-subtype
  - implement-script-enactor-for-processual-and-procedural-workitems
  - author-world-clock-substrate-records-and-advance-clock-command
  - author-opening-hours-closure-rule-and-instantiator
  - seed-farston-world-state-businesses-citizens-calendar
  - implement-per-entity-fiber-bundle-endpoint-and-operator-ui-clickable-names
  - test-farston-ticks-unfold-visible-actions
dependency-order:
  - [route-enactment-by-workitem-subtype, author-world-clock-substrate-records-and-advance-clock-command]
  - [implement-script-enactor-for-processual-and-procedural-workitems, author-world-clock-substrate-records-and-advance-clock-command]
  - [author-world-clock-substrate-records-and-advance-clock-command, author-opening-hours-closure-rule-and-instantiator]
  - [author-opening-hours-closure-rule-and-instantiator, seed-farston-world-state-businesses-citizens-calendar]
  - [seed-farston-world-state-businesses-citizens-calendar, implement-per-entity-fiber-bundle-endpoint-and-operator-ui-clickable-names]
  - [implement-per-entity-fiber-bundle-endpoint-and-operator-ui-clickable-names, test-farston-ticks-unfold-visible-actions]
  - [author-opening-hours-closure-rule-and-instantiator, test-farston-ticks-unfold-visible-actions]
plan-cells:
  - "(workitem-subtype-routing, shipped, true) = T"
  - "(script-enactor, shipped, true) = T"
  - "(world-clock, live-verified, true) = T"
  - "(opening-hours-rule, fires-correctly, true) = T"
  - "(farston-world-state, seeded, true) = T"
  - "(per-entity-fiber-endpoint, ui-clickable, true) = T"
  - "(farston-ticks-unfold-visibly, accepted, true) = T"
normative-cleanup: tracked
---


## What this plan does

The Farston-as-living-world plan brings the mock-municipality testbed under `examples/farstone/` to a state where the operator running PyFARS can watch the polity *unfold* — businesses opening and closing on schedule, citizens following daily routines, the world-clock advancing, the web UI showing live activity.
The plan is a substrate testbed for development, not a roadmap milestone — there is no "Farston ships to production."
Its value is making PyFARS's substrate-residency commitments observable on a small, comprehensible polity.

Per the dump, two tasks shipped (`route-enactment-by-workitem-subtype`, `implement-script-enactor-for-processual-and-procedural-workitems`, both in pyfars commit `f762255`); one is in-flight (`author-world-clock-substrate-records-and-advance-clock-command`, blocked on pyfars install pipeline state); four remain open.

The plan has no `milestone:` binding because Farston is not a roadmap milestone.
The plan exists to coordinate the testbed work as a coherent thread.

## Dependency structure

```
route-enactment-by-workitem-subtype       ──┐
implement-script-enactor-for-processual-and-procedural-workitems ──┤
                                            │
                                            ▼
        author-world-clock-substrate-records-and-advance-clock-command
                                            │
                                            ▼
                author-opening-hours-closure-rule-and-instantiator
                                            │
                                            ▼
                seed-farston-world-state-businesses-citizens-calendar
                                            │
                                            ▼
                implement-per-entity-fiber-bundle-endpoint-and-operator-ui-clickable-names
                                            │
                                            ▼
                            test-farston-ticks-unfold-visible-actions
```

## What this plan does NOT claim

Farston is not a polity bound by 561's charter.
It's a testbed; the seed citizens and businesses are illustrative, not committed-to.
Operations on Farston are not federated with cold-red-gate or any production polity.

## Outstanding ops blocker

`author-world-clock-substrate-records-and-advance-clock-command` is in-progress with the records and Python module committed (pyfars `82e844f`) but live verification blocked behind pyfars install pipeline state — the system pyfars binary post-flake-bump exposes only `clean/help/install/run`.
Captain to confirm whether this is expected refactor state or a regression.
Resolution unblocks the rest of this plan.
