---
type: definition
class: closure-rule
status: draft
realizes: [scheduling-policy, dispatch-closure-rule-system]
depends-on: [dispatch-closure-rule-system, work-record, work-status, assignment-cell]
---

# Capacity gate

A closure rule in the dispatch-closure-rule-system: an office is *only assignable* if its current load (count of in-progress assignment cells naming it) leaves headroom for the new work.
Acts as a back-pressure mechanism that prevents over-allocating any single office.

## Rule statement

For an office $O$ with capacity limit $L$ (declared as `capacity:` in $O$'s frontmatter or inherited from a default) and current load $\ell(O, \tau)$ at time $\tau$:

$$\ell(O, \tau) < L \;\Longrightarrow\; (O, \texttt{capacity-available}, \mathbf{t}) = \mathbf{t}$$

Conversely:

$$\ell(O, \tau) \geq L \;\Longrightarrow\; (O, \texttt{capacity-available}, \mathbf{t}) = \mathbf{f}$$

Where $\ell(O, \tau)$ is the count of work-records $W$ with assignment cells `(W, assigned-to, O) = t` and status `assigned` or `in-progress` at time $\tau$.

## Antecedent cells

The rule reads: - `(O, capacity, L)` — the office's capacity limit.
Defaults apply when unspecified. - `(W_i, assigned-to, O) = t` and `(W_i, status, assigned|in-progress)` cells for each currently-assigned work-record $W_i$.

These produce $\ell(O, \tau)$ via counting.
Counting is a degenerate closure operation (an aggregator).

## Consequent cells

The rule produces `(O, capacity-available, t)` or `(O, capacity-available, f)`.
Total dispatch eligibility includes this as a conjunct: a $\mathbf{f}$ value disqualifies the office from new assignment until load decreases.

## Composition

Capacity-gate composes with eligibility axes:

$$\mathrm{dispatch\text{-}fire}(W, O) \;\propto\; \mathrm{eligible}(W, O) \;\wedge\; \mathrm{capacity\text{-}available}(O)$$

A capacity-saturated office is excluded from dispatch even if it's the only eligible option; the work-record waits in the queue until capacity opens.
This is the back-pressure: without it, a single capable office could be over-saturated, and other less-capable but available offices would never be considered.

## Default capacity

PyFARS-the-package commits to a default capacity for offices that don't declare one — typically a small number (e.g., `default-capacity: 3`).
The default is itself a system cell (declared in pyfars-the-package's governance) so polities can override.

## What this rule does not handle

- *Variable cost work*: the rule counts work-records, not their *weight*.
  Heavy work-records (long-running, high-resource) count the same as light ones.
  A polity that wants weighted capacity can extend with a `weight:` cell on work-records and a weighted-sum aggregator.
- *Per-skill capacity*: an office may have capacity 3 for total work but capacity 1 for "writing" work specifically.
  The rule as stated is a single dimension; multi-dimensional capacity needs additional rules.
- *Burst capacity*: temporarily exceeding capacity for an emergency.
  A polity may declare a `burst-capacity:` field; a separate rule allows over-load for high-priority work-records under named conditions.

## Open structural questions

- The discipline for capacity defaults across office types.
  Different offices have different intrinsic throughput; one default for all is crude.
- The interaction with personnel vs. office capacity.
  An office's capacity may be constrained by its incumbent's capacity (a personnel can only do so much).
  Whether to model dual capacities is partly settled.
- The handling of capacity changes during execution.
  If an office's capacity is reduced mid-cycle (e.g., the incumbent goes on watch), do already-assigned in-progress work continue, or get re-dispatched?
  Currently the former; the discipline is partly settled.
