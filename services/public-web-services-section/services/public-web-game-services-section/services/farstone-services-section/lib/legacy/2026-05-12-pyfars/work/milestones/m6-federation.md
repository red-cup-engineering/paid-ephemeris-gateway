---
title: "M6 — Federation (Content-Federation Layer; Coordination-Federation Layer Deferred to M6'/Successor)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: captured
depends-on: [m5-agential-self-generation]
goals:
  - fars-federation-spec-section-authored
  - content-hash-addressing
  - peer-records-and-trust-levels
  - federation-envelope-wire-transport
  - cross-host-substrate-convergence
theory-basis: [federation-by-value-domain-join, charter-as-closure-system, predication-fiber]
cites-objects:
  - pyfars/objects/peer-record.md
  - pyfars/objects/federation-envelope-record.md
  - pyfars/objects/content-hash.md
  - pyfars/objects/closure-state-hash.md
  - pyfars/objects/jsonl-event-log.md
  - pyfars/objects/anomaly-witness.md
  - pyfars/objects/channels/inter-office.md
cites-morphisms:
  - pyfars/morphisms/emitting-federation-envelope.md
  - pyfars/morphisms/admitting-federation-envelope.md
  - pyfars/morphisms/settling.md
cites-claims:
  - pyfars/claims/replay-determinism.md
  - pyfars/claims/cellwise-merge-converges.md
  - pyfars/claims/jsonl-is-canonical-state.md
cites-recurrent-practices:
  - pyfars/work/recurrent-practices/federation-cycle.md
acceptance: "A predication added to the substrate on one host appears on the peer host after the next federation cycle, without data loss or last-write-wins resolution. **Single-writer-friendly scope**: this acceptance covers content-federation; multi-writer-coordination (concurrent contended dispatches, charter-amendment ratification quorums, dispatch locks) is deferred to M6' (coordination-federation) per [`distributed-coordination-primitives-for-federation`](../../questions/distributed-coordination-primitives-for-federation.md)."
---

# M6 — Federation (Content-Federation Layer)

Multiple PyFARS engines share substrate content and converge on consistent state under arbitrary message delivery ordering.
Convergence happens through the substrate's bilattice value-domain join — the algebra IS the federation protocol — rather than through a separately-engineered synchronization layer.

After M5 each engine is self-improving in its own substrate.
M6 connects multiple engines so their substrates converge, while preserving the closure-merge commutation property that makes convergence order-independent.

**Scope rescope per [`distributed-coordination-primitives-for-federation`](../../questions/distributed-coordination-primitives-for-federation.md):** federation has *two* fibers.
M6's scope is the **content-federation** fiber — cellwise $\vee_k$ merge of substrate cells over the Belnap–Fitting FOUR.
Single-writer-friendly: each engine writes to the cells it owns; cellwise-merge converges.
This is the *value-domain* of federation.
The **coordination-federation** fiber — leader-election, quorum-consensus, distributed-lock, cluster-record — handles multi-writer coordination on contended substrate (concurrent dispatch races, charter-amendment ratification, peer-membership churn).
That fiber is deferred to **M6' (coordination-federation)** as a successor milestone authored per the extension pass; see roadmap.md for the M6' sketch.

## Goals (content-federation only)

