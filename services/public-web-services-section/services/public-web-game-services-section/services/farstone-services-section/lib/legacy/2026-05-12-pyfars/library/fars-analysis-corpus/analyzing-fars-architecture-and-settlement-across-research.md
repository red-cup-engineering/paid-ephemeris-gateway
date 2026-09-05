---
title: "Analyzing FARS architecture and settlement across research"
specialization: analysis
feature: architecture-and-settlement
description: "Everything we know about how FARS computes — the algebra, wavefront settlement, locality, entity-as-actor, the two-store problem, termination, and how external software informs the design."
date-created: 2026-04-07
informs: [system-architecture-refactor, fars-architecture-coherence, ordering-first-computation]
synthesizes:
  - computation-is-wavefront-settlement
  - local-computation-synthesis
  - settle-function-design
  - writable-settle-design
  - entity-as-actor-settlement-as-computation
  - applications-as-sublocales
  - voidmath-as-predication-substrate
software-sources:
  - analyzing-how-bussard-informs-development-of-fars
  - analyzing-how-tab-informs-development-of-fars
  - analyzing-how-lpmud-discworld-informs-development-of-fars
  - analyzing-how-messaging-systems-informs-development-of-fars
  - analyzing-how-mud-autonomous-worlds-informs-development-of-fars
incident-sources:
  - "2026-04-06 OOM: 30 hooks × node spawn × full graph load = 306 MB RSS per process on 1.6 GB VPS"
---

# Analyzing FARS Architecture and Settlement

## The one primitive

`message(entityId, payload)` is the one primitive.
Everything — queries, mutations, cascades, creation, dispatch, tracking — is a message.
The result is always a predication graph: the entity and everything reachable through its predicate edges.

## The algebra

Four evidence states: ⊥ (unknown), t (affirmed), f (denied), ⊤ (contested).
Two operations: ⊙ (extend/compose) and ⇒ (restrict/test).
The adjunction `a ⊙ p ≤_t q iff p ≤_t (a ⇒ q)` is verified on all 64 triples.
This is the Busaniche-Cignoli twist-product residuation on **2** ⊗ **2**.

Key algebraic properties: - ⊤ is identity for ⊙: ⊤ ⊙ a = a (Proposition 1 — entity creation falls out) - f is absorbing for ⊙: f ⊙ a = f (Proposition 2 — denial kills) - ⊥ ⊙ ⊥ = f (Proposition 3 — composing two unknowns denies) - All orbits reach fixpoint in ≤ 2 steps (Proposition 8) - Post-closure set {t, f, ⊤} is closed under ⊙ and ⇒ (Theorem 3)

## Computation is local (the Axiom of Locality)

The math proves H is a sheaf: an entity's fiber decomposes over its immediate extensions.
You do NOT need the whole graph to compute any single entity's response.
You need: 1.
The entity's own fiber (~50 predicates) 2.
Its immediate relations (entities referenced by its predicates, and vice versa) 3.
The algebra (4 values, O(1) per operation)

`loadGraph()` violates this.
It loads 49K entities (45MB) for O(1) work on 1-50.
On a 1.6GB VPS with 30 hooks spawning, this caused OOM.
The violation is architectural, not performance — enrichment makes entities richer, which makes the graph bigger, which makes loadGraph() worse.
The development path and the computation model collide.

The indexed store (entity-index.json + value-index.json) already exists and provides the three O(1) queries the wavefront needs: - `loadEntity(id)` → one entity's predicates - `loadNeighbors(id)` → entities whose predicates reference this id - Predicate-value lookup via value-index

## The wavefront

Settlement is NOT "compute one entity's response."
It is a wavefront propagating through the graph:

1. Message enters at one entity
2. `respond(entity, message)` computes that entity's new fiber — LOCAL, O(1) per predicate
3. Changes propagate to connected entities via relation predicates (part-of, depends-on, serves, assigned-to)
4. Each connected entity responds — again LOCAL
5. Their changes propagate to THEIR connections
6. Until fixpoint — no more changes anywhere

Each step is local.
The wavefront is global.
Memory = wavefront width (typically 10-50), not graph size (49K).

**Termination guarantee:** Bilattice has 4 values → each predicate changes ≤ 3 times.
Graph is finite. respond() is monotonic in knowledge order.
Proposition 8: pointwise orbits reach fixpoint in ≤ 2 steps.
Total bound: 3 × entities-in-wavefront × predicates-per-entity.

## Entities are actors (Curry-Howard)

The entity IS the actor.
Its fiber IS its program.
Settlement IS computation.
This reframes everything:

- An entity's fiber IS its type/program (Curry-Howard)
- `respond(entity, message)` IS function application
- Settlement to fixpoint IS proof normalization
- The settled fiber H*_t IS the normal form

An entity needs processing when H_t ≠ H*_t — unsettled propositions exist.
The heartbeat subscription is COMPUTED, not declared: after each settle() pass, entities with remaining unsettled propositions stay on the worklist.
Entities at fixpoint drop off.
Same as LPMud's `set_heart_beat()`.

## Entity creation as settlement

Entity creation is NOT special.
An entity that doesn't exist has fiber ⊤.
Creating = `respond(⊤, message)` = message (by Proposition 1: ⊤ ⊙ a = a).
The wavefront then propagates to all entities referenced by the new entity's predicates.
The file write, graph patch, event log entry are persistence effects of the wavefront reaching fixpoint.

