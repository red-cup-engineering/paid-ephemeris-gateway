---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
shape: disqualification-negative
common-knowledge-grade: knowledge
flag-predicate: charter-binding-violated
flag-object: "true"
consequent-predicate: eligible-by-charter-binding
realizes: [scheduling-policy, dispatch-closure-rule-system]
depends-on: [dispatch-closure-rule-system, predication-cell, charter-binding]
---

# Eligibility by charter-binding

A disqualification rule in the dispatch-closure-rule-system: when a dispatchable carries a `charter-binding-violated = true` cell, it cannot be assigned work this tick on the charter axis.
Realizes the disqualification-rule category in [dispatch-closure-rule-system](dispatch-closure-rule-system.md).

## What charter-binding expresses

A polity's charter declares hard constraints — operational or ethical — that every dispatchable must honor.
When an audit (manual or automated) finds an office or endpoint in violation, the system records `(D, charter-binding-violated, "true") = \mathbf{t}`.
The cell is positive evidence; the dispatchable doesn't pick up new work until the violation is cleared (the cell is removed or refreshed to `"false"`).

## Rule statement

For a dispatchable $D$ with `(D, \text{charter-binding-violated}, "true") = \mathbf{t}`, and for every workitem $W$ this tick:

$$(D, \texttt{charter-binding-violated}, "true") = \mathbf{t} \;\Longrightarrow\; (W, \texttt{eligible-by-charter-binding}, D) = \mathbf{f}$$

## Antecedent and consequent cells

Antecedent: `(D, charter-binding-violated, "true")`.
Pyfars expects this cell to be written by an audit observer (system cell, agent, or external monitor) when the violation is detected; cleared the same way when the violation is resolved.

Consequent: `(W, eligible-by-charter-binding, D) = \mathbf{f}` for every workitem $W$.

## Why a single boolean rather than per-violation cells

A polity's charter has many provisions; a single `charter-binding-violated` flag is the pragmatic disqualification predicate.
The detail of *which* provision was violated is a separate concern, recorded under predicates like `charter-violation-reason`, `charter-violation-clause`, `charter-violation-evidence`.
Those don't gate dispatch directly — only the boolean flag does.
The detail records the why, the flag controls the gate.

## Composition with positive eligibility rules

Same as rate-limit: when this rule fires `\mathbf{f}` and any positive rule emits `\mathbf{t}` on the same cell, the knowledge-join is `\top` (paraconsistent contradiction).
Adjudication is a separate rule.

## Polity-extension

- *Per-clause disqualification*: a polity carrying violation-clause cells can install rules disqualifying for specific work types based on which clause was violated (e.g., a privacy violation disqualifies for personally-identifying data tasks but not for code review).
- *Probationary status*: a polity may declare a `charter-probation` predicate that *partially* disqualifies — disqualified for certain work classes but not others.

## Open structural questions

- *Self-clearing*.
  Whether a violation cell auto-expires (a TTL discipline) or requires explicit system write to clear is a polity-policy.
  Default is no expiry; the violation persists until written-over.
- *Inheritance*.
  When an office holds another office (delegation), does the parent's violation propagate?
  Currently no; each office is independently flagged.