| Slug | One-liner | Status | Backed by |
|---|---|---|---|
| `fars-federation-spec-section-authored` | The FARS spec's federation section is written before implementation begins; theory precedes code | open | upstream FARS theorems work — see `flatfile-federation-equivalence`; [`cellwise-merge-converges`](../../claims/cellwise-merge-converges.md) is the substrate-side projection |
| `content-hash-addressing` | Every substrate note has a canonical content hash; the hash is the stable identifier across hosts (paths are local) | open | [`content-hash`](../../objects/content-hash.md), [`closure-state-hash`](../../objects/closure-state-hash.md), [`jsonl-is-canonical-state`](../../claims/jsonl-is-canonical-state.md) |
| `peer-records-and-trust-levels` | `type: peer` substrate records declare federated nodes, their addresses, trust levels, and sync scopes | open | [`peer-record`](../../objects/peer-record.md) |
| `federation-envelope-wire-transport` | `emit-federation-envelope` / `admit-federation-envelope` over HTTP per `wiring-protocols.md` §4.6 | open | [`federation-envelope-record`](../../objects/federation-envelope-record.md), [`emitting-federation-envelope`](../../morphisms/emitting-federation-envelope.md), [`admitting-federation-envelope`](../../morphisms/admitting-federation-envelope.md) |
| `cross-host-substrate-convergence` | A predication added on one host appears on the peer host after the next federation cycle | open | [`replay-determinism`](../../claims/replay-determinism.md), [`cellwise-merge-converges`](../../claims/cellwise-merge-converges.md), [`federation-cycle`](../../work/recurrent-practices/federation-cycle.md) |

## What already exists

- `programs/federation.py` carries `FederationCell` and `FederationEnvelope` types.
- Cellwise `∨_k` merge over the Belnap–Fitting FOUR is implemented; conflicting cells produce `⊤`.
- The closure runner's `rsv_hash` stamps each dispatch run for replay-determinism across peers.

## What lands here

- The wire transport: how envelopes get from one engine to another (HTTP-bodied JSON, polled or pushed depending on peer trust level and topology).
- The FARS federation spec: convergence theorem, peer-discovery semantics, sovereignty boundaries, replay correctness across federated engines.
- The substrate side: peer records, content-hash addressing, federation-cycle semantics.

## Done when

A workitem authored on `vps-mini-cold-red-gate` is visible on `loc-lap-bare-cedar-fog` after one federation cycle.
Two engines that took divergent updates during a partition reconcile to a single substrate state under bilattice join when the partition heals — no last-write-wins, contradictions surface as `⊤` cells.

## Theoretical shape

M6 closes charter C4 (federation by value-domain join):

**1.
The closure-merge commutation lemma** (`programs/federation.py` docstring; [`flatfile-agentic-resource-system/_index.md`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md)).
The lemma states $\mathrm{cl}_p(\mathrm{cl}_p(X) \vee_k Y) = \mathrm{cl}_p(X \vee_k Y)$.
Two engines federating reach the same closed store from the same input regardless of merge order. **The lemma is the convergence theorem; the FARS federation spec section authors the discipline that makes the lemma operationally usable** (peer addressing, sync scopes, partition handling).

**2.
Multi-agent-work-as-CRDT** ([`predicated-work/theorems/multi-agent-work-as-crdt`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/multi-agent-work-as-crdt.md)).
The substrate's cellwise $\vee_k$ is associative-commutative-idempotent — the CRDT property.
Federation operationalizes the theorem: cross-host merges respect the CRDT property; eventual consistency is theorem-guaranteed.

**3.
Sovereign-node** ([`flatfile-agentic-resource-system/concepts/sovereign-node`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/sovereign-node.md)) and **content-hash-addressing** ([`flatfile-agentic-resource-system/concepts/content-hash-addressing`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/content-hash-addressing.md)).
Each engine is a sovereign node; federation is between sovereigns, not under a central coordinator.
Content-hash-addressing makes notes globally identifiable; paths stay local.
The two together are what distinguish federation-by-value-domain-join from a centralized event bus.

## Predication-categories grounding (cycle-1/2 bindings)

Three theorems sharpen M6's design decisions:

**A.
Distillation provenance verification can be lazy.** Per [crdt-convergence-via-mayer-vietoris](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/crdt-convergence-via-mayer-vietoris.md): for the settling-associated sheaf $\mathcal{F}_U$, the Mayer-Vietoris connecting homomorphism $\delta^0 = 0$ **identically** under any replica cover.
The proof rests on extension-by-zero on the symmetric difference $U_1 \triangle U_2$:

> Every section on $U_1 \cap U_2$ extends canonically to $U$ by extension-by-zero on the symmetric difference.
> The extension is compatible with restriction to $U_1$ and $U_2$ separately.