## The two-store coherence problem

FARS has two stores: event log (append-only, monotonic, source of truth in rigorous reading) and markdown files (editable, lossy projections, source of truth in practical reading).
Currently maintained by separate mechanisms that can diverge.

Writable settle() needs to update both atomically: append events AND update files.
Two approaches: - **Event-first:** settle() → events → reducer projects into files.
Files are derived. - **File-first:** settle() → file edits → hook logs events.
Log is an audit trail.

File-first is practical now (humans edit files).
Event-first is architecturally correct.
The transition path: file-first with event recording, evolving toward event-first as the system matures.

## Applications as sublocales

Every "application" (MUD, ERP, CL, publishing) is a view/nucleus/sublocale of the same system (Decision 001).
The MUD nucleus shows rooms and objects.
The ERP nucleus shows tasks and plans.
They're all sub-algebras of the same locale.
Not separate codebases — different projections through different nuclei.

## Two primitive predicates: extends and restricts

Every predicate in the system is a composition of two primitives (captain correction, 2026-04-06):

- **extends** (⊙, Δ, transfer): A extends B = A with more added.
  What flows forward.
- **restricts** (⇒, σ, saturation): A restricts B = A with less allowed.
  What constrains backward.

All 30+ vocabulary predicates are domain-specific instantiations:

| Restricts-natured (⇒/σ) | Extends-natured (⊙/Δ) |
|---|---|
| part-of (2,769), requires (1,462), contains (495), component-of (286), instance-of (153), blocks (13) | depends-on (1,836), enables (632), produces (527), serves (345), extends (265), assigned-to (159) |

settle() propagates along these: extends edges flow forward, restricts edges recompute backward.
Eventually, every frontmatter key should be marked `primitive: extends` or `primitive: restricts` so settle() reads the predicate's own fiber to know how to propagate.

## Fiber richness diagnostic (2026-04-06)

respond() on real entities: foundational terms (thing, quality, state) have 11-39 predicates but only 1-3 semantic predicates connecting to other entities.
Most predicates are bibliographic metadata.
The enrichment gap is semantic connections, not entity count.
The graph has 11K+ entities but they're thinly connected.

For respond(office, task) to produce non-trivial results, offices need capability predicates (capability: coordination, work-type: procedure) and tasks need requirement predicates (requires: coordination).
These predicates must use the SAME vocabulary — shared predicates produce non-⊥ compositions.

## What external software confirms

**Bussard:** Tick is simple iteration — one pass through all entities. **TAB:** Engine is just another thing. **LPMud:** Driver/mudlib split — the algebra knows nothing about the domain. **MUD autonomous worlds:** ECS is EAVT — same architecture.
Authoritative store + derived indexes. **Messaging systems:** Event log IS the database (Kafka).
Bilattice ∨_k IS a CRDT (concurrent merge without conflicts).

## The three computation layers (kernel/micromodel/shell)

From the Settlingday architecture synthesis: the system's context overhead ratio is 515x.
The fix is three layers matching the formality scale:

| Formality | Layer | Computation | Cost |
|---|---|---|---|
| F3 (algebraic) | **Kernel** — scripts, graph queries, deterministic tools | $0.00 |
| F2 (structured) | **Micromodel** — fine-tuned 3B classifier on own tool-call logs | ~$0.00 |
| F1 (narrative) | **Shell (light)** — sonnet/haiku for structured content | ~$0.03 |
| F0 (implicit) | **Shell (heavy)** — opus for novel research/architecture | ~$0.10 |

The micromodel training pipeline: extract from tool-call logs (622 xLAM examples) → QLoRA fine-tune ($2-5) → deploy GGUF 4-bit to VPS (~2.5GB) → iterate monthly.
The fine-tuned model IS the closure of tool-call corpus.
Accuracy convergence = fixed point.

## Sender composition requires fiber expansion

Tested 2026-04-07: sender ⊙ payload drops to ⊥ when fibers share zero predicate:object pairs. extend(⊥, t) = ⊥.
Raw entity fibers are too thin for sender-constrained composition.
Fix: fiber expansion — replace term references with their predicates before composition, creating shared vocabulary.
The graph-expansion-reduction plan addresses this.

## MASH engine as TAB dimension

The MASH daemon IS a TAB dimension entity — a thing in the world with dimension behaviors.
Its tick walks its systems.
Not a special process — an entity queryable via message(mash-daemon).

## Plan classification: OS vs application vs library

Plans classify into three layers: OS (substrate), application (domain-specific), library/research (knowledge).
The five-layer architecture is OS.
MUD/ERP/gamification are applications.
OS must stabilize before applications can be reliable.

### Planning data for plan enrichment The settlingday-architecture-synthesis and kernel-shell-architecture analyses contained specific existing tools (10+), tools to build (4), cost projections, and plan classification data.
Should enrich system-architecture-refactor, progressive-automation-plan, and individual plan classifications.

## See also

- [The adjoint paper](../../../library/theories/science/theories/information/texts/the-adjoint-structure-of-predication-on-bilattice-valued-fibers.md)
- [FARS README](../../../operations/engineering/systems/fars/README.md)
