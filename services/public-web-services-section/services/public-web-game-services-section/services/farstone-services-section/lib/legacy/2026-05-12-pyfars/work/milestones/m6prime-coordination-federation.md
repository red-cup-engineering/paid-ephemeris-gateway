---
title: "M6' — Coordination-Federation Layer (Multi-Writer Discipline above the Cellwise-Merge Algebra)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: captured
depends-on: [m6-federation]
goals:
  - leader-records-as-substrate-driven-tournament
  - quorum-records-for-multi-witness-decisions
  - distributed-lock-records-as-residuated-authority-gates
  - cluster-records-as-replica-cover
  - failure-detection-as-bilattice-modal-suspicion
  - coordination-cohomologically-bounded-by-h1-audit
theory-basis: [coordination-cohomologically-bounded-by-h1, leader-election-termination-via-no-periodic-orbits, quorum-safety-under-partition, distributed-lock-as-residuated-authority-gate, failure-detection-as-bilattice-modal-suspicion, consensus-as-h0-construction]
cites-objects:
  - pyfars/objects/peer-record.md
  - pyfars/objects/federation-envelope-record.md
  - pyfars/objects/anomaly-witness.md
  - pyfars/objects/jsonl-event-log.md
cites-morphisms:
  - pyfars/morphisms/settling.md
cites-claims:
  - pyfars/claims/replay-determinism.md
backing-gaps:
  - pyfars/objects/leader-record.md (NOT YET AUTHORED — substrate-driven tournament for tick-driving authority)
  - pyfars/objects/quorum-record.md (NOT YET AUTHORED — multi-witness-decision specification)
  - pyfars/objects/distributed-lock-record.md (NOT YET AUTHORED — residuated-authority gate on contended scope)
  - pyfars/objects/cluster-record.md (NOT YET AUTHORED — replica cover + sharding scheme)
  - pyfars/objects/failure-detection-cell.md (NOT YET AUTHORED — bilattice-modal suspicion of peer)
  - pyfars/morphisms/holding-tournament.md (NOT YET AUTHORED — leader election runner)
  - pyfars/morphisms/proposing-quorum-decision.md (NOT YET AUTHORED — quorum-record settlement)
  - pyfars/claims/coordination-bounded-by-h1.md (NOT YET AUTHORED — protocol-simplicity-cap; routes proof through upstream coordination-cohomologically-bounded-by-h1 theorem)
acceptance: "Two PyFARS engines federating with M6 content-merge in place can additionally coordinate operational decisions whose disagreement-class lies in non-trivial H¹: under concurrent activity on both peers, contended dispatches on shared workitems are *prevented* by the lock layer rather than *detected* (as ⊤ cells) post-hoc; charter-amendment ratification requires quorum-record settlement before binding; tick-driving on shared scopes routes through leader-election. Each coordination decision class has a substrate-readable H¹ signature; classes with trivial H¹ continue to federate by cellwise merge alone (M6 scope), classes with non-trivial H¹ route through the appropriate primitive."
---

# M6' — Coordination-Federation Layer

After [M6](m6-federation.md) closes content-federation (cellwise $\vee_k$ merge over the Belnap–Fitting FOUR; single-writer-friendly), M6' adds the **coordination-federation** layer: substrate-resident leader/quorum/lock/cluster records that gate concurrent operational decisions across peers.
Per the [`distributed-coordination-primitives-for-federation`](../../questions/distributed-coordination-primitives-for-federation.md) question that motivated this milestone's authoring, federation has two fibers — *content* (algebraic, single-writer) and *coordination* (operational, multi-writer).
M6 closes the first; M6' closes the second.

