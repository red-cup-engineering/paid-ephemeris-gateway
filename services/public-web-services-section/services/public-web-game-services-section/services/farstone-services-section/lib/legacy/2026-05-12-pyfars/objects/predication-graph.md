---
type: definition
class: derived-graph
status: draft
realizes: [predication-graph]
depends-on: [corpus-as-flatfile, predication-cell, predication-fiber]
---

# Predication graph

The graph PyFARS derives from the union of all frontmatter relations across the [corpus-as-flatfile](corpus-as-flatfile.md).
Vertices are corpus notes (by slug); edges are labeled by relation-name (`depends-on`, `realizes`, `assigned-to`, etc.) and carry the bilattice value of the projecting [predication-cell](../concepts/predication-cell.md).

## Data

The predication graph $G$ for a corpus $\mathrm{Corpus}_F$ is

$$G \;=\; (V,\; E,\; \ell,\; v)$$

where:

- $V$ is the set of slugs in the corpus's slug-index, plus any slugs *referenced* by frontmatter relations whose target doesn't exist as a note (these become *unresolved* vertices, surfaced by validation).
- $E \subseteq V \times R \times V$ is the set of triples $(s, p, o)$ projected from frontmatter relations, where $R$ is the set of valid relation names per the corpus's conventions.
- $\ell: E \to R$ is the labeling (the relation-name on each edge).
- $v: E \to \mathrm{FOUR}$ is the bilattice value of each edge — typically $t$ (the relation is asserted), occasionally $\bot$ (a relation key exists but its value is empty), and rarely $\top$ (contradictory frontmatter, surfaced as a validation error).

## Notation

For a note $n$, we write: - $G^+(n) = \{m : (n, p, m) \in E, v(n,p,m) = t\}$ — the set of out-neighbors (the notes $n$ points to). - $G^-(n) = \{m : (m, p, n) \in E, v(m,p,n) = t\}$ — the set of in-neighbors (the notes that point to $n$). - $G^p(n) = \{m : (n, p, m) \in E, v(n,p,m) = t\}$ — out-neighbors via specific relation $p$.

Read-only graph queries (`analyze.impact`, `analyze.context_walk`, `analyze.ramp`, `analyze.show`) traverse $G$ from a seed slug to a bounded depth.
The runtime dispatch graph likewise lifts cells from disk via `substrate.projector.compound.extract_tree(root)` into a typed `pypredcalc.
PredicationStore` each tick.

## Construction

The predication graph is *derived*, not stored.
Each load of the corpus walks all notes, parses each note's frontmatter, and accumulates edges.
The implementation caches the resulting graph in memory for the duration of a verb invocation; the cache is rebuilt on each invocation.

This is one place where the substrate-purity claim is strict: the predication graph is *not* a separate authoritative source of truth.
It is a derived projection.
If the corpus changes, the next predication graph build reflects the change.
Stale graph caches are a runtime concern, not a substrate concern.

## What the predication graph supports

- **Topological reading order** (predication-categories convention): per `depends-on:` chains, notes can be linearly ordered so that every note appears after its dependencies.
  This is what `render/monograph.py` consumes for monograph composition.
- **Impact analysis**: which notes depend on a given note?
  `analyze/impact.py` walks $G^-$ transitively.
- **Context bundles**: a bounded subgraph from a seed, returned as LLM context.
  `analyze/context_walk.py`.
- **Orphan detection**: notes with no incoming edges and no outgoing `explores:` are candidate orphans, surfaced by `closure/rule/orphans.py`.
- **Cross-reference auditing**: `closure/rule/broken_links.py` reads $G$ and flags broken edges (target slugs not in $V$); the runtime dispatch graph reads cells via the projector framework and surfaces contradiction (`⊤` cells) on rule firings.

## What the predication graph does not capture

The predication graph is a *partial projection* of system state.
It captures the cells that frontmatter expresses; it does not capture:

- Cells about non-corpus entities (e.g., cells about agent sessions, process state, runtime metrics).
- Cells with bilattice values other than $\{t, \bot, \top\}$ — frontmatter list inclusion projects only $t$; absence projects $\bot$; explicit denial requires special syntax.
- Temporal cells (cells whose value changes over time without corresponding frontmatter edits — e.g., `last-validated-at`).

Cells outside the predication graph live in the JSONL event log and in derived in-memory indices.
The graph is the *frontmatter-readable slice* of system state.

## Relation to predication-fibers (upstream)

The predication-graph is a finitary, frontmatter-derived approximation of the full predication fiber over the corpus base.
Cells in the fiber that aren't expressible in frontmatter (richer values, non-relation predicates) live elsewhere and are projected into other transports (JSONL, JSON-API responses).

## What this object does not specify

- The exact set of valid relations $R$.
  The realization treats relations as open — any frontmatter list-valued field whose name is non-reserved counts as a relation.
  Standard relations have semantics enforced by the renderer (`depends-on:` is order-bearing; `see-also:` is not).
- The handling of multi-edges (same $(s, p, o)$ asserted twice in different cells).
  Currently de-duplicated; the discipline for genuine multi-edges (e.g., dated assertions) is an open structural question.
- The semantics of self-loops.
  `see-also: [<own-slug>]` is currently a validation warning; whether it should be an error or admissible varies by relation.
