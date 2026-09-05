---
type: skill
name: "Issuing a harbor closure"
description: "Writes (farston-harbor, closed, true) with reason and expected-reopens-at, and publishes the closure to the public registry. Calls verbs only — no script body."
status: active
formality: F2
required-capabilities:
  - jurisdiction-write-on-harbor
  - records-publication
witness-format: harbor-closure-issued
channel: dispatch
recipe-form: orient-act-verify-witness

orient-reads:
  - subject: world-weather
    predicate: weather
  - subject: farston-harbor
    predicate: tide-state
  - subject: farston-harbor
    predicate: tide-height-m
  - subject: farston-harbor
    predicate: closed
  - subject: world-clock
    predicate: current-time

orient-guard: "world-weather.weather IN [storm, fog, severe] AND farston-harbor.closed != true"
orient-on-guard-fail: "delegate-to-evaluating-harbor-conditions-runbook"

act-computes:
  closure-reason: "derived-from-weather-state"
  expected-reopens-at: "next-stable-good-weather-window-projection"

act-invokes-verbs:
  - substrate.rewrite-cells
  - records.publish

act-writes:
  - subject: farston-harbor
    predicate: closed
    value: true
  - subject: farston-harbor
    predicate: closure-reason
    value: "<closure-reason>"
  - subject: farston-harbor
    predicate: closure-issued-at
    value: "(world-clock, current-time, ?)"
  - subject: farston-harbor
    predicate: expected-reopens-at
    value: "<expected-reopens-at>"
  - subject: farston-harbor
    predicate: closure-issuer
    value: "(workitem, assigned-to, ?)"

act-publishes-record:
  path-template: "operations/harbor/closures/<closure-slug>.md"
  type: harbor-closure-notice

verify-reads:
  - subject: farston-harbor
    predicate: closed
verify-condition: "farston-harbor.closed = true"

witness-fields:
  - closed-from
  - expected-reopens-at
  - reason
  - issuer
  - weather-snapshot
  - tide-height-snapshot
---


Recipe-normal-form.
The harbormaster invokes this skill when storm or fog conditions warrant closing the harbor to ferry traffic and recreational boating.
Frontmatter declares the complete substrate I/O — reads, guard, computed values, verb invocations, writes, published record path, verify, witness fields.

If the orient-guard fails (weather not severe enough, or harbor already closed), the skill defers to the [`evaluating-harbor-conditions`](../runbooks/evaluating-harbor-conditions.md) runbook, which decides whether to issue, extend, or no-op.

The published `harbor-closure-notice` is its own record-type; the closure is replayable from the event log even after the cells are later cleared on reopening.
