---
type: question
status: open
explores: [graph-laplacian, algebraic-connectivity, w-msr-byzantine-filter, event-triggered-synchronization, failure-detection-as-bilattice-modal-suspicion, consistent-hashing-minimal-movement, federated-learning-fedavg, graceful-degradation, m6-federation, m3-continuous-loop]
---

# How does PyFARS realize federation as substrate-resident discipline — convergence rate, Byzantine resilience, bandwidth-aware sync, failure detection, sharding rebalance, distillation, and graceful degradation?

[M6](../work/milestones/m6-federation.md)'s cellwise $\vee_k$ merge over Belnap–Fitting `FOUR` is the value-domain fiber of federation.
Operational federation needs additional disciplines that the drone-swarm and distributed-coordination-platform literature already specify rigorously.
Each of the following is a substrate-resident closure rule, not a runtime hack — and they compose: spectral gap governs convergence rate; W-MSR filters Byzantine peers before merge; event-triggered sync replaces periodic shipping; failure-detection surfaces peer liveness as bilattice-modal cells; consistent-hashing handles instance churn; FedAvg-style distillation reduces bandwidth and preserves locality; graceful-degradation gives the substrate defined floor states.

The CRDT-convergence theorem in [`crdt-convergence`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/crdt-convergence.md) proves *that* PyFARS converges in a fully-connected message-delivery model under the standard CRDT hypotheses.
The disciplines below tell you *how fast*, *under what adversarial conditions*, *with what bandwidth*, *to what defined floor when failure intrudes*.

---

## Algebraic connectivity as convergence-rate metric

For a connected undirected federation graph $G = (V, E)$ with adjacency matrix $A$, degree matrix $D$, and Laplacian $L = D - A$, the standard average-consensus dynamics $\dot{x} = -Lx$ with disagreement vector $y = (I - J)x$ (where $J = \tfrac{1}{n}\mathbf{1}\mathbf{1}^\top$) admits the Lyapunov function $V = \tfrac{1}{2}\|y\|_2^2$.
Differentiating along trajectories:

$$\dot V = -y^\top L y \leq -\lambda_2(L)\|y\|_2^2 = -2\lambda_2(L) V$$

yielding the closed-form rate bound

$$\|y(t)\|_2 \leq e^{-\lambda_2(L) t}\|y(0)\|_2.$$

The spectral gap $\lambda_2(L)$ is the second-smallest eigenvalue of $L$ (the smallest is always $0$ with eigenvector $\mathbf{1}$).
It governs:

- **Convergence speed.** Larger $\lambda_2$ means faster exponential decay of disagreement.
- **Robustness margin.** Fiedler's inequality $\lambda_2(L) \leq \kappa(G)$ bounds vertex connectivity; $\lambda_2$ also bounds edge-removal tolerance before disconnection.
- **Synchronization stability.** For switching graphs, the time-averaged $\lambda_2$ over the switching schedule replaces the static value.

For randomized gossip the same intuition appears via the second-largest eigenvalue of the averaging operator $W$ (Boyd, Ghosh, Prabhakar, Shah 2006).

Topology comparisons relevant to PyFARS:

- **Complete graph on $n$ vertices:** $\lambda_2 = n$ (fast, but bandwidth-expensive).
- **Star topology around one peer:** small $\lambda_2$ — slow convergence, single point of bottleneck.
- **Ring on $n$ vertices:** $\lambda_2 = 2(1 - \cos(2\pi/n))$ — $O(1/n^2)$ for large $n$, painfully slow at scale.
- **Captain's two-peer cold-red-gate ↔ bare-cedar-fog setup:** complete graph on 2, $\lambda_2 = 2$, convergence rate $e^{-2t}$.

The federation graph's adjacency is implicit in the routing rules between peers per [`cluster-record`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/objects/cluster-record.md); PyFARS can derive $L$ from substrate cells, compute $\lambda_2$, and surface it as an observable.

A new substrate object kind, `federation-spectral-gap`, at `governance/clusters/<id>--spectral.md`:

```yaml
type: federation-spectral-gap
cluster: <cluster-id>
algebraic-connectivity: 2.0       # λ₂(L)
convergence-rate-bound: 0.135     # e^{-λ₂} per unit time
disagreement-half-life: 0.347     # ln(2)/λ₂
fiedler-vector: [0.707, -0.707]   # eigenvector of λ₂; identifies natural cluster bipartitions
edge-criticality: {edge_1: 0.5, edge_2: 0.5}  # per-edge contribution to λ₂
```

A closure rule, `compute-spectral-gap`, fires when the cluster's adjacency cells change (peer added/removed, route added).
Eigenvalue computation is $O(|V|^3)$ via standard linear algebra; for single-digit peer counts, negligible.
The Fiedler vector's sign-partition gives the natural bipartition — the way the graph wants to split if forced; this is a substrate-detectable warning of imminent partition.
Edge-criticality (per-edge contribution to $\lambda_2$) identifies which inter-peer routes are most load-bearing for convergence — combined with failure-detection below, a high-criticality edge that becomes intermittent is a leading indicator.