The key constraint: per [`coordination-cohomologically-bounded-by-h1`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/coordination-cohomologically-bounded-by-h1.md), the cohomological *complexity* of any coordination problem on the platform is bounded by $H^1$.
Decisions whose disagreement-class lies in trivial $H^1$ converge by cellwise merge alone — *M6 already handles these*.
Decisions in non-trivial $H^1$ require explicit coordination — *M6' is the layer that handles these*.
Per [`coordination-bounded-by-h1-as-protocol-simplicity-cap`](../../questions/coordination-bounded-by-h1-as-protocol-simplicity-cap.md), the substrate refuses protocols anticipating $H^n = 0\ (n \geq 2)$; the engineering simplicity cap holds.

## What M6' does NOT claim

- M6' does not claim to *replace* M6's cellwise-merge.
  It *layers above* it.
  Most substrate cells continue to federate by cellwise merge; only the small subset whose decision class is in non-trivial $H^1$ routes through coordination primitives.
- M6' does not claim to replace external consensus systems (Raft, Paxos, etcd, ZooKeeper) wholesale. **It claims that the same coordination patterns can be substrate-resident** — leader-records and quorum-records are themselves ordinary substrate cells federated via M6's content-federation.
  The coordination *patterns* are common; PyFARS's claim is *substrate-residence*, not algorithmic novelty.
- M6' does not claim trivial $H^2$.
  Per the protocol-simplicity-cap, any decision class that *would* require $H^2$ structure indicates over-engineering: such a class should be either redesigned to fit $H^1$ or refused.
- M6' does not claim Byzantine-fault tolerance by default. **Byzantine-resilience is a property of the trust-level cells in peer-records and the optional W-MSR filter at the merge boundary** (per [`w-msr-byzantine-filter-at-federation-merge`](../../questions/w-msr-byzantine-filter-at-federation-merge.md)).
  Honest-peer assumptions hold by default; M6' inherits whatever Byzantine-resilience the peer-records assert and the merge boundary enforces.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `leader-records-as-substrate-driven-tournament` | A `governance/leaders/<scope>.md` record drives a substrate-cell-firing tournament for tick-driving authority on shared scopes; termination per [`leader-election-termination-via-no-periodic-orbits`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/leader-election-termination-via-no-periodic-orbits.md) | open |
| `quorum-records-for-multi-witness-decisions` | A `governance/quorums/<scope>.md` record specifies the quorum requirement for charter-amendment ratification, multi-witness-completion, and other agreement operations; safety per [`quorum-safety-under-partition`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/quorum-safety-under-partition.md) | open |
| `distributed-lock-records-as-residuated-authority-gates` | A `governance/locks/<scope>.md` record gates contended dispatches on shared workitems; lock semantics per [`distributed-lock-as-residuated-authority-gate`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/distributed-lock-as-residuated-authority-gate.md) | open |
| `cluster-records-as-replica-cover` | A `governance/clusters/<id>.md` record declares the cluster's replica cover, peer membership, and sharding scheme per [`cluster-as-replica-cover`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/concepts/cluster-as-replica-cover.md) | open |
| `failure-detection-as-bilattice-modal-suspicion` | Peer-failure-detection produces bilattice-modal suspicion cells per [`failure-detection-as-bilattice-modal-suspicion`](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/theorems/failure-detection-as-bilattice-modal-suspicion.md); peers progress through the suspect/timeout/excluded lifecycle | open |
| `coordination-cohomologically-bounded-by-h1-audit` | An audit closure rule that classifies each operational decision-class by its $H^1$ signature; emits a finding when a decision is routed through coordination primitives whose $H^1$ would be trivial (over-coordination) or whose $H^1$ would be non-trivial but is being merged via cellwise (under-coordination) | open |

## Theoretical shape

**1.
Coordination as substrate-resident records, not out-of-band machinery.** Running a Raft cluster alongside PyFARS would be operationally simpler in the short term but would put coordination state outside the substrate's algebra — violating the agential-self-generation commitment.
M6' makes the coordination layer's state *substrate-resident*: leader-records, quorum-records, lock-records are all ordinary substrate cells federated via M6's content-federation.

