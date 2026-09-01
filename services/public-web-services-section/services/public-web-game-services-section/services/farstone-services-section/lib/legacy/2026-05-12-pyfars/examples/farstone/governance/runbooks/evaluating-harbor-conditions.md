---
type: runbook-record
kind: operational-runbook
title: "Evaluating harbor conditions (storm response)"
status: active
trigger:
  matches: pulse
  predicates:
    - subscriber: harbormaster
    - cadence: weather-changed
required-capabilities:
  - harbor-coordination
  - jurisdiction-write-on-harbor
  - records-publication
  - emergency-witnessing
state-shape:
  - severity-classification
  - closure-decision
  - ferry-status-decision
witness-format: harbor-conditions-evaluation
steps:
  - step-name: classify-severity
    skill: classifying-weather-severity
    input-binding:
      weather: "(world-weather, weather, ?)"
      tide-height: "(farston-harbor, tide-height-m, ?)"
      tide-state: "(farston-harbor, tide-state, ?)"
      dry-streak-days: "(world-weather, dry-streak-days, ?)"
    binds-state: severity-classification
    branch-condition: null
    failure-policy: abort

  - step-name: issue-closure-if-warning-or-emergency
    skill: issuing-harbor-closure
    input-binding:
      reason: "derived-from-weather-state"
    binds-state: closure-decision
    branch-condition: "severity-classification IN [warning, emergency]"
    failure-policy: abort

  - step-name: publish-cancelled-ferry-status
    skill: publishing-ferry-status
    input-binding:
      status: cancelled
    binds-state: ferry-status-decision
    branch-condition: "severity-classification IN [warning, emergency]"
    failure-policy: skip

  - step-name: dispatch-marine-emergency-response
    skill: dispatching-marine-emergency-response
    input-binding: {}
    binds-state: null
    branch-condition: "severity-classification = emergency"
    failure-policy: escalate

  - step-name: publish-delayed-ferry-status
    skill: publishing-ferry-status
    input-binding:
      status: delayed
    binds-state: ferry-status-decision
    branch-condition: "severity-classification = advisory"
    failure-policy: skip

  - step-name: publish-on-schedule-ferry-status
    skill: publishing-ferry-status
    input-binding:
      status: on-schedule
    binds-state: ferry-status-decision
    branch-condition: "severity-classification = none"
    failure-policy: skip
on-complete-cells:
  - subject: harbormaster
    predicate: last-conditions-evaluation-at
    value: "(world-clock, current-time, ?)"
  - subject: harbormaster
    predicate: last-closure-issued-at
    value: "(world-clock, current-time, ?)"
    only-if: "closure-decision = closed"
per-step-witnesses:
  - "(<runbook-instance>, step-N-invoked, <skill-slug>) = T"
  - "(<runbook-instance>, step-N-completed, <outcome>) = T"
  - "(<runbook-instance>, step-N-skipped, <branch-reason>) = T"
---

# Evaluating harbor conditions

The harbormaster's runbook for responding to a `weather-changed` pulse — decides whether to close the harbor, what ferry-status to publish, and whether to notify the Coast Guard.
Composes four substrate skills with branching and bound state.

The structured `steps:` frontmatter is the executable form a runbook-runner reads.
Each step's `branch-condition` is an expression over the runbook's bound state plus substrate cells; the runbook-runner evaluates the condition, runs or skips the step accordingly, and emits per-step witnesses.

If `issue-closure-if-warning-or-emergency` succeeds but `publish-cancelled-ferry-status` fails, the runbook does NOT roll back the closure — the closure is the time-critical action.
Failure-policy `skip` on the publish step lets the runbook complete with a partial-completion witness; the records-clerk's daily registry consistency check (forthcoming) surfaces the missing post.

`failure-policy: escalate` on the marine-emergency dispatch step means: if the Coast Guard contact fails, the runbook escalates to the mayor for direct outreach.
