---
title: "Test that the operator drives Farston unattended through the web UI"
type: task
area: engineering
status: open
horizon: doing
milestone: m17-561-productivity-stack
goal: governance-app-view
depends-on: [implement-web-ui-live-ticks-and-intent-submission, implement-web-ui-substrate-browser-and-predication-cell-view, implement-web-ui-dispatch-graph-visualizer, implement-web-ui-dashboards-for-sessions-offices-agents-workitems]
requires-capabilities: [testing, integration-testing]
theory-basis: [charter-as-closure-system]
---


## Description

Acceptance test for Arc D: the operator runs Farston (the mock-municipality testbed polity) entirely through the web UI for an extended session, with no shell-level intervention required.
The test exercises: intent submission, dispatch monitoring, anomaly review, witness inspection, session lifecycle.

Per the dump: D.
0–D.
7 code shipped 2026-05-09; D.
8 is the live-acceptance step still open.
This task is the open one.

## Acceptance

- [ ] An operator session with Farston runs for at least 1 hour entirely through the web UI.
- [ ] At least 10 intents submitted and dispatched without shell access.
- [ ] At least one anomaly surfaced and adjudicated through the UI.
- [ ] No engine-side errors require terminal intervention.
- [ ] Operator-experience finding written at `governance/findings/web-ui-farston-acceptance-<date>.md`.

## Progress cells

*(empty — task not yet started)*