Combined with [cohomological-CALM](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/cohomological-calm.md), $\delta^0 = 0$ holds *abstractly* in the strict and Scott-continuous regimes — without needing the explicit construction. **Distillation is structurally coordination-free in strict/Scott-continuous regimes; lazy verification is correct, eager verification is structurally redundant.** The substrate's `federation-distill-prerequisite` check is a *fragment-check* (verifies both peers' rules are in the strict/Scott-continuous fragment so $\delta^0 = 0$ holds), not a per-merge correctness check.

**B.
FOUR's partial order is preserved algebraically; W-MSR totalization is federation-policy.** Per [bilattice-network-sheaf-consensus](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/bilattice-network-sheaf-consensus.md) + [four-bilattice-mixed-orbit-convergence](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/four-bilattice-mixed-orbit-convergence.md): $\mathbf{FOUR}$ is deliberately partial-ordered with two orthogonal orders ($\leq_t$ on truth, $\leq_k$ on knowledge) plus the four-character Klein-four gauge structure. **Totalizing $\mathbf{FOUR}$ destroys the bilattice structure.**

W-MSR's "F-highest / F-lowest" outlier-rejection requires totalization for the *projection step*, which is a federation-policy operation.
The substrate-coherent path: keep $\mathbf{FOUR}$'s partial order intact algebraically; apply totalization only at the W-MSR projection step using the truth-order embedding $\bot \leq_t \mathbf{f}, \mathbf{t} \leq_t \top$ (with reputation-cell tiebreaks) as one of four canonical projections (one per Klein-four character).
The choice of projection is policy, not algebra.

**C.
Federation envelopes carry sector-decomposed disagreement.** Per [equivariant-cohomology-decomposition](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/equivariant-cohomology-decomposition.md): $H^1$ splits into four isotypic sectors per $\widehat{K_4}$ characters:

- $H^1_\mathrm{id}$: symmetric truth-plus-falsity disagreement (rare).
- $H^1_{\chi_\sim}$: epistemic-frame disagreement (different observational frames; resolvable by frame clarification).
- $H^1_{\chi_-}$: $\top$-firings (paraconsistent inconsistencies; safety-critical).
- $H^1_{\chi_{\sim\circ-}}$: mixed double-curvature (frame disagreement AND inconsistency).

**Federation peer's W-MSR projection (goal `peer-records-and-trust-levels`) reports the 4-vector per peer per audit window**, not a scalar trust grade.
A peer with high $\chi_-$ disagreement should be downgraded faster than a peer with high $\chi_\sim$ disagreement (which may be a legitimate frame difference).
The substrate-resident `compute-disagreement-sector-decomposition` closure rule reads the federation's $H^1$ and emits the 4-vector.
Multi-axis reputation (`technical-honesty`, `governance-honesty`, `payment-honesty` per [`w-msr-byzantine-filter-at-federation-merge`](../../questions/w-msr-byzantine-filter-at-federation-merge.md)) IS the sector decomposition under a different name.

**D.
Aperiodic co-classification — federation has dual presentations.** Per [verdier-duality-bitopological-site](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md) + [aperiodic-co-classification](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodic-co-classification.md):

- **Periodic-sync federation** uses sheaf-cohomology presentation: $H^1$ classes via cocycle witnesses, refinement under sub-site inclusion.
  Natural for FedAvg-style model-delta production (per [`federated-learning-model-deltas-vs-raw-data-for-federation`](../../questions/federated-learning-model-deltas-vs-raw-data-for-federation.md)).
- **Event-triggered federation** uses cosheaf-homology presentation: $H_1$ classes via local generators, coarsening under sub-site projection.
  Natural for sparse event-driven sync (per [`event-triggered-synchronization-for-federation-envelopes`](../../questions/event-triggered-synchronization-for-federation-envelopes.md)).

Both presentations encode the same MLD-class data via Verdier duality; the substrate's federation envelope can carry either, with the choice driven by which computational primitive (equality-testing vs construction) dominates the deployment's operations.

