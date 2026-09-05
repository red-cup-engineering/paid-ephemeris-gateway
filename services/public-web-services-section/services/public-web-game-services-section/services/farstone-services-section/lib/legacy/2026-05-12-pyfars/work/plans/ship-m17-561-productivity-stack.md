---
title: "Ship [M17 — 561 Productivity Stack](../milestones/m17-561-productivity-stack.md) as a coordinated plan"
type: plan
status: substantially-landed
milestone: m17-561-productivity-stack
tasks:
  - implement-read-side-api-endpoints
  - implement-sse-witness-stream-endpoint
  - implement-web-ui-live-ticks-and-intent-submission
  - implement-web-ui-substrate-browser-and-predication-cell-view
  - implement-web-ui-dispatch-graph-visualizer
  - implement-web-ui-dashboards-for-sessions-offices-agents-workitems
  - update-charter-and-decisions-docs-web-no-longer-demo-only
  - test-operator-drives-farston-unattended-through-web-ui
dependency-order:
  - [implement-read-side-api-endpoints, implement-sse-witness-stream-endpoint]
  - [implement-sse-witness-stream-endpoint, implement-web-ui-live-ticks-and-intent-submission]
  - [implement-read-side-api-endpoints, implement-web-ui-substrate-browser-and-predication-cell-view]
  - [implement-read-side-api-endpoints, implement-web-ui-dispatch-graph-visualizer]
  - [implement-read-side-api-endpoints, implement-web-ui-dashboards-for-sessions-offices-agents-workitems]
  - [implement-web-ui-live-ticks-and-intent-submission, update-charter-and-decisions-docs-web-no-longer-demo-only]
  - [implement-web-ui-substrate-browser-and-predication-cell-view, update-charter-and-decisions-docs-web-no-longer-demo-only]
  - [implement-web-ui-dispatch-graph-visualizer, update-charter-and-decisions-docs-web-no-longer-demo-only]
  - [implement-web-ui-dashboards-for-sessions-offices-agents-workitems, update-charter-and-decisions-docs-web-no-longer-demo-only]
  - [update-charter-and-decisions-docs-web-no-longer-demo-only, test-operator-drives-farston-unattended-through-web-ui]
milestone-cells:
  - "(read-side-api, shipped, true) = T"
  - "(sse-witness-stream, shipped, true) = T"
  - "(web-ui-live-ticks, shipped, true) = T"
  - "(web-ui-substrate-browser, shipped, true) = T"
  - "(web-ui-dispatch-visualizer, shipped, true) = T"
  - "(web-ui-dashboards, shipped, true) = T"
  - "(charter-web-not-demo, updated, true) = T"
  - "(operator-drives-farston-via-web-ui, accepted, true) = T"
normative-cleanup: tracked
---


## Status

**Substantially landed.** Per the dump from the implementing agent, the eight constituent tasks split as: D.
1–D.
7 code shipped pyfars commits 2026-05-09 (read-side endpoints, SSE stream, four web-UI views, charter doc updates); D.
8 (operator drives Farston unattended through the web UI) is the remaining acceptance step.

Closing requires the live-acceptance session (one operator hour with Farston, intents and adjudications all through the UI, no shell intervention) plus the operator-experience finding documenting what worked and what surfaced.

## Dependency structure

The eight tasks form a fan-out from the read-side API plus a downstream join at the doc-update + acceptance test:

```
implement-read-side-api-endpoints
        │
        ├──→ implement-sse-witness-stream-endpoint ──→ implement-web-ui-live-ticks-and-intent-submission ─┐
        ├──→ implement-web-ui-substrate-browser-and-predication-cell-view ──┐                            │
        ├──→ implement-web-ui-dispatch-graph-visualizer ─────────────────────┤                            │
        └──→ implement-web-ui-dashboards-for-sessions-offices-agents-workitems ─┐                        │
                                                                                │                        │
                                              ┌─────────────────────────────────┴────────────────────────┘
                                              ▼
                            update-charter-and-decisions-docs-web-no-longer-demo-only
                                              │
                                              ▼
                            test-operator-drives-farston-unattended-through-web-ui
```

## What this plan does NOT cover

- **Write-endpoints** beyond `/intent` and `/witness` already shipped.
  Whether the web UI should expose substrate-write endpoints (corpus editing, governance amendments) is a separate captain decision.
- **Multi-operator collaboration** features (concurrent operator sessions, operator-to-operator handoff) — not in M17 scope.

## Theory grounding

- [Predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md).
- [Plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md).
