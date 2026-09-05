---
title: "Anomaly surfacing via contradiction cells"
type: goal
milestone: m3-continuous-loop
status: open
horizon: soon
theory-basis: [anomaly-as-contradiction, charter-as-closure-system]
tasks:
  - detect-top-cells-and-queue-review-workitems
---


After this goal, when the closure-rule system produces `⊤`-valued cells (knowledge-join of `T` and `F` from rules with conflicting consequents), the dispatch graph surfaces the contradiction as an anomaly witness and queues a review workitem.
The polity sees its own contradictions instead of swallowing them silently.

## Why

The bilattice's `⊤` value is the system's mechanism for paraconsistent surfacing of conflicts.
Per the FARS spec's `anomaly-as-contradiction` concept, a `⊤` cell isn't a bug — it's the substrate's correct response to a contradiction in the rule input.
But for the polity to act on it, the runtime has to make `⊤` cells visible: emit witnesses, queue review work, and (where appropriate) refuse to dispatch on the affected axes.

The closure runner already produces `⊤` cells correctly — it's a property of `pypredcalc`'s `knowledge_join`.
What's missing is the surface: the dispatch graph reads the closed store but doesn't emit anomaly-shaped witnesses when it finds `⊤`s, and there's no review-workitem queueing.

## Theory grounding

**1.
Anomaly-as-contradiction** ([`flatfile-agentic-resource-system/concepts/anomaly-as-contradiction`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/anomaly-as-contradiction.md)).
The discipline is that **anomalies are substrate-visible $\top$-cells, not signals from a separate monitoring layer.** When the closure-rule system fires and produces a $\top$-valued cell — knowledge-join of a $\mathbf{t}$ and $\mathbf{f}$ from rules with conflicting consequents — that cell IS the anomaly.
Anomaly detection is closure-rule application; anomaly surfacing is event emission; anomaly response is repair invocation.
There is no separate monitoring subsystem.

The concept's load-bearing claim: **a $\top$-cell is the substrate's correct response to contradicting input**, not a bug.
The bilattice's four-state algebra exists precisely so that contradictions can be carried *visibly* in the substrate rather than thrown as out-of-band exceptions.
The anomaly-surfacing layer this goal builds is the discipline that makes those visible cells *actionable*: emit a witness, queue a review.

**2.
Validation-as-settlement at the operational tier** ([`flatfile-agentic-resource-system/concepts/validation-as-settlement`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/validation-as-settlement.md)).
At the input tier, validation rejects bad inputs as $\top$ before they reach the substrate.
At the operational tier, anomaly-as-contradiction surfaces bad operational states as $\top$ after they're in the substrate. **Both use the same machinery; both rely on the four-valued bilattice carrying the failure visibly.** The anomaly-surfacing work here is the operational-tier counterpart of the substrate-validation rules in `closure/rule/`.

**3.
Adjudication and the truth-knowledge cohomology long exact sequence** (per `dispatch-readiness`).
When $\delta(A, T) = \top$, the inconsistency is recorded in the LES applied to the dispatch sheaf.
The connecting morphism $\partial: H^0(\mathcal{F}^{(\top)}) \to H^1_t(\mathcal{F}^{(t)})$ produces an obstruction class — the contradiction has a cohomological address; persistent $\top$-cells are obstructions to settling. **This is the formal basis for "queue a review workitem after N consecutive ticks":** persistent obstructions need adjudication; transient ones may resolve under further closure firings.

### Design constraints from this grounding

- **Don't raise exceptions on $\top$ detection.** The cell is the record; raising would push the failure out-of-band, defeating the discipline.
- **The witness's `details` must include both rule-firings that produced the conflicting consequents.** Without those, the captain reading the witness can't reconstruct what disagreed.
  Use the `RuleFiring` records the closure runner already captures; the conflicting pair is the two firings whose consequents knowledge-joined to $\top$.
- **Persistence threshold is configurable per-deployment, not hardcoded.** A polity in research mode might tolerate longer-lived $\top$-cells before queueing review (the contradiction is interesting, not urgent); an operational polity might queue at the first persistent tick.
  Default 1 (any $\top$ surviving one tick triggers review) is conservative; expose `EngineState.anomaly_review_threshold` so polities can tune it.
- **The review workitem itself is an ordinary `type: workitem, kind: review` record.** It dispatches through the same graph that handles every other workitem; an `anomaly-review` capability and a registered agent that holds it close the loop.
  No special-case handling.
- **Selection axes already refuse $\top$** (`_is_disqualified_on_any_axis` treats `BilatticeValue.
  TOP` like `F`).
  Document this in the dispatch graph code's docstring so future developers don't accidentally remove it thinking it's belt-and-braces.
  It is load-bearing.

## Acceptance

- [ ] When the closure runner produces a `⊤`-valued cell during dispatch, the dispatch graph emits an `anomaly_surfaced` witness with the cell's `(s, p, o)`, the rules whose consequents collided, and the active `rsv_hash`.
- [ ] A `type: workitem`, `kind: review`, `requires-capabilities: [anomaly-review]` substrate record is queued for the captain (or designated review agent) when an anomaly persists across N consecutive ticks (configurable; default 1).
- [ ] `select_winners_node` already refuses `⊤` cells on disqualification axes — verify and document this behavior.
- [ ] Tests cover: no contradictions (no anomaly witnesses), one transient contradiction (witness emitted, no review queued), persistent contradiction (witness emitted, review queued).