Substrate consequences: **federation envelope cadence is bounded below by the disagreement half-life** ($\ln 2 / \lambda_2$): shipping faster wastes bandwidth (substrate disagreement hasn't accumulated); shipping slower lets disagreement persist. **Topology-aware peer admission** — the runtime computes post-admission $\lambda_2$ before accepting a peer; admissions that drop $\lambda_2$ below an operator-set threshold are flagged.

---

## W-MSR Byzantine filtering at the merge boundary

The cellwise $\vee_k$ merge accumulates the strongest evidence in $\leq_k$ direction — *monotone-only*.
A Byzantine peer asserting `(W, completed-by, malicious-D) = T` survives the merge as $T$, contaminating the fixpoint.
CRDT convergence still happens, but to a *contaminated* fixpoint.

The standard counter-measure (LeBlanc, Zhang, Sundaram, Koutsoukos 2013, *Resilient Asymptotic Consensus in Robust Networks*; cited in the cyber-resilience text): **W-MSR filtering** — Weighted Mean Subsequence Reduced.

> Each agent receives values from its neighbors, sorts them, and removes the F largest and F smallest values before calculating its local update.
> This mathematically ensures that up to F malicious or corrupted agents cannot influence the collective state.

Convergence requires the **graph robustness condition**: the communication graph must be $(2F+1)$-robust — every pair of disjoint vertex subsets has at least one vertex with $2F+1$ neighbors outside its subset.
Under this condition, W-MSR-filtered consensus converges within the convex hull of honest peers' inputs, regardless of the F Byzantine peers' contributed values.

The cohomological framing on the math side is exactly [`byzantine-cluster-as-finer-replica-cover`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/byzantine-cluster-as-finer-replica-cover.md): treating a Byzantine-tolerant cluster as a *finer* replica cover of the same underlying sheaf, with the larger-quorum discipline as the cover-refinement operation.

PyFARS realizes W-MSR-filtered merge by inserting before the cellwise $\vee_k$ at [`runtime/federation.py`](../src/pyfars/runtime/federation.py):

1. **Per-cell evidence collection.** For each cell $(s, p, o)$ that multiple peers have asserted, collect per-peer values $\{v_1, v_2, \ldots, v_n\}$ where $v_i \in \mathbf{FOUR} = \{\bot, \mathbf{f}, \mathbf{t}, \top\}$.
2. **Drop F-extreme values.** $\mathbf{FOUR}$ is partial-ordered, not total — "sort and drop F highest/F lowest" requires a total ordering choice, typically the truth-order embedding $\bot < \mathbf{f}, \mathbf{t} < \top$ for filtering, with ties broken by the writing-peer's reputation cell.
3. **Aggregate the surviving values.** Bilattice $\vee_k$-merge applies to the surviving $n - 2F$ values; result is $\geq_k$-bounded by the surviving values — Byzantine peers cannot dominate.

Graph-robustness becomes a substrate-checked precondition.
Before merging an envelope, the runtime verifies the cluster graph is $(2F+1)$-robust for the operator-set $F$.
If not, the envelope is queued with `merge-blocked-by-robustness-deficit` annotation and the operator is alerted.

A new substrate object kind, `byzantine-tolerance-record`, at `governance/clusters/<id>--byzantine.md`:

```yaml
type: byzantine-tolerance-record
cluster: <cluster-id>
tolerance-parameter: 1            # F
graph-robustness: 3-robust        # required: 2F+1 = 3
filtering-applies-to: [observation-cells, instinct-cells, completion-cells]
filtering-exempts: [charter-amendments, captain-direct-writes]
peer-reputation-source: governance/peers/<slug>.md::reputation
```

The exemption list is structurally important: hard-core charter amendments (per [`amend-hard-core`](../governance/decisions/)) MUST NOT be Byzantine-filtered — the captain's direct contribution would be filtered as an outlier in a 3-peer cluster where the captain is the minority.
Charter amendments use a different tolerance discipline — quorum-consensus per [`quorum-consensus`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/concepts/quorum-consensus.md) — not W-MSR.

W-MSR is consensus-resilience, **not detection**: a Byzantine peer survives the filter if it stays within the sorted middle; it doesn't get caught, just out-voted.
Detection requires either an audit-witness honesty check (per the [cohomological-coordination question](cohomological-coordination-and-audit.md)'s Čech-cocycle approach) or out-of-band cryptographic identity per the cyber-resilience text's Zero-Trust recommendation.
Honest framing for [M6](../work/milestones/m6-federation.md): W-MSR provides resilience for routine merges; detection is a separate concern.

---

## Event-triggered synchronization

The naïve federation model is *periodic*: peers ship envelopes at fixed cadence (every tick, every N seconds).
Failure modes:

- **Bandwidth waste under quiescence.** When peers haven't diverged, periodic envelopes ship empty content.
  Per the spectral-gap analysis above, shipping faster than $\ln 2 / \lambda_2(L)$ is bandwidth waste.
- **Convergence stall under partition or congestion.** When the network is degraded, periodic shipping continues to attempt envelopes that fail; back-pressure builds; the runtime needs ad-hoc back-off logic the substrate doesn't natively express.

The drone-swarm literature ([`autonomous-agents-drone-swarms-standalone-report-may-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/autonomous-agents-drone-swarms-standalone-report-may-2026.md), [`cyber-resilience-frameowkr-for-decentralized-multi-agent-drone-swarms`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/cyber-resilience-frameowkr-for-decentralized-multi-agent-drone-swarms.md)) prescribes **event-triggered synchronization**:

> By only exchanging state information when specific trigger conditions are met, the swarm preserves bandwidth and maintains collective objectives even across lossy links or during periods of spectrum denial.

The standard formulation (Tabuada 2007; Heemels–Johansson–Tabuada 2012): a Lyapunov-style trigger condition

$$\|\hat{x}_i(t) - x_i(t)\|_2 \geq \sigma \|x_i(t)\|_2$$

fires an envelope ship when drift between locally-known state $x_i(t)$ and last-shipped state $\hat{x}_i(t)$ exceeds a fraction $\sigma \in (0, 1)$ of the state's magnitude.
The trigger guarantees error stays $\sigma$-bounded between events; envelopes ship *exactly when needed*.

PyFARS analogue: ship when divergence between current substrate-cell-set and last-shipped substrate-cell-set exceeds a fraction of the substrate's information-content magnitude.
The right divergence measure is bilattice-native — cellwise $\leq_k$-distance:

$$d_k(X, Y) = \sum_{(s, p, o)} \delta_k(X(s, p, o), Y(s, p, o))$$

where $\delta_k$ is the bilattice-edit-distance — number of $\leq_k$-strict steps between the two cells.
The sum is finite when only finitely many cells differ.
The trigger condition $d_k(X_{\text{now}}, X_{\text{last-shipped}}) \geq \sigma \cdot \|X_{\text{last-shipped}}\|_k$ is the PyFARS analogue of the drone literature's $\sigma$-trigger.

A new substrate object kind, `federation-trigger`:

```yaml
type: federation-trigger
peer-edge: <local>--<remote>
trigger-mode: event-triggered    # vs periodic
divergence-measure: cellwise-leq-k-distance
trigger-threshold: 0.1            # σ
divergence-bound-on-last-ship: 0.0  # ‖cells_now - cells_shipped‖
maximum-quiescent-interval: 3600  # seconds — heartbeat fallback
```

A closure rule, `federation-trigger-eval`, fires every tick:

1. Compute divergence between current substrate-cell-state and last-shipped state per peer-edge.
2. If divergence exceeds threshold, queue an envelope.
3. If the maximum-quiescent-interval has elapsed without an envelope, queue a heartbeat envelope (substrate-non-empty assertion to confirm liveness).
4. Update the divergence-bound cell.

**Why this is structurally correct, not just an optimization.** The closure-merge commutation lemma per [`crdt-convergence`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/crdt-convergence.md) — $\mathrm{cl}_p(\mathrm{cl}_p(X) \vee_k Y) = \mathrm{cl}_p(X \vee_k Y)$ — says merging is order-independent up to closure.
Delaying a merge does not affect the final substrate state; it only affects when intermediate peers see updates.
The convergence theorem applies whether envelopes ship every tick or every $T$ ticks; $\lambda_2(L)$ governs the rate when convergence does happen.
Event-triggered sync is a *strictly more efficient implementation* of the same guarantee.

The Lyapunov trigger is also **inherently back-pressure-aware**: when the network is lossy, retries fail and divergence accumulates; the trigger keeps queuing envelopes (divergence keeps growing); the runtime can hold them without violating any convergence claim.
Once the network recovers, queued envelopes ship, divergence collapses to $\leq \sigma$ within one round-trip, the substrate re-converges. **No special back-pressure logic is needed; the trigger condition IS the back-pressure mechanism.**

---

## Failure detection as bilattice-modal suspicion

Per the DCP theorem [`failure-detection-as-bilattice-modal-suspicion`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/failure-detection-as-bilattice-modal-suspicion.md), failure detection is **not a separate engineering layer** atop the coordination protocols; it IS the substrate's existing modal apparatus — $\Box_R / \Diamond_R$ on the bilattice accessibility relation — specialized to a heartbeat-arrival sub-region $R_{\mathrm{hb}}$.

Form the **observation-window world set** $W = T \times M$, where $T$ is a discrete sequence of recent observation windows and $M = \{m_1, \ldots, m_N\}$ is the member set.
The **heartbeat accessibility relation** $R_{\mathrm{hb}} : W \times W \to \mathbf{L}^\bowtie$:

$$R_{\mathrm{hb}}((t_1, m), (t_2, m)) := \begin{cases} \mathbf{t} & \text{if a heartbeat from } m \text{ arrived in window } [t_1, t_2] \\ \bot & \text{if no heartbeat is recorded yet on window } [t_1, t_2] \\ \mathbf{f} & \text{if window has elapsed past the substrate-policy threshold without arrival} \end{cases}$$

Off-diagonal $(m \neq m')$ entries are $\bot$ (a heartbeat from $m$ does not give evidence about $m'$).
The relation is $\leq_k$-monotone in the knowledge order: later windows accumulate more evidence about earlier intervals, never less.

**Four-state correspondence.** For every observer $o$ and member $m$, the substrate-recorded suspicion level for $(o, m)$ at window $t$ is the value, in $\mathbf{FOUR}$, of the per-cell predication $\langle\, \Box_{R_{\mathrm{hb}}}(\mathrm{alive})(t, m),\; \Diamond_{R_{\mathrm{hb}}}(\neg\mathrm{alive})(t, m) \,\rangle \in \mathbf{2}^\bowtie \cong \mathbf{FOUR}$:

| Substrate level         | Twist coords           | $\mathbf{FOUR}$ value | Reading                                                  |
|-------------------------|------------------------|-----------------------|----------------------------------------------------------|
| `confirmed-alive`       | $\langle 1, 0 \rangle$ | $\mathbf{t}$          | $\Box_{R_{\mathrm{hb}}}\mathrm{alive}$, no negative evidence |
| `recently-heard-from`   | $\langle 0, 0 \rangle$ | $\bot$                | neither $\Box$ nor $\Diamond_{\neg}$ active yet          |
| `suspected`             | $\langle 0, 1 \rangle$ | $\mathbf{f}$ (modal)  | $\Diamond_{R_{\mathrm{hb}}}\neg\mathrm{alive}$ has fired |
| `confirmed-failed`      | $\langle 1, 1 \rangle$ | $\top$ as `dead`      | $\Box_{R_{\mathrm{hb}}}\neg\mathrm{alive}$, all windows agree |

The substrate's suspicion-level transition graph is exactly the $\leq_k$-Hasse diagram of $\mathbf{FOUR}$ restricted to closure-driven monotone moves.
Per [`closure-driven-settling-monotonicity`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-driven-settling-monotonicity.md), the substrate cannot transition `suspected` → `recently-heard-from` (a $\leq_k$-decrease); the corpus-level theorem rules this out, not a separate failure-detection invariant.

**Chandra–Toueg classes as bilattice-homomorphism projections.** The four classical Chandra–Toueg failure-detector classes (P, S, $\Diamond$P, $\Diamond$S) factor as four bilattice-homomorphism projections of the cluster's inconsistency sheaf $\mathcal{F}_U^{(\top)}$:

| Class                                  | Projection                                                                                  |
|----------------------------------------|---------------------------------------------------------------------------------------------|
| **P** (perfect)                        | $\pi^{\mathrm{P}} : \mathcal F_U \twoheadrightarrow \mathcal F_U^{(t)}$, all $\tau$         |
| **S** (strong)                         | $\pi^{\mathrm{S}}$ on a $\bigvee_k$-stable substack of $\mathcal F_U^{(t)}$                |
| **$\Diamond$P** (eventually perfect)   | $\pi^{\mathrm P} \circ \mathrm{colim}_\tau$                                                  |
| **$\Diamond$S** (eventually strong)    | $\pi^{\mathrm S} \circ \mathrm{colim}_\tau$                                                  |

Switching detector class is choosing one of four projections at the substrate-policy level — *not* re-implementing four detectors.

**Phi-accrual is quantale-graded $\Diamond_{R_{\mathrm{hb}}}$.** Equip $R_{\mathrm{hb}}$ with the Lawvere quantale $\mathcal{V} = ([0,\infty], +, \min)$ per [`cost-composition-via-lawvere-quantale`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/).
The phi-accrual score $\phi(o, m, t)$ is exactly the $\mathcal{V}$-graded $\Diamond_{R_{\mathrm{hb}}}\neg\mathrm{alive}$:

$$\phi(o, m, t) = \min_{w'}\bigl(R_{\mathrm{hb}}^{\mathcal{V}}(t, w') + (\neg\mathrm{alive})(w')\bigr)$$

up to the standard log-of-CDF rescaling making thresholds dimensionally comparable across heartbeat distributions.
Threshold-crossing rule (`recently-heard-from` → `suspected` when $\phi \geq \theta$) is the closure-rule firing whose antecedent reads the $\mathcal{V}$-grade against substrate-policy threshold $\theta$.

**Split-brain detection via cohomology.** If observers $o_1, o_2$ stably disagree about $m$'s liveness — $o_1$ records $\mathrm{alive}(o_1, m) = \mathbf{t}$ and $o_2$ records $\mathrm{alive}(o_2, m) = \mathbf{f}$ — the cellwise $\vee_k$ over observers produces $\top$ at $(*, m)$.
Per [`bilattice-network-sheaf-consensus`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/bilattice-network-sheaf-consensus.md), this contributes a non-zero section to the inconsistency sheaf $\mathcal{F}_U^{(\top)}$.
The audit operation reads $H^*(U, \mathcal{F}_U^{(\top)})$ directly — **same audit as every other substrate-content disagreement, no special code path**.

A new substrate object kind, `heartbeat-policy-record`:

```yaml
type: heartbeat-policy-record
peer-edge: <local>--<remote>
observation-window-count: 5                    # k recent windows
heartbeat-interval-target: 30s
suspicion-threshold-phi: 8.0                   # θ for phi-accrual
detector-class: P | S | DiamondP | DiamondS
quantale-grade: lawvere-cost-quantale
suspicion-confirmation-windows: 3
```

A closure rule, `evaluate-heartbeat-modality`, fires per tick: computes $R_{\mathrm{hb}}$, computes the modal pair $\langle \Box, \Diamond_{\neg}\rangle$, projects to substrate suspicion-level, computes $\phi$ if quantale-graded, fires threshold-crossing rules.

---

## Consistent-hashing minimal-movement for instance churn

Per the DCP theorem [`consistent-hashing-minimal-movement`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/consistent-hashing-minimal-movement.md), the practitioner's "$1/N$ of data moves" claim is **structural**, not probabilistic.

Setup: consistent-hashing configuration with $N$ substrate-instances at hash positions $p_1 < p_2 < \cdots < p_N$ on the ring $[0, M)$.
Arcs $A_i := (p_{i-1}, p_i]$ partition the ring; entity cover $\{E_i = h^{-1}(A_i) \to E\}_{i=1}^N$.
Per [`sharding-as-fibration-pullback-cover`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/sharding-as-fibration-pullback-cover.md), this lifts through the predication fibration to a Grothendieck-covering family on the substrate's scope.

The theorem's clauses:

1. **Addition.** Adding instance at $h^* \in A_k$ replaces $\{E_i\}_{i=1}^N$ by refinement $\{E_i'\}_{i=1}^{N+1}$.
  For $i \neq k$: $E_i' = E_i$ — *no entity moves*.
  For $i = k$: $E_k$ splits into $E_k' = h^{-1}((p_{k-1}, h^*])$ and $E_{N+1}' = h^{-1}((h^*, p_k])$, with $E_k = E_k' \sqcup E_{N+1}'$.

2. **Removal.** Removing $p_k$ replaces the cover by a coarsening.
  For $i \notin \{k, k+1\}$: $E_i' = E_i$.
  For $i = k+1$ (after re-indexing): $E_{k+1}' = E_k \sqcup E_{k+1}$.

3. **Sheaf-section invariance.** Under the predication-fibration hypothesis (which holds for PyFARS), per [`replica-mayer-vietoris`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/replica-mayer-vietoris.md), for every shard outside the change-set: $\mathcal{F}(\sigma_i') = \mathcal{F}(\sigma_i)$ — **preserved on the nose**.
  Every Čech 0-cocycle whose support is contained in unchanged arcs is preserved verbatim.
  Reduces via iterated 2-covers (each step's pairwise overlap is empty, so Mayer–Vietoris collapses to biproduct decomposition).

4. **Probabilistic corollary.** Under uniform hash + uniform anchor distribution: $\mathbb{E}[\mathrm{moved}] \approx |E|/N$.

Clauses 1–3 are load-bearing structural; clause 4 requires uniformity hypotheses.
The contrast with `hash mod N` sharding is also structural: every arc depends on *all* of $N$, so changing $N$ changes every arc.

**The on-the-nose section invariance is what gives uninterrupted reads on unaffected shards** — clients don't need to quiesce, drain, or coordinate with the migration.
The change is *invisible* to them.

A new substrate object kind, `sharding-cover-record`:

```yaml
type: sharding-cover-record
cluster-id: <id>
substrate-instances:
  - { instance-id: A, hash-position: 0x1A2B... , virtual-nodes: [...] }
  - { instance-id: B, hash-position: 0x3C4D... , virtual-nodes: [...] }
hash-discipline: cryptographic-hash-with-virtual-nodes
cell-routing-rule: route-cell-to-instance-by-hash
migration-discipline: minimum-movement-cover-refinement
```

A closure rule, `consistent-hash-cover-refinement`, fires on instance addition/removal:

1. Compute the new arc partition.
2. Identify change-arcs (one on addition, two on removal).
3. Queue cells in change-arcs for migration.
4. Emit `cover-refinement-witness` cell — substrate-content morphism the audit projector verifies.

The virtual-node discipline (per the theorem's setup) produces uniform anchor distribution: each instance gets multiple hash positions (typically ~256 per instance, the Cassandra/DynamoDB practitioner default), reducing variance in $|A_i|$ around its mean $|M|/N$.

The theorem's "What the theorem rules out" section names migration disciplines that lose the structural guarantee: - Re-shuffling content not in change-arcs (useless work; structural minimality automatic when faithfully implemented). - State-dependent shard-routing during migration (violates pullback-stability; cohomological invariance breaks). - Migration invisible to the witness chain (breaks audit projector's certification).

PyFARS is currently single-instance; the theorem becomes load-bearing when polities scale to multi-instance deployments. **Forward-pointed:** when sharding becomes necessary, this is the structurally-correct discipline; the cohomological reading (not the probabilistic one) is the load-bearing claim.

---

## FedAvg-style distillation: ship closure-outputs, not raw observations

The drone-swarm engineering literature names federated learning (FedAvg, McMahan et al. 2017) as the bandwidth-discipline for swarms:

> Drones share "learned lessons" (model updates) rather than raw sensor data, providing massive bandwidth advantages and preserving raw-data locality.

The FedAvg formulation:

$$w^{t+1} = \sum_i \frac{n_i}{\sum_j n_j} w_i^{t+1}$$

where $w_i^{t+1}$ is peer $i$'s locally-updated weights and $n_i$ its local-data weight.
Bandwidth scales with model-weight size, not local-dataset size.
Empirical reduction in communication rounds: 10×–100× compared to data-shipping baselines, comparable model quality.

PyFARS's current model ships cell deltas (raw observation cells).
Two failure modes:

1. **High-volume observation cells** — sensor-style closure rules generate observations at high rate; even with event-triggered shipping, federation bandwidth saturates.
2. **Privacy-sensitive cells** — federation across peers with different sensitivity levels (per the kinship-substrate question) violates locality.

The federated-learning analogue: ship **distilled rules** (closure-rule deltas) instead of raw observation cells.

**Why this works structurally.** The closure-merge commutation lemma:

$$\mathrm{cl}_p(\mathrm{cl}_p(X) \vee_k Y) = \mathrm{cl}_p(X \vee_k Y)$$

is the structural permission for the substitution.
If a peer applies $\mathrm{cl}_p$ to raw observations $X$ producing $\mathrm{cl}_p(X)$, and ships $\mathrm{cl}_p(X)$ instead of $X$, the receiving peer's merge yields the same result up to closure.
Concretely: if closure rules derive `(W, completed-by, A) = T` from observations `{(W, deadline, t_1) = T, (W, output-of, A) = T, ...}
`, ship the *derived* completion cell, not the underlying observations.
Same final state by commutation, no raw-data exposure.

A new substrate object kind, `federation-distillation-record`, per peer-edge:

```yaml
type: federation-distillation-record
peer-edge: <local>--<remote>
distillation-mode: closure-output-only | per-rule-classification | hybrid
raw-cell-classes:                          # MUST ship raw — value depends on originator's identity
  - charter-amendment
  - office-incumbency
  - audit-witness
distilled-cell-classes:                    # SHOULD distill — value is in consequence
  - sensor-observation
  - agent-private-context
  - high-volume-derivation
distillation-frequency: per-tick | per-N-ticks | event-triggered
local-data-preservation: full              # raw stays at peer
```

A closure rule, `federation-distill`, fires before envelope construction: 1.
Identify cells in to-ship delta.
2.
For raw cell-classes, ship as-is.
3.
For distilled cell-classes, run local closure-rule application; ship only closure outputs intersecting receiver's readable scope.
4.
Tag envelope with distillation provenance (which cells raw, which distilled, which closure-rule produced each).

Distillation is also entropy-reducing: closure outputs have lower per-step entropy than underlying observations (closure rules concentrate information).
Per the [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md)'s bounded-$H_\rho$ discipline, federation bandwidth and reproducibility-bound improvement come together.

Distillation only commutes if both peers have the *same* closure rules.
If a sender's rule is one the receiver doesn't have, the distilled output may be uninterpretable — a federation-distill-prerequisite check (closure rules match on the cell-class) should fire before distillation; on failure, fall back to raw shipment.

---

## Graceful-degradation as substrate-resident lifecycle policy

The cyber-resilience-framework text names a four-state graceful-degradation workflow that drone agents must adhere to:

> **State 1: Nominal (GNSS-Aided):** Full localization using the complete sensor fusion suite for high-precision mission execution. **State 2: GNSS-Denied (Map-Relative):** Immediate transition to feature-based navigation upon detection of GNSS signal corruption. **State 3: Vision-Inertial Odometry (VIO):** Reliance on onboard cameras and IMU when external maps are unavailable. **State 4: Emergency (Inertial Dead-Reckoning):** Final fallback using only motion sensors for controlled landing or "return-to-base" via ballistic trajectory.

The pattern: **explicitly enumerate degradation states; transition deterministically between them on detected condition; preserve mission-objective at each level even as capability drops**.
Substrate-resident failure handling — the system knows *exactly* where it is on the degradation ladder and what it can still do.

**Sensor-diversity discipline** underlies the workflow:

> The swarm must utilize a Robust Minimum Sensing Set... augmented by Vision-Inertial systems like VINS-Fusion.
> This diversity allows for real-time estimator consistency checks.
> When GNSS data is degraded or spoofed, the divergence from vision-inertial odometry and IMU integration triggers an immediate rejection of the corrupted signal.

Mathematical content: multiple sensor channels covering the same observable; consistency-check via divergence; rejection of any channel whose value diverges beyond tolerance.

PyFARS's failure modes today: a federation peer disconnects → envelopes pile up unhandled; LLM endpoint rate limit exhausts → dispatch silently fails; substrate hits $\top$-cell density threshold → no defined response.
Runtime *crashes or silently misbehaves*.

A new substrate object kind, `lifecycle-degradation-state`, at `governance/lifecycle-states/<state-slug>.md`:

```yaml
type: lifecycle-degradation-state
state: nominal | federation-partition | local-only | read-only-quiescent | emergency
order: 1                        # lower-number = more capable
preconditions:
  - all-peers-reachable: true
  - llm-endpoint-availability: ≥3
  - cell-contradiction-density: <0.01
admits-operations:
  - dispatch
  - federation-merge
  - charter-amendment
  - self-generation
exit-conditions-to-next-state:
  - peer-unreachable-for: 60s
  - llm-endpoint-availability: <3
restore-conditions-to-prior-state:
  - all-peers-reachable: true
  - 5-minute-stability-window: passed
```

Four canonical PyFARS states by analogy with the drone literature:

| State | Trigger | Admitted Operations | Substrate Effect |
|---|---|---|---|
| **Nominal** | All peers reachable, LLM endpoints healthy, contradiction density low | Full dispatch, federation, amendment, self-generation | Default operation |
| **Federation-Partition** | Peer-unreachable; lossy network | Local dispatch, queued envelopes, no charter amendment, suspended self-generation | Per `crdt-convergence` cellwise merge converges on heal; queue envelopes |
| **Local-Only** | All peers unreachable OR LLM endpoint exhaustion | Local closure rules continue; no agent invocations; no federation | Substrate maintains itself via deterministic rules only |
| **Read-Only-Quiescent** | Substrate unrecoverable contradictions; manual operator intervention required | Read access only; queries succeed; no writes | Substrate freezes for inspection — IS the $\mathrm{Cl}$-algebra fixed-point |

**At every level, mission-objective preservation is named explicitly.** Federation-partition still satisfies CRDT convergence (eventually); local-only satisfies replay-determinism per [M3](../work/milestones/m3-continuous-loop.md); read-only-quiescent satisfies snapshot-replay-fidelity per [M11](../work/milestones/m11-assurance-audit-chain-export.md).

State transitions are themselves substrate cells: `(substrate, transitioned-to, federation-partition) = T` with timestamp and trigger. **Audit trail is intrinsic.**

**Sensor-diversity analogue.** PyFARS's "sensor diversity" is **multiple closure rules covering the same predication**.
For a critical predication (e.g., "captain is C-charter-author for the polity"), more than one rule fires evidence: one from the captain's authoring history, one from the polity record's `authored-by` field, one from the office-incumbent record.
If they diverge, the divergence IS the substrate's signal.
The cellwise-meet over $\mathbf{FOUR}$ already detects this — divergence produces $\top$.
The drone-engineering pattern adds: *measure the divergence rate*, and if it exceeds tolerance, transition the affected sub-substrate to a degraded state.

A closure rule, `degradation-by-divergence-rate`, fires per substrate region: 1.
Computes per-tick $\top$-cell production rate for cells in the region.
2.
Compares against tolerance.
3.
If exceeded, declares the region degraded and routes its operations to a constrained set.

**Read-Only-Quiescent is a defined operating mode, not a crash.** The substrate preserves its content; queries succeed; the runtime waits for operator.
This is the substrate-escape-hatch — there's always a defined state to transition to that preserves data.

---

## OpenClaw deployment topology as multi-device federation prior art

OpenClaw's deployment ecosystem (per [`companion-tools-for-openclaw-march-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/companion-tools-for-openclaw-march-2026.md) and [`using-openclaw-on-windows-march-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/using-openclaw-on-windows-march-2026.md)) supplies prior art for the substrate's federation-and-deployment surface: the device-multiplexing pattern, the Tailscale-as-private-tunnel federation primitive, the local→Docker→VPS→Tailscale deployment ladder, and the federation-of-companion-tools mesh architecture.

### OpenClaw nodes as multi-device federation

OpenClaw treats macOS, iOS, and Android as **first-class device surfaces** — not notification shells.
The device nodes (per [`openclaw-node`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/terms/openclaw-node.md)) expose voice, camera, screen capture, and Canvas rendering capabilities to the agent.
The Gateway runs on a single host (default loopback); device nodes pair to the Gateway over the network and act as remote agents-of-the-Gateway.
The agent inhabits multiple device contexts at once.

This is **structurally the polity's multi-host federation pattern** at the device-of-one-user level:

- The Gateway is the substrate-of-record (the polity-host).
- Device nodes are federated participants, each with its own device-specific input/output capabilities.
- The pairing protocol (over Tailscale or LAN) is the federation-admission discipline.
- Channel adapters (per the [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)'s channel-multiplexing section) translate per-device input formats into substrate-cell content.

**The polity-of-one-user multi-device case IS the polity-of-many-users-multi-host case, scaled down by user count.** The same algebra works:

- Each device produces cells; the Gateway merges cells via $\vee_k$.
- The convergence rate is governed by the same algebraic-connectivity bound: if devices form a connection graph $G$, the consensus rate is $\lambda_2(L_G)$ where $L_G$ is the device-graph Laplacian.
  A phone with only intermittent connectivity contributes a low-degree node; the spectral gap shrinks; consensus slows.
- The W-MSR Byzantine filter (per [the section above](#w-msr-byzantine-filtering-at-the-merge-boundary)) applies at the device boundary: a compromised device's writes are filtered if the device-graph satisfies the $(2F+1)$-robustness condition (which a one-user-multi-device setup typically does NOT — there's no Byzantine-resilience for $F \geq 1$ with only 3 devices, you need 7+ devices for $F = 3$). **For one-user multi-device, W-MSR is over-discipline; what's needed is the consistent-hashing minimal-movement discipline** when devices come and go.
- The consistent-hashing minimal-movement discipline (per [the section above](#consistent-hashing-minimal-movement-for-instance-churn)) applies at device-churn: a phone going offline shifts cell-ownership minimally; a phone coming online claims its share; on-the-nose sheaf-section invariance preserves cells whose covering elements didn't change.

### Tailscale Serve as private-tunnel federation primitive

OpenClaw's Gateway docs converge on **Tailscale Serve** as the recommended remote-access pattern.
The Gateway stays bound to loopback; Tailscale provides HTTPS, routing, and identity-aware access via the operator's Tailscale tailnet.
The recommended Serve pattern: Gateway loopback + Tailscale as the only external surface; Tailscale's WireGuard mesh handles transport; Tailscale's identity layer handles ACL.

This is the federation question's [secure-channel discipline](#federated-learning-distillation-ship-deltas-not-data) at the device-network layer.
Tailscale's WireGuard-based mesh + identity is structurally the same as the polity's federation-admission discipline:

| Tailscale property | Polity-federation analog |
|---|---|
| Tailscale identity at tailnet admission | Identity check at federation admission (operator-controlled) |
| Tailscale ACL on tailnet membership | Authorization check at federation admission |
| WireGuard transport (encrypted, low-overhead) | Bandwidth-aware FedAvg-style sync (per [section above](#federated-learning-distillation-ship-deltas-not-data)) |
| Tailnet membership = federation membership | Polity peer-set = federation participants |
| Funnel for selective public exposure | Polity-public-projection (per [`polity-homepage-as-public-projection`](polity-homepage-as-public-projection.md)) |

The substrate-resident equivalent: PyFARS's federation-admission closure rule + secure-channel discipline + bandwidth-aware FedAvg-style sync produces the same operational properties as Tailscale Serve, but at the substrate-cell layer rather than the device-network layer. **They compose orthogonally**: Tailscale provides network-layer trust + bandwidth + transport; the substrate provides cell-level trust + W-MSR Byzantine + FedAvg distillation.
PyFARS does NOT replace Tailscale; it *runs over* Tailscale.

### The deployment ladder: local → Docker → VPS → Tailscale

Carl Vellotti's deployment guide (per [`using-openclaw-on-windows-march-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/using-openclaw-on-windows-march-2026.md)) describes a four-step deployment progression that has converged across the OpenClaw user community:

1. **Local** — Gateway on the operator's workstation.
  Lowest friction; no remote access.
  WSL2 on Windows; native on macOS/Linux.
2. **Docker locally** — same workstation but containerized.
  Reproducibility; isolation.
  Optional, not required.
3. **VPS** — moves the Gateway off the operator's workstation onto a remote host.
  True 24/7 availability.
4. **Tailscale** — adds private remote access to the VPS-hosted Gateway from the operator's devices.

**This is the polity's federation maturation ladder** at the polity-of-one-user scale:

| OpenClaw step | Polity-federation equivalent |
|---|---|
| Local | Single-host polity (M0–M4 substrate-on-one-machine) |
| Docker locally | Substrate with isolation discipline (no federation yet) |
| VPS | Substrate-on-remote-host (precondition for [M6](../work/milestones/m6-federation.md) federation) |
| Tailscale | Federation-admission via private tunnel ([M6](../work/milestones/m6-federation.md) full) |

**The deployment ladder is operationally validated** — OpenClaw's user community has progressed through it and converged on Tailscale-VPS as the working pattern.
PyFARS's [M6](../work/milestones/m6-federation.md) federation can adopt the same ladder discipline; the bare-cedar-fog ↔ cold-red-gate two-peer setup (per the [`561-group-serving-state` memory](../../../../.claude/projects/-home-emsenn-561/memory/project_561_group_serving_state.md)) IS the VPS-step of this ladder for the 561 polity.

The Windows-specific guidance — WSL2 for the Gateway, Windows as the surrounding desktop — extends the ladder: a Windows operator's local-step is *WSL2-Gateway + Windows-dashboard*, which is structurally a one-host federation across two execution environments.
PyFARS extends naturally: `polity` runs in one execution environment (substrate); `harness` runs in another (Claude Code, OpenClaw, foreign tooling); they federate through the substrate-cell layer.

### Channel + device + companion-tool federation = mesh

OpenClaw's federation surface is multi-dimensional:

- **Channel federation** — 22 messaging platforms feed inbound cells.
- **Device federation** — macOS / iOS / Android nodes paired to the Gateway.
- **Companion-tool federation** — Tailscale (network), Brave Search (retrieval), LiteLLM/OpenRouter (model routing), Ollama (local inference), QMD (memory retrieval), OpenProse (workflows), ACP (external coding harnesses), Docker (optional isolation), managed-browser (isolated agent profile).

The pattern: *OpenClaw is becoming a coordination layer for a family of tools, services, and runtimes that can be swapped without losing the operator's workspace, memory, and channel presence.* This is **the federation-of-extensions architecture** — a polity composed of a substrate plus a mesh of replaceable peers, each providing one primitive.
The mesh's algebra:

- Each peer-tool contributes one primitive (search, model-routing, retrieval, workflow, harness-routing, etc.).
- The substrate provides the universal-interface contract (cells, closure rules, materialized views).
- Peers are *individually replaceable* — swap LiteLLM for OpenRouter, swap Brave for another search provider, swap Pi for Claude Code via ACP — without re-deriving the substrate's algebra.
- The peer-tool mesh is itself a federation: peers are ranked by trust + availability; the substrate routes by cost-quantale + reliability metrics.

PyFARS extends this to the polity-of-many-users multi-host case: the substrate is the federation-of-extensions over multiple polity-substrates, each substrate is a federation-of-extensions over its companion-tool mesh. **The two-level recursion (substrate-substrate federation + substrate-tool federation) is structurally the same algebra applied twice.** The cost-quantale, the FedAvg distillation discipline, the W-MSR Byzantine filter, the algebraic-connectivity convergence rate — all apply at both levels with appropriate parameter substitution.

### Codi as the polity's working OpenClaw federation participant

The polity's [`governance/agents/codi.md`](../../../../governance/agents/codi.md) is configured as an OpenClaw agent with `manage-gateway-configuration-and-connections` and `maintain-persistent-context-across-sessions-and-machines` as core duties.
The harness-config file [`governance/harnesses/openclaw.md`](../../../../governance/harnesses/openclaw.md) is `status: active`. **The polity is already running as a federation participant via OpenClaw**; the deployment ladder above is not hypothetical for this polity — it is the lived experience of running PyFARS-with-OpenClaw across cold-red-gate and bare-cedar-fog.

The federation-resilience disciplines this question establishes (algebraic-connectivity convergence at $\lambda_2(L)$; W-MSR Byzantine filter under $(2F+1)$-robust graphs; event-triggered sync via Tabuada/HJT triggers; failure-detection sheaf with four-state $\langle \Box \mathrm{alive}, \Diamond \neg \mathrm{alive}\rangle$; consistent-hashing minimal-movement under cover refinement; FedAvg-distillation ship-deltas-not-data discipline; graceful-degradation Nominal/Federation-Partition/Local-Only/Read-Only-Quiescent lifecycle) all apply to this lived federation.
Codi's "across sessions and machines" duty IS the federation-resilience claim at the polity-internal level.

### Substrate object kinds for OpenClaw federation

A substrate object kind, `openclaw-federation-record`:

```yaml
type: openclaw-federation-record
deployment-step: local | docker-local | vps | tailscale
gateway-host: <hostname>
gateway-bind: loopback | private-network | public
federation-tunnel:
  kind: tailscale | wireguard | none
  tailnet: <tailnet-id>                  # if tailscale
device-nodes:
  - { device: macos | ios | android, paired-at: <timestamp>, capabilities: [voice, camera, screen, canvas] }
companion-tools:
  - { primitive: network, provider: tailscale }
  - { primitive: search, provider: brave-search }
  - { primitive: model-routing, provider: litellm | openrouter }
  - { primitive: local-inference, provider: ollama }
  - { primitive: memory-retrieval, provider: qmd }
  - { primitive: workflow, provider: openprose }
  - { primitive: harness-routing, provider: acp }
  - { primitive: isolation, provider: docker }
  - { primitive: browser, provider: managed-browser | browserless }
sharding-cover-record: <ref>             # for device-graph cover refinement
graceful-degradation-state: nominal | federation-partition | local-only | read-only-quiescent
```

Closure rules:

- `compute-device-graph-spectral-gap` — applies the algebraic-connectivity bound to the device graph; emits a federation-spectral-gap cell.
- `verify-tailscale-tailnet-membership` — checks federation admission against the tailnet ACL.
- `route-companion-tool-by-cost-quantale` — chooses among model-routing providers (LiteLLM/OpenRouter/Ollama) by cost-quantale + reliability.
- `consolidate-device-cells` — merges cells from all paired devices via $\vee_k$ at the Gateway.

### Engineering consequences

- **The deployment ladder is already validated** — local → Docker → VPS → Tailscale.
  [M6](../work/milestones/m6-federation.md) federation should adopt the same ladder.
- **Tailscale-as-private-tunnel federation primitive composes with substrate-cell-level federation**, not replaces it.
  Tailscale handles network-layer trust + bandwidth; the substrate handles cell-level trust + W-MSR Byzantine + FedAvg distillation.
  They are orthogonal layers; PyFARS runs *over* Tailscale, not instead of it.
- **Multi-device federation IS multi-host federation at one user's scale.** The same algebra; same convergence rate $\lambda_2(L)$; same consistent-hashing minimal-movement; same graceful-degradation states.
  W-MSR may be over-discipline for small device-counts (need $\geq 7$ devices for $F = 3$) and consistent-hashing-minimal-movement is the load-bearing discipline at this scale.
- **The federation-of-extensions architecture is the right substrate shape for long-running agent systems.** Each peer-tool provides one primitive; the substrate is the orchestrator.
  PyFARS extends this to the multi-substrate case via a two-level recursion of the same algebra.
- **The polity is already federated via OpenClaw.** Codi's working duty profile IS the federation-resilience claim in production — not a hypothetical.

### Communications-as-control-plant: protocol-family taxonomy and QoS discipline

The May 2026 drone-swarm surveys (per [`survey-of-autonomous-agents-and-swarms-may-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/survey-of-autonomous-agents-and-swarms-may-2026.md) and [`autonomous-agents-drone-swarms-standalone-report-may-2026`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/autonomous-agents-drone-swarms-standalone-report-may-2026.md)) supply a sharper architectural claim that extends the federation-of-extensions section above: **communications is not a support function in swarms; it is part of the control plant**.
The most important federation co-design question is whether state exchange should be **periodic, event-triggered, summarized, or omitted altogether**.
ROS 2 documentation makes the canonical trade explicit: DDS/ROS 2 can be tuned between *best effort* and *reliable* QoS profiles, and **incompatible QoS profiles cause message loss by construction** — a fielded-system pathology that no amount of bandwidth solves.

The substrate-algebraic statement: **the communications-protocol-family choice is itself a substrate-resident predicate** that determines which federation discipline applies, which event-triggered-sync trigger fires, which W-MSR Byzantine threshold is reachable, and which graceful-degradation lifecycle-state activates when the protocol's reliability boundary is exceeded.
The protocol family is *not* a deployment configuration; it is a closure-rule-firing input.

The protocol-family taxonomy with publicly stated nominal data rates:

| Protocol family | Publicly stated nominal data rate | Federation role | Caveat |
|---|---|---|---|
| **LoRaWAN** | 250 bit/s to 50 kbit/s (regional parameter table) | Long-range telemetry; sparse alerts; low-duty-cycle coordination | Very low throughput; poor fit for dense high-rate state exchange |
| **IEEE 802.15.4** | 250 kbit/s target over the air | Low-power local sensing; mesh control | Short range; bandwidth-limited |
| **Bluetooth LE** | 1 Mb/s mandatory LE 1M; optional 2 Mb/s; coded 125/500 kbit/s | Nearby pairing; setup; local coordination | Short-range; topology-limited |
| **MAVLink over serial / radio / IP** | Transport-dependent; protocol optimized for resource- and bandwidth-constrained links | Telemetry; commands; mission exchange | Not a physical link standard; guaranteed delivery only for selected protocol components |
| **DDS / ROS 2** | Transport-dependent; configurable QoS | High-rate middleware in autonomy stacks | QoS incompatibility + IP fragmentation can break field performance |
| **Wi-Fi 6** | 9.6 Gb/s theoretical aggregate maximum | Broadband local networking; video; rich state exchange | Real-world throughput far lower; contention-sensitive |
| **5G NR UAV** | 3GPP first 5G NR UAV release foundation; UAV-specific public throughput unspecified | Wide-area C2; backhaul; UTM/airspace integration | Carrier coverage and public UAV-specific latency/rate data unspecified |

These rates are not operationally comparable one-for-one — topology, duty cycle, contention, and link budget differ by orders of magnitude — but the order-of-magnitude differences matter for federation architecture design. **A federation that ships dense state exchange over LoRaWAN cannot work; a federation that ships sparse alerts over Wi-Fi 6 wastes bandwidth.** The substrate-resident closure rule `route-federation-by-protocol-family` reads the federation-trigger's volume requirement and chooses (or rejects) the protocol-family per the table.

The four state-exchange options become substrate-resident predicates on every federation envelope:

- **Periodic** — fixed-cadence cell shipment.
  Substrate predicate: `exchange-mode: periodic`, `period: <ms>`.
  Default for low-volume telemetry.
- **Event-triggered** — Tabuada/HJT trigger fires on $\|\hat{x}_i - x_i\|_2 \geq \sigma \|x_i\|_2$ (per the [event-triggered synchronization section above](#event-triggered-synchronization)).
  Substrate predicate: `exchange-mode: event-triggered`, `trigger-threshold: <sigma>`.
  Cuts communication versus periodic.
- **Summarized** — closure-output cells shipped instead of raw cells (FedAvg-style; per the [federated-learning section above](#fedavg-style-distillation-ship-deltas-not-data)).
  Substrate predicate: `exchange-mode: summarized`, `summary-fragment: <fragment-id>`.
- **Omitted** — no exchange; substrate runs in graceful-degradation Local-Only state for this scope.
  Substrate predicate: `exchange-mode: omitted`.
  Used when the protocol's bandwidth is below the scope's minimum for any non-trivial mode.

A substrate object kind, `communications-protocol-record`:

```yaml
type: communications-protocol-record
target-federation-link: <link-id>
protocol-family: lorawan | ieee-802-15-4 | bluetooth-le | mavlink | dds-ros2 | wifi-6 | 5g-nr-uav | <other>
nominal-data-rate-bps: <integer>
qos-profile: best-effort | reliable | configurable
exchange-mode: periodic | event-triggered | summarized | omitted
trigger-threshold: <float>                     # for event-triggered
summary-fragment: <fragment-id>                # for summarized
period-ms: <integer>                           # for periodic
fragmentation-policy: ip-fragment | application-segment | refuse
qos-incompatibility-detection:
  fired: true | false
  remediation: <closure-rule-id>
```

Closure rules:

- `route-federation-by-protocol-family` — substrate selects protocol-family + exchange-mode based on federation-trigger volume + scope priority.
- `detect-qos-incompatibility` — fires when DDS/ROS 2 publisher-subscriber QoS profiles mismatch (best-effort publisher + reliable subscriber, or vice versa); emits a $\langle \bot, \top\rangle$ cell (knowledge-order $\top$ — we know about the issue; truth-order $\bot$ — the channel is not reliable as configured).
- `enforce-fragmentation-policy` — IP fragmentation in lossy wireless can fill buffers and stall traffic pathologically; substrate's policy is to prefer application-level segmentation over IP fragmentation, or refuse the message if neither is feasible.
- `degrade-on-protocol-saturation` — when the protocol's nominal data rate is exceeded by the scope's required volume, substrate transitions to graceful-degradation Federation-Partition state for the affected scope.

**Engineering consequences extending the federation-of-extensions section**:

- **The federation-of-extensions architecture composes with protocol-family discipline.** Each peer-tool (Tailscale, Brave Search, etc.) operates over a specific protocol-family with specific QoS guarantees; the substrate's `communications-protocol-record` cells track per-tool protocols.
- **Communications-aware control is the substrate's federation-design discipline.** Per Tabuada/HJT, the trigger threshold $\sigma$ is calibrated to the protocol-family's reliability and bandwidth; *substrate-resident* trigger calibration prevents the *deployment-config-drift* failure mode where the trigger is set without reference to the protocol carrying it.
- **QoS profile incompatibility is a substrate-detected anti-pattern.** Substrate's `detect-qos-incompatibility` closure rule is a pre-runtime detector; comparable to the skill-failure-mode detectors per [memory-feedback question](memory-feedback-self-generation-and-failure-modes.md).
- **The four state-exchange options form a fragment-tier hierarchy** — periodic < event-triggered < summarized < omitted in *bandwidth-economy* order; closure rules choose the most-economical mode satisfying the scope's freshness requirement.

---

## Industrial three-layer pattern as PLC/Edge/Cloud control prior art

The industrial AI agent architecture (per [`industrial-control-overview`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/industrial-control-overview.md) and [`industrial-ai-agent-architecture-patterns`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/texts/industrial-ai-agent-architecture-patterns.md)) has converged in 2025–2026 around a three-layer pattern with timing budgets, certified safety boundaries, and graceful-degradation cascades.
The pattern is *operationally validated at industrial scale* — Siemens MindSphere, Industrial Copilot, Planning Copilot, Operations Copilot; Rockwell AADvance (SIL 3 safety systems), Logix SIS; ABB System 800xA; GE Digital Predix APM; Hitachi HMAX Industry (December 2025 launch for compressors, pumps, inkjet printers); Juniper Marvis (now HPE post-$14B acquisition July 2025; 80%+ troubleshooting efficacy); Cisco AgenticOps and AI Canvas; Nokia Event-Driven Automation (intent-based declarative configuration).
ROI exceeding 250% within 24 months on predictive-maintenance applications; 10,000+ man-hours saved annually per multi-agent factory deployment; 40–60% reduction in process cycle times; 43% reduction in unplanned downtime; 45% reduction in network outages (telecom).
The pattern *extends* the OpenClaw deployment-ladder discipline above into the industrial regulatory regime.

### The three layers

- **Layer 1: Deterministic Control (PLC / Safety System).** Microsecond-to-millisecond execution.
  Certified to **IEC 61508** (functional safety: SIL 1–4), **IEC 62061** (machinery safety; control systems), OSHA, industry-specific standards.
  Manages emergency stops, system invariants, certified control logic. *AI never runs here.* Examples: bearing resonance triggers immediate spindle shutdown; pressure exceeds threshold → emergency relief valve opens.
  No AI reasoning; certified automation.
- **Layer 2: Edge AI (Industrial Gateway / IPC).** 1–10 millisecond inference on factory-floor edge devices — multi-core CPUs, NPUs (neural processing units), real-time GPUs.
  Examples: NVIDIA IGX Thor, industrial x86 gateways.
  Anomaly detection, tactical optimization, local decision-making when cloud connectivity drops. *Continues operating standalone if cloud is offline.* Example: bearing vibration sensor → FFT → ML model → detects degradation pattern → generates maintenance alert → schedules technician via local interface to ERP cache.
- **Layer 3: Cloud / Enterprise AI.** Strategic planning, multi-agent orchestration, cross-organizational optimization, learning.
  Seconds-to-hours latency acceptable.
  Coordinates across factories.
  Example: *Given this bearing failure pattern, how should we replan production for the next shift?
  Coordinate with suppliers for parts.
  Optimize technician schedule across three factories.*

**Key principle**: *Data flows IN; decisions flow OUT.* Equipment → OPC-UA → MQTT → Edge AI → Cloud AI is the data path.
Cloud proposals → Edge gateway (approval logic) → PLC command execution is the decision path. **AI is never on the safety-critical path.**

The bearing-failure detection example with concrete latency budget:

- Sensor → FFT → ML model → anomaly score in **5 ms** (Edge AI inference).
- Is score > threshold AND is this equipment safe to stop?
  If yes → trigger stop.
  If no → wait and re-check. **~10 ms total** (edge logic).
- Stop spindle with certified emergency procedures. **~1 ms** (PLC execution).
- **Total: bearing hazard detected and mitigated in 16 ms.** Acceptable for human safety.

By contrast: send sensor data to cloud → train model → get decision back is **100+ ms** of additional risk.
Cloud-only would be unacceptable for safety-critical decisions.

### The three layers map to PyFARS substrate / harness / external-runtime

The industrial pattern's three-layer architecture is structurally the *same algebra* as PyFARS's substrate / harness / external-runtime split, with timing-budget calibration:

| Industrial layer | PyFARS analog | Latency budget | Authority |
|---|---|---|---|
| Layer 1: PLC / Safety System | Substrate-resident closure rules at $F_3$ formality | Microseconds (cell-write) | Substrate-decidable; replay-byte-identical |
| Layer 2: Edge AI (Gateway / IPC) | Harness-projected agent at $F_1$/$F_2$ formality (Claude Code, OpenClaw, ECC) | 1–10 ms (closure-rule firing + LLM inference at $T = 0$ or substrate-state-only-context) | Bounded by $H_\rho$ entropy cap + saturation cap |
| Layer 3: Cloud / Enterprise AI | Foreign-interior cobordism via ACP routing (per [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)) at $F_0$ formality | Seconds-to-hours (multi-agent orchestration; LangGraph / Temporal-style durable execution) | Witness-chain attestation; boundary-only replay |

The data-IN / decisions-OUT asymmetry maps directly: substrate-cell reads flow into closure-rule firings, harness-agent calls, foreign-runtime delegations; substrate-cell writes flow back through closure-rule output, harness-agent results, foreign-interior-cobordism postcondition checks. **The substrate's four-regime classification (per the [substrate-algebra question](substrate-algebra-closure-and-replay.md)) maps onto the latency budgets**: strict-regime rules can fire at the substrate layer (Layer-1 timing); Scott-continuous rules at the harness layer (Layer-2 timing); transfinite-bounded rules at the foreign-runtime layer (Layer-3 timing); aperiodic rules require explicit operator authorization and are not on any timing-critical path.

### IEC 61508 functional safety as charter authority over external surfaces

The industrial-control-text's *AI is never on the safety-critical path* principle is the charter-tier discipline applied to external-surface decisions. **The substrate's safety-envelope precheck (per [the governance question](governance-charter-and-accountability.md)'s HJ/CBF section) IS the substrate-resident analog of IEC 61508 SIL gating.** Specifically:

- **SIL 1–4 ratings** correspond to the four-regime classification's strictness levels: SIL 4 (highest functional safety; failure rate $\leq 10^{-9}$ per hour; nuclear / aerospace) ↔ strict-regime closure rules with replay-byte-identity guarantees; SIL 3 (failure rate $\leq 10^{-7}$ per hour; large-scale industrial; Rockwell AADvance class) ↔ strict + Scott-continuous regimes; SIL 2 / SIL 1 ↔ guidelines-tier with progressively wider regime admittance.
- **Certified control logic** at the PLC corresponds to substrate-resident closure rules at $F_3$ formality — pure substrate operations, no LLM call, deterministic, replay-byte-identical.
- **AI proposals must pass approval logic** at the gateway corresponds to PyFARS's safety-envelope precheck: a proposal that would violate substrate invariants is rejected; the rejection is a substrate cell with witness chain.
- **Adversarial robustness concern** — *AI models can be adversarially fooled or behave unpredictably on out-of-distribution inputs; ML training is statistical; safety systems must be deterministic* — is the substrate-algebraic motivation for the bilattice's $\mathbf{f}/\bot$ classification of unverified-or-adversarial inputs and the W-MSR Byzantine filter at the merge boundary.

**The substrate provides the IEC-61508-shaped certification at the substrate layer** without requiring per-deployment IEC certification of the LLM, because the LLM is not on the safety-critical path — closure rules are.
PyFARS's [M9](../work/milestones/m9-substrate-as-supervisor-of-layered-control.md) substrate-as-supervisor-of-layered-control IS exactly the position the industrial three-layer pattern carves out for the substrate layer.

### Graceful-degradation cascade extends the four-state lifecycle

The industrial graceful-degradation cascade refines the four-state lifecycle [from the section above](#graceful-degradation-as-substrate-resident-lifecycle-policy):

| Industrial failure | Industrial response | PyFARS lifecycle state |
|---|---|---|
| Cloud connectivity lost | Edge AI continues locally; cached ERP data; anomalies still detected; safety functions fully operational | **Federation-Partition** (lose external cloud routing; substrate continues with local closure rules; dispatch falls back to single-host) |
| Edge device crashes | PLC continues programmed control; equipment operates at reduced intelligence but safely; alert triggers replacement | **Local-Only** (lose harness-agent layer; substrate-resident closure rules continue; queries succeed at $F_3$) |
| Conflicting agent decisions | Orchestrator has final authority; if agents disagree, escalate to human; all proposals logged with reasoning | **Captain-attestation-required** (failure-detection sheaf reports $\langle \top, \top\rangle$ disagreement; substrate halts the conflicting workitem; captain reads the witness chain) |
| Multiple cascading failures | Equipment shuts down per certified emergency procedures | **Read-Only-Quiescent** (substrate preserves content; queries succeed; runtime waits for operator) |

**The substrate's four-state lifecycle is the substrate-algebraic generalization of the industrial cascade**, with the lifecycle states matched to specific industrial failure-conditions plus the substrate-specific *Captain-attestation-required* state for inter-agent disagreement that the industrial pattern resolves via human escalation.

### OPC-UA + MQTT + Sparkplug B as substrate-data-pipeline prior art

The industrial data pipeline standardizes on **OPC-UA** (Unified Architecture; semantic structuring) + **MQTT** (Message Queuing Telemetry Transport; scalable distribution) + **Sparkplug B** (consistent message schema, timestamp/sequence guarantees, birth/death messages for system resilience).
All major cloud and automation vendors support natively (AWS, Azure, Google Cloud, Siemens, Beckhoff, Rockwell).
The architectural diagram:

```
[Factory Floor]
├─ Motor (OPC-UA server)
├─ Pump (OPC-UA server)
└─ Compressor (OPC-UA server)
        ↓
[Edge Gateway / IPC]
├─ OPC-UA Client (pulls data from all equipment)
└─ MQTT Publisher (Sparkplug B format)
        ↓
[MQTT Broker]
├─ Agent-1 (Edge AI model for anomaly detection)
├─ Agent-2 (ERP integration)
├─ Agent-3 (Predictive model training)
└─ Archive (Data lake for historical analysis)
```

Why this pattern wins (per the industrial-architecture text):

- Single data source of truth (PLC/equipment publishes once)
- Multiple agents consume the same semantic-rich stream
- New agents added without modifying source equipment
- Security is orthogonal (mTLS on MQTT transport)
- Backward compatible with legacy SCADA via OPC-UA bridges

**This IS the federation-of-extensions architecture from the OpenClaw section above**, expressed at the industrial-data-pipeline level.
The cell-substrate generalizes:

- **OPC-UA NodeSet semantic structuring** = the substrate's typed-frontmatter discipline.
  Per the [substrate-algebra question](substrate-algebra-closure-and-replay.md), substrate cells carry typed predications; agents query semantic structure, not raw bits.
  The industrial example *Motor::Temperature (current: 85C, warning-threshold: 90C, next_service: 2026-05-15)* is the typed-frontmatter pattern at industrial scale.
  (See the [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)'s OPC-UA section for the full mapping.)
- **MQTT broker pattern** = the substrate's closure-rule-firing-as-pub-sub.
  A cell-write fires closure rules that read it; the substrate is the broker.
- **Sparkplug B birth/death messages** = the failure-detection sheaf's heartbeat modality (per [the section above](#failure-detection-as-bilattice-modal-suspicion)).
  The four-state $\langle \Box \mathrm{alive}, \Diamond \neg \mathrm{alive}\rangle$ classification is the substrate-algebraic generalization of birth/death lifecycle messages.
- **Single data source of truth + multiple agent subscribers + new agents added without modifying source** = the substrate's source-of-truth-cells + materialized-views + adapter-projections discipline.

**The substrate provides Sparkplug-B-shaped data-pipeline guarantees at the cell-write layer** without requiring per-deployment Sparkplug-B configuration.

### MCP at industrial scale anchors M8

The industrial-control text reports MCP ecosystem scale: ~100k downloads (November 2024) → 8M+ (April 2025) → **97M+ SDK downloads, 5,800+ servers** as of 2026. **MCP is the universal standard for agent tool access at industrial scale.** The substrate's [M8](../work/milestones/m8-inbound-participation-mcp-clients.md) inbound-participation surface lands directly in this ecosystem.
The 97M+ scale plus 5,800+ servers is the empirical anchor for adopting MCP as the default external-surface protocol — comparable in adoption to OPC-UA and HTTP at this point.
(See the [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)'s MCP section for the foreign-interior-cobordism extension.)

### Substrate object kinds for industrial-pattern integration

A substrate object kind, `industrial-layer-record`:

```yaml
type: industrial-layer-record
target-deployment: <polity-instance>
layer-1-substrate:
  formality-cap: F3                       # closure rules at F3 only
  iec-61508-sil-rating: 1 | 2 | 3 | 4
  replay-discipline: byte-identity
layer-2-harness:
  formality-cap: F1 | F2
  latency-budget-ms: 10
  bounded-h-rho: <value>
  saturation-cap-agents: 4
layer-3-foreign-runtime:
  formality-cap: F0
  acp-routing: [claude-code, codex, gemini-cli, ...]
  replay-discipline: boundary-only | full
data-pipeline:
  protocol: opc-ua-frontmatter | mqtt-cell-pub-sub | sparkplug-b-heartbeat
  source-of-truth: substrate-cells
graceful-degradation-policy:
  cloud-loss: federation-partition
  edge-crash: local-only
  agent-conflict: captain-attestation
  cascading: read-only-quiescent
```

Closure rules: `compute-iec-61508-sil-from-regime` (mechanically derives SIL from four-regime classification), `enforce-ai-not-on-safety-critical-path` (rejects closure-rule-firing chains where an LLM-call appears at $F_3$ or in a strict-regime rule), `industrial-graceful-degradation-router` (maps observed-failure to lifecycle-state transition), `compute-mcp-server-scale-metrics` (substrate-cell tracking of M8-served MCP clients for ecosystem-position reporting).

### Engineering consequences

- **The industrial three-layer pattern IS the PyFARS substrate / harness / external-runtime split.** PyFARS's algebra generalizes the industrial pattern; the timing budgets and SIL ratings provide substrate-resident calibration anchors.
  The 16ms bearing-failure budget gives a concrete benchmark for the substrate-layer + harness-layer combined latency.
- **IEC 61508 functional safety compliance is structurally available** via the four-regime classification + safety-envelope precheck + closure-rule replay-byte-identity.
  The substrate provides industrial-grade safety guarantees at the cell-write layer; LLMs are kept off the safety-critical path by construction.
- **The graceful-degradation cascade extends the four-state lifecycle** with industrial failure-mode mappings; *captain-attestation-required* is the substrate-specific addition for inter-agent disagreement that industrial deployments resolve via human escalation.
- **OPC-UA + MQTT + Sparkplug B is the substrate's data-pipeline pattern at industrial scale.** The substrate generalizes via typed-frontmatter + closure-rule-pub-sub + heartbeat-sheaf — at the cell-substrate level.
- **MCP at 97M+ SDK downloads + 5,800+ servers anchors M8** as the default external-surface protocol; the substrate's MCP-client surface lands in an industrial-scale ecosystem.
- **The 250%+ ROI within 24 months on predictive-maintenance applications** is the empirical anchor for PyFARS's M-series adoption: substrate-as-supervisor-of-layered-control deployments inherit the same cost-benefit profile when the four-cap stack is in place.

---

## What this commits to

Substrate-resident records: `federation-spectral-gap`, `byzantine-tolerance-record`, `federation-trigger`, `heartbeat-policy-record`, `sharding-cover-record`, `federation-distillation-record`, `lifecycle-degradation-state`.

Substrate-resident closure rules: `compute-spectral-gap`, `enforce-w-msr-filter`, `federation-trigger-eval`, `evaluate-heartbeat-modality`, `consistent-hash-cover-refinement`, `federation-distill`, `degradation-by-divergence-rate`.

The disciplines compose: spectral gap governs convergence rate; W-MSR runs before $\vee_k$-merge; event-triggered sync replaces periodic shipping; failure-detection feeds into both criticality assessment and degradation triggers; consistent-hashing handles instance churn; FedAvg-style distillation runs before envelope construction; graceful-degradation is the defined floor when other disciplines hit their limits.

## What this connects to

- **The [cohomological-coordination question](cohomological-coordination-and-audit.md)** — $\lambda_2$ governs $H^0$ section-construction *speed*; W-MSR composes with the audit-projector via `byzantine-cluster-as-finer-replica-cover`; consistent-hashing rebalance is BC base-change with $\mathcal{F}(\sigma) = \mathcal{F}(\sigma')$ on unchanged arcs; split-brain is detected via the same $\mathcal{F}_U^{(\top)}$-cohomology as every other substrate-content disagreement.
- **The [substrate-algebra question](substrate-algebra-closure-and-replay.md)** — closure-merge commutation underwrites every federation discipline (lazy closure, distillation, event-triggered sync); Read-Only-Quiescent IS the algebra fixed-point.
- **The [dispatch question](dispatch-workitems-plans-and-external-surfaces.md)** — federation-time, the dispatch's authorization fiber composes per the dispatch composition; W-MSR-rejected outliers feed dispatch with $\bot$-trust grades.
- **The [governance question](governance-charter-and-accountability.md)** — charter-amendment exemption from W-MSR is a polity-decision; tokens issued by Federation-Partition'd peers get $\bot$-trust grades; degradation-state transitions are themselves audit-witnessed actions per meaningful-human-control.

## What predication-categories theory establishes (load-bearing answers)

The actual [predication-categories theory](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/_index.md) is far richer than what `pypredcalc` has implemented.
The theorems below resolve several federation-resilience questions decisively.

### W-MSR's "total-ordering" requirement is not algebraic

The [four-bilattice object](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/four-bilattice.md) is *deliberately* partial-ordered: $\mathbf{FOUR}$ is a bilattice with two orthogonal orders ($\leq_t$ on truth, $\leq_k$ on knowledge) plus the four-character Klein-four gauge structure $K_4 = \{e, \sim, -, \sim\circ-\}$.
Totalizing $\mathbf{FOUR}$ via either order *destroys* the bilattice structure.

The [bilattice-network-sheaf-consensus theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/bilattice-network-sheaf-consensus.md) shows that the substrate's "consensus" and "disagreement" are computed by the partial structure directly:

- **Consensus** = $\lim_{\sigma \in \hat G} \mathbb F_{V_G}(\sigma)$ — the d-frame limit, taken componentwise on $L_+, L_-$.
- **Disagreement** = con-failure on the cellwise $\vee_k$ join.
  The con-failure cells *are* the $\top$-cells of the joint settling.

W-MSR's "F-highest / F-lowest" requires totalization for the *outlier-rejection* primitive, which is a federation-policy operation external to the substrate's algebra.
The substrate-coherent path is to keep $\mathbf{FOUR}$'s partial order intact algebraically and apply a totalization *only at the W-MSR projection step* — using the truth-order embedding $\bot \leq_t \mathbf{f}, \mathbf{t} \leq_t \top$ as one substrate-decidable totalization, with reputation cells (themselves bilattice-graded) as tiebreaks.
The totalization is a substrate-policy choice, not a substrate-algebraic one — and it must be re-derivable for audit.

This answers Q1 by reframing it: the question is not "which total order" but "which $\mathbf{FOUR}$-to-$\mathbb{R}$ projection does federation policy adopt for outlier-rejection."
The four-character Klein-four structure means there are *four* canonical projections (one per character), and reputation-cell weighting refines them.

### No-non-trivial-periodic-orbits kills φ-accrual transient false-positive interpretation

The [closure-monad-no-non-trivial-periodic-orbits theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-monad-no-non-trivial-periodic-orbits.md) proves that the closure 2-monad has *only* period-1 orbits: $T^k(v) = v \implies T(v) = v$.
The corpus is structurally a fixed-point theory.

For federation Q3 (heartbeat detector class): the $\Diamond$P (eventually perfect) detector's transient false positives *cannot come from the closure-rule algebra* — they must come from network noise, clock skew, or external-runtime non-determinism.
The substrate's algebra adds no oscillatory behavior; flapping in the heartbeat detector is *purely* a transport-layer phenomenon.

This sharpens the substrate's design: φ-accrual's threshold $\theta$ (Q4) needs calibration to *transport-layer noise distribution*, not to algebraic-oscillation-suppression.
The closure-2-monad's lax-idempotence kills algebraic noise structurally; transport noise is what remains.

### Per-cell convergence on FOUR is one composite step

The [four-bilattice-mixed-orbit-convergence theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/four-bilattice-mixed-orbit-convergence.md) proves: for every $a, x_0 \in \mathbf{FOUR}$, the orbit of $T_a(x) := a \Rightarrow (a \odot x)$ satisfies $x_1 = x_2$ — **one composite step suffices**.

This bounds federation cell-stabilization budgets directly.
The full 4×4 value table is computed exhaustively in the theorem; on $\mathbf{FOUR}$, per-cell stabilization is *2 substeps* ($a \odot \cdot$ then $a \Rightarrow \cdot$) or *1 fused step*.
Federation primitives (W-MSR projection, distillation, leader-election cell-update) operating on $\mathbf{FOUR}$-valued cells inherit this bound: per-cell convergence is bounded by 1 composite step per federation tick.

### CRDT convergence via Mayer-Vietoris is structurally unconditional

The [crdt-convergence-via-mayer-vietoris theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/crdt-convergence-via-mayer-vietoris.md) proves $\delta^0 = 0$ identically for the settling-associated sheaf $\mathcal{F}_U$ across replica covers.
The proof rests on extension-by-zero on the symmetric difference $U_1 \triangle U_2$:

> Every section on $U_1 \cap U_2$ — supported on points in $\Delta^{+, *}_\tau(q) \cap U_1 \cap U_2$ — extends canonically to $U$ by the "extension by zero" on $\Delta^{+, *}_\tau(q) \cap (U_1 \triangle U_2)$ (symmetric difference).
> The extension is compatible with restriction to $U_1$ and $U_2$ separately.

This decisively answers Q5 (distillation provenance verification cadence): distillation is *structurally* coordination-free in strict/Scott-continuous regimes. **Lazy verification is correct**; eager verification is structurally redundant.
The substrate's `federation-distill-prerequisite` check (Q7) is a *fragment-check*, not a per-merge correctness-check — it verifies that both peers have closure rules in the strict/Scott-continuous fragment so that $\delta^0 = 0$ holds.
If both peers' rules are in the right fragment, every merge commutes with closure structurally.

For peers operating on transfinite-bounded/aperiodic fragments, $\delta^0 = 0$ holds on shadow components but the d-frame consensus has nontrivial $\mathrm{con}, \mathrm{tot}$ relations not recoverable from the shadow — which is when the substrate's distilled-cell schema (Q6) needs the d-frame structure to be carried, not just the abelian shadow.

### Multi-observer system is the federation algebra

The [multi-observer-system object](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/multi-observer-system.md) generalizes federation directly: a multi-observer system is a functor $V : O \to \mathrm{Settlings}_B$ where $O$ encodes peer-to-peer relations.

- **Discrete $O$** (no non-identity morphisms): $H^1(O, \mathcal{V}) = 0$ trivially.
  Disagreement appears as pointwise difference, not as cohomology. **This is the case for current PyFARS deployments where peers are independent.**
- **Non-discrete $O$** (channels, group actions, posets): $H^1(O, \mathcal{V})$ measures coherent disagreement — peers individually consistent but jointly contradictory.

Three federation realizations are listed in the corpus's examples directly:

> - Multi-agent epistemic settings: the [Kripke benchmark](benchmark-5-epistemic-kripke.md)'s natural generalization. - Distributed-systems consensus: each replica is an observer; consensus is the limit. - Cosmological observer-dependence: each observer's accessible-information is a settling.

For the federation-resilience question's deployment topology, "each replica is an observer; consensus is the limit" is the substrate-algebraic shape directly.
The federation-of-extensions pattern (peer-tools as observers in a non-discrete $O$ with channel-morphisms encoding tool-cascade structure) is the *non-discrete* case; the joint regime is the meet (or max) of per-observer regimes, possibly with cohomological corrections.

This answers Q14 (Tailscale-tailnet as substrate-resident federation-membership cell) decisively at the algebraic level: the tailnet IS the category $O$ of a multi-observer system; mirroring it as `tailnet-membership-record` cells gives the substrate access to the cohomological-disagreement primitive directly.
API-read defers the algebra to an external query.

### Verdier duality: distillation has TWO dualities composing

The [verdier-duality-bitopological-site theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md) gives a derived equivalence between sheaves and cosheaves on the bitopological settling site, *across all four regimes*.
In the d-frame setting, **two dualities compose**:

1. **Spatial Verdier:** sheaf $\leftrightarrow$ cosheaf via cellular sheaf-cosheaf exchange.
2. **Value-category negation gauge:** $L_+ \leftrightarrow L_-$ via bilattice negation.

Composed: a cell on the truth-positive side of the sheaf at $(q, \tau, U)$ corresponds to a cell on the falsity-positive side of the cosheaf at the dual position. **$\top$-firings are self-dual fixed points** of the composed duality; truth-only and falsity-only firings exchange.

This sharpens federation distillation discipline (Q5, Q6, Q7): the substrate's distillation operation can produce *either* sheaf-presentation (cocycle-witness equality testing — natural for "do these two distilled outputs match?") *or* cosheaf-presentation (local-generator construction — natural for "build a distilled state from per-peer firing data").
Both are byte-equivalent under Verdier duality.
The substrate's `federation-distill-prerequisite` check (Q7) IS the regime-and-cohomological-dimension check that ensures the two presentations agree byte-for-byte; failure modes are "spatial-only" (one side of the duality satisfied, the other not) — a structural diagnostic.

The aperiodic co-classification (per [aperiodic-co-classification theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodic-co-classification.md)) gives federation-of-extensions a structural choice point:

- **Periodic-sync federation** uses sheaf-cohomology presentation: $H^1$ classes via cocycle witnesses, refinement under sub-site inclusion.
  Natural for FedAvg-style model-delta production.
- **Event-triggered federation** uses cosheaf-homology presentation: $H_1$ classes via local generators, coarsening under sub-site projection.
  Natural for sparse event-driven sync where each event is a local generator.

Both presentations encode the same MLD-class data; deployments should choose based on which computational primitive (equality-testing vs construction) dominates their operations.

### Equivariant cohomology decomposition: 4 sectors of federation disagreement

The [equivariant-cohomology-decomposition theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/equivariant-cohomology-decomposition.md) decomposes $H^1$ into four isotypic sectors:

- $H^1_{\chi_\sim}$: epistemic-frame disagreements (truth-side ↔ falsity-side, ${\sim}$-antisymmetric).
- $H^1_{\chi_-}$: $\top$-firings (consistency-failure events, $-$-antisymmetric).
- $H^1_{\chi_{\sim\circ-}}$: mixed/double-curvature events (both ${\sim}$ and $-$ antisymmetric).
- $H^1_\mathrm{id}$: symmetric truth-plus-falsity sector.

**The four sectors are four orthogonal channels of federation disagreement.** A federation peer's W-MSR projection (Q1) needs to report not just a scalar trust grade, but the sector decomposition: a peer whose disagreement is concentrated in $\chi_\sim$ (epistemic-frame disagreement) is structurally different from a peer whose disagreement is in $\chi_-$ (paraconsistent inconsistency).
The "F-highest/F-lowest" outlier-rejection logic should consider sector-typed disagreements: a peer with high $\chi_-$ disagreement (consistency-failure) should be downgraded faster than a peer with high $\chi_\sim$ disagreement (which may be a legitimate frame difference).

The substrate-resident `compute-disagreement-sector-decomposition` closure rule reads the federation's $H^1$ and emits the 4-vector per peer per audit window.

### Aperiodic co-classification: federation primitives for $H^1$ vs $H_1$

The [aperiodic-co-classification theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodic-co-classification.md) makes the operational primitives explicit:

- **$H^1$ presentation:** equality testing (cocycle witnesses), refinement under sub-site inclusion.
- **$H_1$ presentation:** local-generator construction, coarsening under sub-site projection.

For Q15 (federation-of-extensions peer-replacement closure rule): when a companion-tool peer becomes unavailable, the substrate's fallback discipline depends on which presentation the federation is using. $H^1$-based fallback uses the cocycle representation (substrate has cocycle witnesses; check whether replacement peer's cocycles match); $H_1$-based fallback uses the local-generator representation (substrate has per-event generators; check whether replacement peer can produce the same local generators). **Per-tick fallback evaluation is correct in either presentation; the choice is computational-primitive-driven, not policy-driven.**

### Realizability cardinality bound: federation expressivity is capped at $2^{\aleph_0}$

The [realizability-cardinality-bound theorem](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/realizability-cardinality-bound.md) caps the substrate's realizable family at $2^{\aleph_0}$ under countable-support increment sequences and bare-$\Pi_1$ rules.
Federation peers operating under standard rule fragments stay within this bound *jointly* — the multi-observer system's joint realizable family is the union of per-observer realizable families, all bounded by $2^{\aleph_0}$.

This sharpens Q16 (multi-substrate two-level recursion implementation): the upper-level federation (multiple PyFARS polities) and lower-level federation (one PyFARS polity over its companion-tool mesh) operate in *the same* $2^{\aleph_0}$-cardinal expressivity envelope.
Uniform algebra at the same closure-rule layer is structurally correct; the cardinality bound does not distinguish the two levels.

## Implementation questions for the planner

(After the theory above, only genuine implementation-policy questions remain.)

1. **Total-ordering for W-MSR.** **Theory: not algebraic.** $\mathbf{FOUR}$ is deliberately partial-ordered; the totalization is a federation-policy projection at the W-MSR step.
  Pick truth-order embedding ($\bot \leq_t \mathbf{f}, \mathbf{t} \leq_t \top$) for F-highest/F-lowest sort, with reputation-cell tiebreaks. **Theory: report sector-decomposed disagreement.** Per the equivariant decomposition, the W-MSR output should carry the 4-vector $(|H^1_\mathrm{id}|, |H^1_{\chi_\sim}|, |H^1_{\chi_-}|, |H^1_{\chi_{\sim\circ-}}|)$ per peer; the totalization for outlier-rejection takes a sector-typed weighted sum, with $\chi_-$ (consistency-failure) weighted most heavily.
  Multi-axis reputation (`technical-honesty`, `governance-honesty`, `payment-honesty`) IS the sector decomposition under a different name.
  The four-character Klein-four structure gives four canonical projections; commit one per federation context.
2. **Trigger-threshold $\sigma$ — per-polity vs per-edge.** Per-edge is more flexible (different links have different bandwidth costs); commit and scope.
3. **Heartbeat detector-class default.** $\Diamond$P (eventually perfect; transient false positives killed by closure-2-monad lax-idempotence) is the realistic target.
  P is desirable but rarely achievable.
4. **Phi-accrual threshold normalization.** $\theta$'s value depends on heartbeat-distribution scale; for Lawvere-quantale composition to work uniformly, the substrate needs normalized threshold computation (e.g., $\theta$ in units of expected heartbeat-interval).
5. **Distillation provenance verification cadence.** Eager (every merge re-derives) vs lazy (only when audit projector requests).
  Lazy fits the cohomological-coordination simplicity cap.
6. **Distillation cell-class taxonomy.** Where does the raw-vs-distilled boundary go for cells that don't fit cleanly (e.g., dispatch-outcome cells)?
  Commit to a default with explicit overrides.
7. **Closure-rule consistency requirement.** Distillation only commutes if both peers have the same closure rules; a `federation-distill-prerequisite` check fires before distillation; failure → raw shipment fallback.
8. **Degradation transition timing — instantaneous vs hysteretic.** Drone literature uses 5-minute stability windows.
  Adopt hysteretic to avoid flapping.
9. **Degradation state granularity — substrate-wide vs region-scoped.** Region-scoped matches drone literature's per-agent state model and is more responsive to localized failures; substrate-wide is simpler.
10. **Captain-override on degradation transitions.** Per meaningful-human-control, override is a substrate operation requiring captain attestation (audit-witnessed), not a runtime hack.
11. **Deployment-step transition policy.** local → docker-local → vps → tailscale per OpenClaw's validated ladder.
  Substrate-resident cells track `deployment-step:` so federation-admission closure rules can read the polity's current step.
  Whether transitions require captain attestation or are auto-detected (substrate observes loopback-vs-network-bind, presence-of-tailscale-tailnet, etc.).
  First is conservative; second is convenient.
12. **Multi-device W-MSR threshold.** Per the deployment-topology section, $(2F+1)$-robustness requires $\geq 7$ devices for $F = 3$; below threshold the substrate falls back to consistent-hashing-minimal-movement only.
  Substrate-resident closure rule `evaluate-byzantine-tolerance-by-device-count` makes the fallback decision; threshold-and-fallback policy needs to be in `governance/runtime-caps/<polity>.md`.
13. **Companion-tool peer-tool routing precedence.** OpenClaw routes among LiteLLM/OpenRouter/Ollama by operator preference; PyFARS could route by cost-quantale + reliability metrics (substrate-driven) or by per-office preference (governance-driven).
  Substrate-driven is more substrate-coherent; governance-driven respects per-office authority over its tool stack.
14. **Tailscale-tailnet as substrate-resident federation-membership cell.** The tailnet's ACL is the federation membership boundary; the substrate could mirror it as `tailnet-membership-record` cells, or read it directly via Tailscale's API.
  Mirroring is substrate-coherent (cells are source-of-truth); API-read is fewer cells but creates an external dependency.
15. **Federation-of-extensions peer-replacement closure rule.** When a companion-tool peer becomes unavailable (LiteLLM goes down, Brave Search rate-limits), substrate-resident `route-companion-tool-by-cost-quantale` should fall back.
  Whether substrate fall-back is per-workitem (lighter) or per-polity-tick (substrate-coherent).
  Per-tick aligns with the closure-rule firing pattern.
16. **Multi-substrate two-level recursion implementation.** The substrate-of-substrates federation (multiple PyFARS polities federating) is the upper level; substrate-tool federation (one PyFARS polity over its companion-tool mesh) is the lower level.
  Whether to implement both at the same closure-rule layer (uniform algebra) or layer-specific (separate substrate-federation-rules and tool-federation-rules).
  Uniform is more substrate-coherent.
17. **SIL-rating-to-fragment mechanical derivation.** The `compute-iec-61508-sil-from-regime` closure rule mechanically maps four-regime classification to SIL ratings (strict ↔ SIL 4; strict+Scott-continuous ↔ SIL 3; etc.).
  Whether the substrate enforces the mapping strictly (rejects rules whose declared SIL is below their fragment's required tier) or warns.
  Strict enforcement is conservative; warning lets the polity grow into formal SIL discipline.
18. **Industrial-layer-record per polity vs per deployment.** A polity may run one substrate across multiple deployments (cold-red-gate, bare-cedar-fog); each deployment's industrial-layer-record may differ (layer-2 may be Claude Code on one host, OpenClaw on another).
  Per-deployment is more accurate; per-polity is simpler.
19. **Sparkplug-B birth/death message latency budget.** The failure-detection sheaf's heartbeat modality is the substrate-algebraic generalization.
  Per the industrial pattern, birth/death latency is sub-second for most equipment; PyFARS's heartbeat-policy-record `theta` threshold needs calibration to that scale.
20. **Vendor-stack composition policy.** When PyFARS substrates compose with a vendor stack (Siemens MindSphere, Rockwell, ABB), whether the substrate adopts the vendor's MQTT broker as the federation transport (federated-of-extensions: vendor primitive replaces substrate native) or runs alongside it (orthogonal layers).
  Composition-orthogonal is the structural default; vendor-replacement may be needed for SIL-rated paths.
21. **AI-not-on-safety-critical-path enforcement scope.** Per-cell-write (closure-rule rejects $F_3$ cells whose body invokes LLM), per-rule-firing (rejects strict-regime rules calling out to LLM endpoints), per-deployment (industrial-layer-record cap on layer-1 LLM calls).
  All three is belt-and-suspenders.
22. **Communications-protocol-record default cadence per peer.** Each federation peer carries a `communications-protocol-record`.
  Whether the substrate auto-derives the cadence from observed traffic patterns (substrate-coherent; adapts to changing conditions) or uses operator-declared static cadence (predictable; manually tuned).
  Hybrid: operator-declared as the floor, substrate-observed as the working default.
23. **QoS incompatibility remediation policy.** When `detect-qos-incompatibility` fires on a DDS/ROS 2 publisher-subscriber mismatch, substrate options: (a) auto-downgrade reliable subscriber to best-effort to match publisher; (b) auto-upgrade publisher to reliable to match subscriber; (c) refuse the channel; (d) emit warning and continue.
  Per safety class — refuse for SIL-rated; auto-downgrade-with-warning for SIL-1/2; warn-and-continue for non-SIL.
24. **Fragmentation-policy default per protocol.** IP fragmentation in lossy wireless is pathological; substrate's default is application-segment for DDS/ROS 2 + Wi-Fi 6, refuse for low-bandwidth links (LoRaWAN), allow with caution for MAVLink.
  Per-protocol policy in `governance/communications-policy.md`.
25. **Exchange-mode degradation cascade.** When protocol saturates, substrate degrades: periodic → event-triggered → summarized → omitted.
  Whether the cascade is automatic (substrate observes saturation, transitions) or operator-attested (substrate flags saturation, captain authorizes downgrade).
  Automatic for non-SIL; operator-attested for SIL-rated paths.
26. **Communications-aware trigger calibration.** The Tabuada/HJT trigger threshold $\sigma$ should be calibrated to the protocol-family's reliability and bandwidth.
  Substrate-resident closure rule `calibrate-trigger-by-protocol` reads the `communications-protocol-record` and emits the calibrated $\sigma$.
  Whether per-link calibration (lighter) or per-scope calibration (substrate-coherent) is the default.
11. **Sharding deferral.** Single-instance polities don't need consistent-hashing yet; defer until multi-instance scale-out is required, but commit to the discipline now so the migration witness cell-schema is ready.
12. **Switching-graph $\lambda_2$.** If the federation graph is time-varying (peers come and go), the rate metric becomes time-averaged or worst-case-over-window $\lambda_2$.
  Pick one.
13. **Eigenvalue computation backend.** NumPy is shippable; SciPy sparse-matrix scales better at modest cost.
  For single-digit peer counts, NumPy is fine.
14. **Hash function for sharding.** Cryptographic (SHA-256, BLAKE3) is required for clause 4 uniformity; do not invent.
15. **Virtual-node count default.** ~256 per instance is the practitioner standard.
