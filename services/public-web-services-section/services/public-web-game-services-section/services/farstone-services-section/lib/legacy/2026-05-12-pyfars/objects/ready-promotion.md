---
type: definition
class: closure-rule
status: draft
realizes: [scheduling-policy, dispatch-closure-rule-system]
depends-on: [dispatch-closure-rule-system, work-record, work-status, settling]
---

# Ready promotion

A closure rule in the dispatch-closure-rule-system: a work-record at status `pending` is *promoted* to status `ready` when its blockers are settled and its requirements are sufficiently specified.
The rule that bridges intake/plan and dispatch by deciding when a work-record is dispatchable.

## Rule statement

For a work-record $W$ with `status: pending`, blockers $B = \{B_1, \ldots, B_k\}$ (referenced by `(W, blocked-by, B_i)` cells), and a sufficiency predicate $\phi(W)$ (defined below):

$$\big( \forall B_i \in B,\; (B_i, \texttt{status}, \texttt{settled}) = \mathbf{t} \big) \;\wedge\; \phi(W) \;\Longrightarrow\; (W, \texttt{status}, \texttt{ready}) = \mathbf{t}$$

The promotion fires when: 1.
Every blocker is settled.
2.
The sufficiency predicate $\phi(W)$ holds — typically: $W$ has at least one of `requires-skills:`, `requires-capabilities:`, or `requires-jurisdiction:` declared (so dispatch has something to evaluate eligibility against).

A work-record without any requirements declared is *under-planned*; the rule does not promote it.
The plan morphism's job is to set requirements.

## Antecedent cells

The rule reads: - `(W, status, pending) = t` — the work-record's current status. - `(W, blocked-by, B_i)` cells for each blocker. - `(B_i, status, settled)` cells for each blocker's status. - `(W, requires-skills, *)`, `(W, requires-capabilities, *)`, `(W, requires-jurisdiction, *)` cells (any non-empty set satisfies $\phi$).

## Consequent cells

The rule produces: - `(W, status, ready) = t` when all conditions hold. - Implicit: status `pending` is no longer the current status.
(The bilattice machinery handles the transition; the prior `(W, status, pending)` cell is superseded.)

A new witness in the JSONL log records the promotion.

## What "blockers settled" means

A blocker $B_i$ is settled when: - $(B_i, \texttt{status}, \texttt{settled}) = \mathbf{t}$, OR - $B_i$ is an external dependency whose settling is observed (a witness cell records the external event), OR - The polity's closure rules derive $B_i$'s settling from its own substrate (e.g., a date-blocker settles when the date passes).

The first case is the common one — a sibling work-record completes, and that completion fires the unblock chain.

## Composition

Ready-promotion is a *status-transition* rule.
It composes with the dispatch eligibility rules: a work-record at `ready` enters the work-queue and is read by dispatch's eligibility rules.
Without ready-promotion, no work moves from pending to dispatchable.

The closure dynamics for ready-promotion are typically immediate (when blockers settle, ready-promotion fires the next tick).
For Scott-continuous-regime sub-domains, ready-promotion may need a checkpoint at the $\omega$-limit if the blocker chain is infinite — the realization currently doesn't handle this; finite blocker chains are the assumption.

## Polity-extension

- *Sufficiency refinement*: a polity may strengthen $\phi$ to require additional fields beyond the basic requirements (e.g., `requires-budget:` for paid work; `requires-charter-binding:` for work touching charter scope).
  Add as a closure rule.
- *Custom blocker types*: a polity may define blocker kinds beyond plain work-record references (e.g., a "reviewer must approve" blocker).
  Add as a system-tracked predicate plus a settling rule for the predicate.

## What this rule does not do

- It does not fire when a work-record is created.
  Pending is the default status; readiness is a state the work-record reaches *after* planning has set its requirements and dependencies have settled.
- It does not handle abandonment.
  A work-record that should never reach ready (because its goal is no longer worth pursuing) is *abandoned* via a separate witness, not by failing to ready-promote.
- It does not select among multiple ready work-records.
  The work-queue's ordering is a separate selection-policy concern.

## Open structural questions

- The treatment of soft blockers — dependencies that *would* be helpful but aren't strict.
  A polity might want "ready, but lower priority because soft blocker not settled."
  Currently no soft-blocker handling.
- Cyclic blockers.
  If two work-records each block the other, neither can ready-promote.
  The system's bilattice machinery surfaces the cycle; adjudication is a separate process.
- The boundary with the plan morphism.
  Plan sets requirements; ready-promotion checks them.
  If plan is incomplete, ready-promotion never fires; the work-record remains pending.
  A timeout or escalation rule could surface the stuck-in-pending case; currently captain-audit is the catch.
