---
type: index
status: open

contents:
  - slug: evaluating-harbor-conditions
    kind: operational-runbook
    trigger-cadence: weather-changed
    trigger-subscriber: harbormaster

required-fields-on-runbook-record:
  - slug
  - type
  - kind
  - trigger
  - required-capabilities
  - witness-format
  - steps
optional-fields-on-runbook-record:
  - state-shape
  - on-complete-cells
---

# Farstone runbooks

Composed procedures — sequences of skill invocations with branching, bound state, and recovery — that exceed the 1-to-4-step boundedness of a single skill.
Per [`concepts/runbook.md`](../../../../concepts/runbook.md), a runbook differs from a skill in that it (a) composes multiple invocations, (b) branches on prior results, (c) maintains bound state across steps, and (d) carries explicit failure-policy on each step.

A runbook record's `steps:` block is the executable form a runbook-runner reads.
Each step has `step-name`, `skill`, `input-binding`, `branch-condition`, `failure-policy`, and (optional) `binds-state`.
Per-step witnesses make the run replay-deterministic.

From the invoker's perspective, a runbook IS a tool: it has a schema, it produces an output, it can be invoked.
The invoker doesn't need to look inside the runbook to use it — only at its frontmatter.
