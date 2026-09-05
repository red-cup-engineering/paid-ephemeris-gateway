---
type: definition
class: system-entity
status: draft
realizes: [budget-record, resource-budget]
depends-on: [predication-cell, jsonl-event-log, witness, accounting, eligibility-by-rate-limit]
implementation: pyfars.dispatch.budget
---

# Budget record

The PyFARS-realization of an upstream [budget-record](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/objects/budget-record.md): a markdown file under `governance/budgets/<slug>.md` whose frontmatter binds the resource-kind, bound-value, scope, exhaustion-policy, and reset-policy as system cells, and whose `current-consumption` cell is updated by the consumption-witnessing morphism.

A budget record's content is *purely system-cells* — every field of the upstream definition lands as a $(s, p, o, v)$ predication on the budget's slug.
The runtime never reads "the budget object" as a Python data class; it reads the cells the projector emits from the markdown.

## Markdown shape

```markdown
---
slug: model-tokens-claude-opus-substrate
type: budget-record
resource-kind: model-tokens
bound-value: 1_000_000
scope: substrate
exhaustion-policy: defer
reset-policy: per-day
witness-requirements:
  - operation: invoke-llm-endpoint
    contributes: response.usage.total_tokens
---
```

The `current-consumption` cell is *not* in the markdown — it is computed by closure over the consumption-witness chain in the [JSONL event log](jsonl-event-log.md) and surfaces as a derived cell `(slug, current-consumption, <integer>) = t` per [`jsonl-is-canonical-state`](../claims/jsonl-is-canonical-state.md).

## Cells

A budget record's frontmatter projects to:

- `(slug, type, "budget-record") = t`
- `(slug, resource-kind, <kind>) = t`
- `(slug, bound-value, <number>) = t`
- `(slug, scope, <scope-slug>) = t`
- `(slug, exhaustion-policy, <policy>) = t`
- `(slug, reset-policy, <policy>) = t`

Plus per witness-requirement, a `(slug, witnesses-on-operation, <op-slug>) = t` cell.

The runtime computes `current-consumption` as the sum of `cells(e_i).amount` for all consumption-events $e_i$ in the log naming this budget since the last reset event.

## Antecedent for budget-gating closure rule

The dispatch closure rule that gates invocation reads:

$$\big((B, \texttt{current-consumption}, c) = \mathbf{t}\big) \wedge \big((B, \texttt{bound-value}, v) = \mathbf{t}\big) \wedge \big(c + \mathrm{cost}(W) > v\big) \;\Longrightarrow\; (W, \texttt{eligible-by-budget}, B) = \mathbf{f}$$

— the substrate disqualifies a workitem $W$ from invocation against budget $B$ when projected consumption would exceed bound.
Symmetric to [eligibility-by-rate-limit](eligibility-by-rate-limit.md) but on a different resource axis.

## Exhaustion-policy semantics

Per the upstream's exhaustion-policy values:

- `abort` — emit anomaly-witness on the `guard` channel; halt further allocation against this budget.
- `defer` — disqualify the workitem this tick, retry next tick (the default; gives the policy time to receive a reset or a budget adjustment without dropping the workitem).
- `escalate` — disqualify and emit an anomaly-witness routed to the budget's owner office for review.
- `degrade` — accept the workitem but route to a lower-cost endpoint (graceful-degradation; the lifecycle-policy semantics are still an open self-question).

The policy choice is itself a system cell — editing the markdown changes the runtime behavior next tick.

## Discussion

Budget records sit on the boundary between governance and dispatch: they are *governance* in the sense that the captain (or the owning office) authors them and adjusts them by editing markdown; they are *dispatch* in the sense that the dispatch closure-rule-system reads them every tick.
The discipline that makes both views consistent is [substrate-purity](../claims/substrate-purity.md) — no second representation of the budget exists in code.

The budget-as-substrate-cell pattern is the same for `closure-fuel`, `model-tokens`, `external-api-calls`, and per-day attention quotas; the polity authors one budget-record per resource-kind × scope, and the runtime treats them uniformly through the closure rule above.
