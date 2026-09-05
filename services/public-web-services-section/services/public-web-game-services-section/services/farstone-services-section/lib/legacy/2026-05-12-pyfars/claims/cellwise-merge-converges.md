---
type: claim
status: sketch
depends-on: [admitting-federation-envelope, federation-envelope-record, peer-record, replay-determinism, dispatch-closure-rule-system]
---

# Cellwise merge converges

**Claim.** When two PyFARS instances exchange [federation envelopes](../objects/federation-envelope-record.md) repeatedly per the [federation-cycle](../work/recurrent-practices/federation-cycle.md) pipeline (cellwise $\vee_k$ merge on the Belnap-Fitting FOUR), the local substrate's cells in the shared scope converge to a *unique* fixed point that is independent of message-delivery ordering.
Equivalently: federation by cellwise $\vee_k$ is a strongly eventually consistent (SEC) merge under arbitrary delivery interleavings, with conflict surfaced as $\top$ rather than silently resolved.

This claim is what makes federation by value-domain join *correct* rather than merely convenient.
Without convergence, federation reduces to last-write-wins (which violates substrate-purity and discards minority information); with convergence, federation reduces to the substrate's bilattice algebra, which is the algebra-as-protocol commitment.

## Statement

For two PyFARS instances $I_1, I_2$ sharing scope $\Sigma$, with cells $C^{I_1}_\Sigma$ and $C^{I_2}_\Sigma$ at time $\tau_0$, and with [federation-envelope](../objects/federation-envelope-record.md) exchanges occurring at arbitrary times $\tau_1 < \tau_2 < \ldots$ in any order:

$$\lim_{n \to \infty} C^{I_1}_\Sigma(\tau_n) \;=\; \lim_{n \to \infty} C^{I_2}_\Sigma(\tau_n) \;=\; \bigvee_k \{C^{I_1}_\Sigma(\tau_0),\, C^{I_2}_\Sigma(\tau_0)\}$$

— the limit on each side is the cellwise $\vee_k$-join of the initial states, and the two limits are equal.
Convergence holds for any delivery ordering, any interleaving, and any number of envelopes per cycle (provided the cycle eventually exchanges every cell that has changed).

## Sketch

The proof routes through three properties of $\vee_k$ on FOUR:

### (1) $\vee_k$ is associative, commutative, idempotent

Direct from the bilattice's knowledge-order being a join semilattice.
Verifiable by enumeration on the 4-element bilattice. ✓

### (2) Per-cell merge is monotone in $\leq_k$

For any cell $(s, p, o)$ with values $v_1, v_2, v_3$ and $v_2 \leq_k v_3$:

$$v_1 \vee_k v_2 \;\leq_k\; v_1 \vee_k v_3$$

Direct from $\vee_k$'s definition as the knowledge-order join. ✓

### (3) Order-independence of merge

Given properties (1) and (2), and noting that envelope exchanges produce cells already in $C^{I_j}_\Sigma$ for some $j$, every $I_i$'s state at any $\tau_n$ is a $\vee_k$-fold of some subset of $\bigcup_j C^{I_j}_\Sigma(\tau_0)$ plus subsequent cells produced by either instance.
By associativity and commutativity, the order in which cells are merged does not affect the final result; by idempotence, repeated merge of the same cell is harmless.

In the limit, every cell that exists in either instance's history at $\tau_0$ has been merged into both instances.
Per (1), the result on each side is the $\vee_k$-fold over all cells.
Per (2), this fold is the unique upper bound in $\leq_k$.

[gap: requires a reachability proof that the federation cycle eventually exchanges every cell in the shared scope.
Under arbitrary delivery ordering, cells from offline-then-online peers may take many cycles to propagate; the eventual-exchange condition is non-trivial in adversarial network conditions.
The claim is conditional on cycle-eventual-fairness — the captain authoring `(peer, fairness-policy, eventual-fairness) = t` cells is a load-bearing precondition.]

This routes through the upstream [flatfile-federation-equivalence](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/) theorem (which proves that the bilattice-network-sheaf consensus on flatfiles is equivalent to cellwise $\vee_k$); the substrate-side claim here specializes that proof to the specific envelope/cycle pipeline. ✓

$\square$ (modulo eventual-exchange precondition)

## Discussion

The convergence claim holds *unconditionally* on $\vee_k$'s algebraic properties — those are bilattice-theoretic.
The conditional aspect is the *eventual-exchange* precondition: the federation cycle must eventually ship every cell that has changed, in both directions.
Under network partitions, partition-healing must be eventually-fair (no peer is starved indefinitely).

The eventual-exchange precondition is operationally enforced by the federation cycle's per-peer cadence: every peer's cadence boundary is reached eventually (per the cycle's strict regime), at which point the cycle fires and ships divergent cells.
Pathological cases (a peer's cadence is set to `2026-12-31` and never fires before then) are substrate-visible — the captain may inspect peer cadence cells and detect them.

Beyond mere convergence, the $\vee_k$ discipline preserves *minority information*: a cell asserted by only one peer at $\mathbf{t}$ propagates to the other peer (because $\bot \vee_k \mathbf{t} = \mathbf{t}$); a cell asserted contradictorily ($\mathbf{t}$ at one peer, $\mathbf{f}$ at the other) becomes $\top$ on both sides, surfaced as an anomaly.
Last-write-wins discards minority information; cellwise $\vee_k$ preserves it as $\top$ pending adjudication.

## What this claim does not say

- It does not say convergence is *fast*.
  The convergence rate depends on the federation graph's algebraic connectivity ($\lambda_2$ of the graph Laplacian); see the [federation-resilience question](../questions/federation-resilience-and-degradation.md) for the spectral-gap discipline.
  The claim is asymptotic.
- It does not say convergence holds for *coordination*-federation (multi-writer contended cells with quorum requirements).
  Cellwise $\vee_k$ converges for content; coordination-federation requires additional discipline (M6' scope).
- It does not say $\top$-cells are *resolved* by federation.
  They are *surfaced*.
  Resolution is captain-authored or reputation-weighted, not cellwise-mergeable.

## Realization status

`sketch` because the eventual-exchange precondition's substrate-side enforcement is open work.
Convergence holds *unconditionally* on the algebra; the precondition is operational.
M6's federation cycle satisfies the precondition under normal cadence; partition-healing discipline is open for M6's post-landing phase.

The claim is the substrate-side projection of the upstream flatfile-federation-equivalence theorem; deeper proof is in the predicated-computing theory layer.
