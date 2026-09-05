---
type: morphism
class: work-cycle-spoke
status: draft
depends-on: [work-record, work-status, witness, assignment-cell, witness-as-increment]
realizes: [witness-as-increment]
---

# Witness completion

The morphism that records the closing of an executed [work-record](../concepts/work-record.md): produces the settling-witness in the JSONL log, transitions the record's `status` to `settled` (or `failed`/`abandoned` for non-success outcomes), and decrements the assignee's capacity counter.
The fifth spoke of the work cycle.

Realizes the upstream [witness-as-increment](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/witness-as-increment.md) at the work-record-completion scope.

## Action

For an in-progress work-record $W$ being closed by its assignee $A$:

$$\mathrm{witness\text{-}completion}(W, A, \text{outcome}) \;\longrightarrow\; \text{Witness}(W \to \text{settled}|\text{failed}|\text{abandoned})$$

The morphism produces: - A witness event in the JSONL log naming the outcome. - A status-transition cell `(W, status, settled|failed|abandoned) = t`. - For successful settling: a settling-cell `(W, settling-cell, t) = t` indicating the work's primary settling target was reached. - For failure or abandonment: a description-cell explaining what didn't settle. - A capacity decrement on $A$ (the assignment's load is removed).

## Composition

Witness-completion composes after execute and before review:

$$\mathrm{execute} \to \mathrm{witness\text{-}completion} \to \mathrm{review}$$

The morphism is also the *boundary* of one work cycle for a record.
After witness-completion, the record's main lifecycle is complete; review may produce findings that spawn new work, but those are *new* work-records.

## What this morphism commits to

1. **Settles cleanly or fails explicitly**.
  Every executed work-record reaches witness-completion with one of the recognized outcomes.
  A work-record left in `in-progress` indefinitely is a substrate-finding (an audit will surface it).
2. **Substrate-purity**: the completion's witness is the *only* system effect.
  The morphism does not modify the system beyond what the witness's cells declare.
3. **Capacity restoration**: the assignee's capacity is restored.
  If capacity is not restored, the actor's load grows monotonically across work cycles, eventually blocking new dispatches.
4. **Audit traceability**: the witness includes the work-record's slug, the assignee, the outcome, and a rationale (especially for failures and abandonments).
  The captain or auditor reading the log can reconstruct what happened.

## What this morphism does not do

- It does not judge the work's quality.
  That's review.
- It does not re-execute the work if completion failed.
  That's a fresh dispatch (status → ready, then dispatch-decision again, possibly with re-planning first).
- It does not produce all the witnesses execution generated.
  Execute produces its own witnesses (intermediate observations, sub-step completions); witness-completion is specifically the *closing* witness.

## Implementation pointer

The current `track.py` and parts of `feedback.py` realize aspects of this.
The refactor consolidates the closing-witness production into a single morphism that the closure rules apply when the actor reports completion.

## Open structural questions

- The discipline for *partial* completion.
  A work-record that was decomposed into sub-records is settled when all sub-records are settled; the parent's completion fires automatically via closure rules.
  The discipline is partly settled.
- The handling of completion claims that turn out to be wrong (a witness asserts completion but later evidence shows the work wasn't actually done).
  The system's bilattice machinery surfaces the contradiction as $\top$; adjudication is a separate process.
- The interaction with audit-officer-style verification.
  Some work requires verification by another office; the verification itself produces witnesses that close-or-reopen the original.
  The discipline is partly polity-policy.
