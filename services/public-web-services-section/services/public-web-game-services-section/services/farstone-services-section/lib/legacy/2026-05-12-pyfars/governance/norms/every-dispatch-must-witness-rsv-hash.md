---
title: "Every dispatch must witness its rule-system version hash"
type: norm
status: active
deontic-operator: Obl
propositional-content: "(execution-event, includes-rsv-hash, true) = T for every event with kind 'dispatch'"
operative-in: charter
antecedent: "(event, kind, dispatch) = T"
subject: dispatch-graph
closure-rule: dispatch-witness-completeness
violation-witness: "(execution-event, missing-rsv-hash, true) = T (an audit cell)"
authority-grounding: charter-c2-first-class-provenance
---


## What this norm requires

It is **OBLIGATORY** that every execution event of kind `dispatch` includes the `rsv_hash` (rule-system version hash) of the closure-rule subsystem that produced it.
The norm operates universally over the dispatch-graph: every invocation, every selection, every eligibility settlement that a dispatch event records must carry the version of the rules that determined it.

## When it fires (antecedent)

The norm's closure rule fires whenever an event is added to the event log with `kind: dispatch`.
The antecedent is `(event, kind, dispatch) = T`; the consequent is the requirement that `(event, includes-rsv-hash, true) = T`.

## Authority grounding

[Charter](../charter.md) commitment C2 — *first-class provenance*.
C2 commits the substrate to making the determination chain of every settled cell auditable.
A dispatch event without `rsv_hash` is provenance-incomplete: an auditor cannot reconstruct the rules that produced the dispatch decision, which means the event's predicate witnesses are unverifiable.

This norm is the operational realization of C2 at the dispatch boundary.

## Closure-rule realization

| Operator | Closure-rule shape |
|---|---|
| `Obl(includes-rsv-hash)` | `(event, kind, dispatch) = T ⟹ (event, includes-rsv-hash, true) ≥_k T`. Failure leaves `includes-rsv-hash` at $\bot$, which the auditing rule `dispatch-witness-completeness` detects as a duty-breach and emits `(execution-event, missing-rsv-hash, true) = T`. |

The norm itself is the *first* rule (the obligation); the *second* rule (the auditor) is what makes the breach substrate-visible.

## Hohfeldian relations generated

Per the four-invariant analysis in [predgov norm](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/norm.md), an operative obligation generates [jural-relations](../jural-relations/_index.md):

- A `kind: duty` jural relation on the `dispatch-graph` (active-holder), with scope-action `emit-rsv-hash`.
  Correlative: a `kind: claim/right` jural relation held by every audit-consuming party (the captain, downstream federated engines, the [`add-event-log-replay-test`](../../work/tasks/engineering/add-event-log-replay-test.md) test) regarding the same scope-action.
- The claim-rights are what give the `add-event-log-replay-test` test substrate-algebraic standing: the test is not just code that runs; it's a duty-correlate exercising its claim that every dispatch event carry `rsv_hash`.

## Validity vs. truth

This norm is **valid** (in force) iff: - Recognition: `(every-dispatch-must-witness-rsv-hash, recognized-as-norm-in, charter) = T` — the charter has settled this norm as part of its normative system. - Forward-binding: `(every-dispatch-must-witness-rsv-hash, forward-binding-in, charter) = T` — the norm is not stayed, suspended, or pending repeal.

A *valid* norm whose subjects are *complying* shows no `missing-rsv-hash` cells.
A valid norm whose subjects are *not* complying produces violation-witness cells while remaining valid — non-compliance does not retract the rule.

## Why this is a norm and not (e.g.) a duty record

A `governance/duties/` record is bound to a specific office: "the executive officer's duty to consult predwork before encoding".
This norm's subject is the `dispatch-graph` itself, not an office.
It binds *every dispatch event*, not a person.

It's also not a [decision](../decisions/) — a decision settles a position; this is a *rule of conduct* that fires repeatedly.
And it's not a [convention](../conventions.md) — conventions are guidance with no closure rule.

What it is: an obligation in the normative system, realizing C2.
That's a norm.
