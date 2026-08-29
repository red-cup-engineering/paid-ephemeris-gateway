---
type: definition
class: system-entity
status: draft
realizes: [runbook-record, runbook]
depends-on: [predication-cell, skill-record, dispatch-closure-rule-system, jsonl-event-log]
implementation: pyfars.governance.runbook
---

# Runbook record

The PyFARS-realization of upstream [runbook-record](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/runbook-record.md): a markdown file under `governance/runbooks/<slug>.md` composing a sequence of [skill](skill-record.md) invocations into a workflow the dispatch graph can fire as a unit.

A runbook is *not* a separate execution kind — it is a workitem whose `dispatchable:` is `runbook-runner`, whose body is a sequence of skill invocations against system cells.
The dispatch graph fires runbooks the same way it fires individual skills; the runbook-runner is the agent that walks the body.

## Markdown shape

```markdown
---
slug: ship-pr-after-tests-pass
type: runbook-record
trigger:
  matches: workitem
  predicates:
    - kind: pr-shipping
    - branch-state: tests-passing
context:
  - read: pr.<slug>
  - read: tests.<branch>
provides-capability: pr.shipping.workflow
requires-capabilities: [git.push, gh.pr-merge, substrate.write]
---

# Runbook body

1. Invoke skill `verifying-tests-passed` against `tests.<branch>`.
2. If verified, invoke `merging-pr` against `pr.<slug>`.
3. If merge succeeded, invoke `closing-pr-workitem` against `pr.<slug>`.
4. On failure at any step, emit `(runbook-instance, failed-at, <step>)` and halt.
```

## Cells

A runbook record's frontmatter projects to:

- `(slug, type, "runbook-record") = t`
- `(slug, trigger-pattern, <pattern-slug-or-inline>) = t`
- `(slug, provides-capability, <cap>) = t`
- `(slug, requires-capabilities, <cap>) = t` — union of all called skills' requirements
- `(slug, requires-skills, <skill-slug>) = t` — one cell per skill the runbook invokes

## Trigger as closure-rule-fragment

The runbook's `trigger:` block is a closure-rule-fragment: when a workitem's cells match the trigger's predicates, the dispatch graph queues a runbook-instance against this runbook.
Triggers are read by [`eligibility-by-message`](eligibility-by-message.md) and [`eligibility-by-skills`](eligibility-by-skills.md) the same way per-skill eligibilities are.

A runbook with no `trigger:` block is dispatchable only via explicit invocation (a workitem whose `dispatchable:` field names the runbook).

## Per-step witnesses

Each step of the runbook's body emits a witness to the JSONL log: - `(runbook-instance, step-N-invoked, <skill-slug>)` - `(runbook-instance, step-N-completed, <outcome>)`

Per-step witnesses make runbook execution replay-deterministic per [`replay-determinism`](../claims/replay-determinism.md): a runbook's behavior is fully recoverable from the log even if the runbook's markdown is later edited.

## Composition with on-complete

A runbook's terminating step typically writes an `on-complete:` cell on the runbook-instance, triggering [`queueing-follow-on`](../morphisms/queueing-follow-on.md) to materialize successor workitems.
This is how runbooks compose into larger workflows without nesting — the system's existing follow-on machinery handles cross-runbook chaining.

## Discussion

The runbook-record's existence is what makes M5's `runbooks-as-first-class-substrate` goal substantively different from "skills with longer bodies."
Runbooks have: - A *trigger* the dispatch graph reads - An *execution model* that walks steps and emits per-step witnesses (skills are atomic from dispatch's perspective) - A *failure semantics* that halts at a step and surfaces the failure as a $\top$-cell (per [anomaly-witness](anomaly-witness.md))

The runbook-runner agent that walks the body is itself a system-resident entity with a `provides-capability: runbook.execution` cell.
