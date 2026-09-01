---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
shape: disqualification-negative
common-knowledge-grade: knowledge
flag-predicate: rate-limit-remaining
flag-object: "0"
consequent-predicate: eligible-by-rate-limit
realizes: [scheduling-policy, dispatch-closure-rule-system]
depends-on: [dispatch-closure-rule-system, predication-cell, llm-endpoint]
---

# Eligibility by rate-limit

A disqualification rule in the dispatch-closure-rule-system: when a dispatchable's rate-limit budget reads zero, it cannot be assigned work this tick.
Realizes the disqualification-rule category in [dispatch-closure-rule-system](dispatch-closure-rule-system.md).

## Rule statement

For a dispatchable $D$ (typically an llm-endpoint or a rate-limited tool) with `(D, \text{rate-limit-remaining}, "0") = \mathbf{t}`, and for every workitem $W$ this tick:

$$(D, \texttt{rate-limit-remaining}, "0") = \mathbf{t} \;\Longrightarrow\; (W, \texttt{eligible-by-rate-limit}, D) = \mathbf{f}$$

## Antecedent and consequent cells

Antecedent: `(D, rate-limit-remaining, "0")` cell.
Pyfars expects this cell to be (re)written by an out-of-band heartbeat that polls each rate-limited dispatchable's current quota.
When the cell is absent or the value is non-`"0"`, the disqualification rule does not fire.

Consequent: `(W, eligible-by-rate-limit, D) = \mathbf{f}` for every workitem $W$.

## Composition with positive eligibility rules

When this rule fires `\mathbf{f}` and a positive rule (e.g., a capabilities-side rule emitting on the same cell, or a manual override) emits `\mathbf{t}`, the knowledge-join is `\top` (paraconsistent contradiction).
Dispatch surfaces `\top` cells rather than silently picking; an adjudication rule (not yet specified) decides.

## Why F-on-cell rather than absent-eligibility

A disqualified dispatchable could be modeled by simply not emitting `\mathbf{t}` from positive rules — but absence is `\bot`, which is "unspecified," not "explicitly disqualified."
Emitting `\mathbf{f}` lets later rules and audits distinguish "we didn't check rate-limit" (absent) from "rate-limit said no" (`\mathbf{f}`).
The federation case especially needs the distinction: an absent cell is the default state of an ungossiped peer, while an `\mathbf{f}` cell is positive evidence the peer must observe.

## Polity-extension

- *Soft rate-limit*: a polity may emit a continuous-valued rate-limit pressure cell rather than a binary exhausted/not flag, with a separate rule reading the pressure cell and emitting `\mathbf{f}` only above a threshold.
- *Per-tier rate-limit*: a polity may carry per-capability rate-limit cells (e.g., `(D, rate-limit-remaining-for-text-generation, "0")`) so a partially-exhausted endpoint remains eligible for capabilities not consuming the exhausted quota.

## Open structural questions

- The freshness of rate-limit cells.
  When the heartbeat is slow, an exhausted cell can persist after the rate-limit clock has rolled over.
  The discipline for invalidating stale cells is open.
- Multi-budget dispatchables.
  An llm-endpoint may carry separate per-minute and per-day budgets; a single binary cell is too coarse.
  Either two cells with separate disqualification rules or a typed tuple — open.
