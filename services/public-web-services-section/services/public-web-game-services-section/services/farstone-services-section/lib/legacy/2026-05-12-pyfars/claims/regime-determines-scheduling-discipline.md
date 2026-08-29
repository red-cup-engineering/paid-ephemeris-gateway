---
type: claim
status: sketch
depends-on: [closure-rule-record, classifying-regime, dispatch-closure-rule-system, replay-determinism]
---

# Regime determines scheduling discipline

**Claim.** A closure rule's [regime classification](../objects/closure-rule-record.md) — strict, scott-continuous, transfinite-bounded, or aperiodic — *determines* the scheduling discipline the closure-runner must apply for replay-determinism to hold.
Specifically: strict rules may fire eagerly during a single tick; scott-continuous rules must fire only at tick boundaries; transfinite-bounded rules must fire only at audit-export boundaries; aperiodic rules require explicit operator authorization per firing.

Conversely, the runner that schedules a rule outside its regime-mandated discipline is a [substrate-purity](substrate-purity.md) violation: scheduling a scott-continuous rule eagerly may produce different fixed points across tick interleavings, breaking the byte-equality guarantee of replay-determinism.

## Statement

For a closure-rule record $r$ with $\mathrm{regime}(r) = G \in \{\mathrm{strict}, \mathrm{sc}, \mathrm{tb}, \mathrm{ap}\}$ and a scheduling discipline $D$:

$$\mathrm{replay\text{-}deterministic}(r, D) \;\iff\; D \in \mathrm{compatible}(G)$$

where:

| Regime | Compatible disciplines |
|---|---|
| strict | tick-eager, tick-boundary, audit-export |
| scott-continuous | tick-boundary, audit-export |
| transfinite-bounded | audit-export only |
| aperiodic | per-firing-operator-authorized only |

A more-conservative discipline is always compatible with a less-conservative regime; the reverse fails.

## Sketch

The proof factors regime by regime:

### Strict regime ↔ tick-eager compatible

A strict rule's closure converges in $O(|\text{antecedent data}|)$ steps with the bound expressible in the data.
Multiple tick-eager firings within one tick converge to the same fixed point regardless of firing order (because the rule is monotone over $\leq_k$ and the lattice is bounded).
Tick-boundary scheduling is trivially compatible (a tick-eager fixed point is also reached at the boundary). ✓

### Scott-continuous ↔ tick-boundary compatible

A scott-continuous rule's closure may require unbounded-but-countable iteration; the fixed point exists by Knaster–Tarski but its *intermediate* states differ across iteration orders.
Two tick-eager schedules that interleave a scott-continuous rule with strict rules produce different intermediate cells (some strict-rule firings see the scott-continuous rule's pre-fixpoint state vs. the fixpoint state).
Tick-boundary scheduling forces all rules to see the same tick-start state, recovering byte-equality.

[gap: requires a formal proof that scott-continuous fixed-point computation in `pypredcalc.
PredicationStore.close()` is deterministic at tick-boundary even when `close()` itself iterates within.
The current implementation appears to satisfy this but has not been formally verified.]

### Transfinite-bounded ↔ audit-export only

A transfinite-bounded rule's closure may require ordinal iteration up to an explicit bound carried in the substrate.
Such rules are too expensive for per-tick execution (the bound dominates dispatch cost) and provide no operational value at tick cadence — their consequents are typically audit-relevant cells that need not exist between audit-export windows.
Restricting them to audit-export is both performance-mandated and semantics-mandated. ✓

### Aperiodic ↔ per-firing-operator-authorized only

An aperiodic rule may produce orbits of period $> 1$; the closure-runner has no termination proof.
Allowing such rules to fire under any standard discipline risks non-termination of the closure pass, which breaks replay-determinism (a non-terminating replay produces no state to compare).

The substrate's discipline: an aperiodic rule may fire only when an operator (a personnel slug with the corresponding `authorizes-aperiodic` capability) is named in the rule's record AND a witness for that operator is present in the current tick.
Without such a witness, the rule does not fire; the runner records `(rule, aperiodic-firing-blocked, missing-operator) = t` on `guard`.

This discipline turns aperiodic rules into a substrate-resident hatch: they exist (the substrate doesn't refuse them outright) but they require explicit, witnessed authorization per firing, recorded as substrate cells.
Replay-determinism holds conditionally on those witnesses being present in the replay log. ✓

$\square$ (modulo gaps)

## Discussion

This claim is what makes [`closure-rule-record`](../objects/closure-rule-record.md)'s `regime` field operationally load-bearing rather than documentation.
The runner doesn't merely *report* a rule's regime; it *uses* the regime to decide when the rule may fire, refusing schedules that would violate replay-determinism.

The four-row table above is the substrate's *scheduling-discipline lattice*.
A polity's dispatch-closure-rule-system can carry rules across all four regimes; the runner's job is to fire each in its regime-compatible window.
The result is a single replay-deterministic substrate even though individual rules differ in their algebraic strength.

This claim is also load-bearing for federation: two peers must agree on the regime of every shared closure rule for cross-peer replay-determinism.
A regime drift between peers (one peer's `regime: strict` is the other peer's `regime: scott-continuous` for the "same" rule) is a federation-merge contradiction surfaced as $\top$ on the rule's regime cell.

## What this claim does not say

- It does not say the *content* of a rule's fixed point is the same across disciplines — it says replay-determinism (byte-equality across runs) is preserved when the discipline is regime-compatible.
  A scott-continuous rule fired at audit-export only produces a different *substrate evolution* than the same rule fired at tick-boundary, but each evolution is internally replay-deterministic.
- It does not say the [`classifying-regime`](../morphisms/classifying-regime.md) classifier is *complete*: the classifier may conservatively assign a rule to a more-restrictive regime than necessary.
  Conservative misclassification reduces firing opportunity but does not break replay-determinism.

## Realization status

`sketch` because the proof's scott-continuous case depends on `pypredcalc`'s closure implementation being formally verified for tick-boundary determinism.
Empirical M3 conformance vectors check the property; formal verification is open work for [M11](../work/milestones/m11-assurance-audit-chain-export.md).