**2.
The two-fiber decomposition is the structurally honest framing.** M6 alone is *single-writer-friendly* federation: each engine writes to cells it owns, cellwise-merge converges, conflicts produce $\top$.
M6' covers what M6 alone *cannot* — concurrent multi-writer activity on contended substrate, where post-hoc $\top$ detection is too late.

**3.
Consensus-as-$H^0$ unification with M11.** Per [`consensus-as-h0-construction-as-substrate-primitive`](../../questions/consensus-as-h0-construction-as-substrate-primitive.md), consensus is a single substrate primitive used across federation merge, charter ratification, and multi-witness completion.
M6' is the milestone that makes this uniformity load-bearing: the same quorum-record format that ratifies a charter amendment also settles a multi-witness federation merge.
M11 (assurance audit chain export) reads the unified consensus primitive when projecting audit chains.

## Concrete stack candidate (from prior art)

The [`distributed-relational-machine-runtime`](../../../../work/triage/engineering-archive/library/triage/from-tech-bucket-2/distributed-relational-machine-runtime.md) prior-art names a specific stack for this layer:

- **DataStore**: rqlite — distributed SQLite over Raft consensus
- **Input boundary**: NATS JetStream — ordered per-thread step streams; at-least-once delivery; idempotent step processing
- **Engine workers**: Dapr Agents — stateless virtual actor per history thread; `dapr-ext-langgraph` wraps LangGraph inside Dapr workflow activities
- **Algebraic constraint validation**: clingo (Answer Set Programming) — declarative enforcement of structure laws before the Engine runs

This stack is *not committed* — PyFARS already runs LangGraph + PydanticAI; rqlite/NATS/Dapr/clingo would be additions.
The prior art shows what someone already thought through; M6' implementation chooses among this and other shapes (raft-rs in-process, etcd, FoundationDB, custom-on-substrate).

## Implementation status

**Theoretically scoped, captain-decision-pending on the H¹ classification.** The substrate-side machinery is research-actionable today. **What's pending is the $H^1$-classification audit**: which of PyFARS's operational decisions are in trivial $H^1$ (cellwise-merge sufficient) vs. non-trivial $H^1$ (coordination primitive required).
Without this classification, M6' implementation would over- or under-coordinate; with it, each decision class routes through the right primitive.

The captain's first concrete two-peer scenario ([`vps-mini-cold-red-gate`](../../concepts/) ↔ [`loc-lap-bare-cedar-fog`](../../concepts/) federation) likely exercises only a small subset of M6' primitives — mostly observation-and-instinct sync (trivial $H^1$, M6-only) with occasional captain-driven amendments (non-trivial $H^1$, quorum-record needed).
M6's "Done when" criterion as currently authored is single-writer-cellwise-merge-done; M6' extends that to multi-writer-coordination-done.

## Related self-questions

- [`distributed-coordination-primitives-for-federation`](../../questions/distributed-coordination-primitives-for-federation.md) — **the question that motivated M6'**.
  Its yes-answer *is* M6'.
- [`consensus-as-h0-construction-as-substrate-primitive`](../../questions/consensus-as-h0-construction-as-substrate-primitive.md) — consensus uniformity across M6'/M11.
- [`coordination-bounded-by-h1-as-protocol-simplicity-cap`](../../questions/coordination-bounded-by-h1-as-protocol-simplicity-cap.md) — the simplicity cap M6' commits to.
- [`w-msr-byzantine-filter-at-federation-merge`](../../questions/w-msr-byzantine-filter-at-federation-merge.md) — Byzantine-resilience companion question.

See [`questions/_themes.md`](../../questions/_themes.md) for the full theme map.

## Related

- [Roadmap](roadmap.md)
- [M6 — Federation (content-federation)](m6-federation.md) — the prerequisite this milestone successors
- [Distributed-Coordination-Platform theory](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/distributed-coordination-platform/_index.md)