**E.
Multi-substrate two-level recursion stays in $2^{\aleph_0}$.** Per [realizability-cardinality-bound](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/realizability-cardinality-bound.md): under bare-$\Pi_1$ rules and countable-support increments, the realizable family is bounded at $2^{\aleph_0}$.
The upper-level federation (multiple PyFARS polities) and lower-level federation (one polity over its companion-tool mesh) operate in *the same* expressivity envelope; uniform algebra at the same closure-rule layer is structurally correct.
Per `programs/federation.py` docstring's existing two-level recursion framing: this confirms uniform-algebra, not layer-specific separate algebras.

## Related self-questions

The following open questions in [`questions/`](../../questions/) explore axes that may sharpen M6's goals when the cascade advances M6 from `captured` toward `later`.
M6 carries the densest concentration of self-questions in the roadmap because federation is the multi-engine operational frontier and admits more theory-API choices than any other milestone:

- [`distributed-coordination-primitives-for-federation`](../../questions/distributed-coordination-primitives-for-federation.md) — whether M6 should split into a content-federation layer (current scope: cellwise merge) and a coordination-federation layer (leader-election, quorum-consensus, distributed-lock, cluster-record).
  Names the [`distributed-coordination-platform`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/_index.md) primitives that ground the second layer. **This is the most structural of the M6 questions; a yes-answer rescopes M6 itself.**
- [`algebraic-connectivity-as-federation-convergence-metric`](../../questions/algebraic-connectivity-as-federation-convergence-metric.md) — exposing the federation-graph Laplacian's $\lambda_2(L)$ as a substrate-resident convergence-rate metric.
  Bears on `cross-host-substrate-convergence`.
- [`event-triggered-synchronization-for-federation-envelopes`](../../questions/event-triggered-synchronization-for-federation-envelopes.md) — replacing periodic envelope shipping with event-triggered synchronization on Lyapunov-style triggers.
  Bears on `federation-envelope-wire-transport`.
- [`w-msr-byzantine-filter-at-federation-merge`](../../questions/w-msr-byzantine-filter-at-federation-merge.md) — inserting W-MSR Byzantine filtering at the cellwise-merge boundary.
  Bears on `peer-records-and-trust-levels` (which trust levels admit which filters).
- [`beck-chevalley-as-substrate-invariant-for-jurisdiction-and-shard-moves`](../../questions/beck-chevalley-as-substrate-invariant-for-jurisdiction-and-shard-moves.md) — verifying Beck–Chevalley commutation as a substrate invariant when assignment cells move across jurisdiction or shard boundaries.
  Bears on the federation-correctness-under-reorganization axis the milestone implies but doesn't pin down.
- [`consensus-as-h0-construction-as-substrate-primitive`](../../questions/consensus-as-h0-construction-as-substrate-primitive.md) — adopting consensus-as-$H^0$ as the *single* substrate primitive for every agreement operation (charter ratification, federation merge, multi-witness completion).
  Structural — a yes-answer rescopes M6's coordination layer toward a unified primitive rather than per-decision-class primitives.
- [`coordination-bounded-by-h1-as-protocol-simplicity-cap`](../../questions/coordination-bounded-by-h1-as-protocol-simplicity-cap.md) — using $H^n = 0\ (n \geq 2)$ as a substrate-engineering simplicity cap, refusing protocols that anticipate higher-degree obstructions.
  Companion to the previous; together they argue M6 should *not* over-engineer.
- [`federated-learning-model-deltas-vs-raw-data-for-federation`](../../questions/federated-learning-model-deltas-vs-raw-data-for-federation.md) — adapting FedAvg's model-delta-not-raw-data discipline to federation, shipping closure-rule-deltas instead of full cell-sets when bandwidth is the binding constraint.
  Bears on `federation-envelope-wire-transport`.

See [`questions/_themes.md`](../../questions/_themes.md) for the full theme map.

## Related

- [Roadmap](roadmap.md)
- [Wiring Protocols §4.6 (federation, pending)](../../governance/specifications/wiring-protocols.md)
- [Charter C4 — federation by value-domain join](../../governance/charter.md)
