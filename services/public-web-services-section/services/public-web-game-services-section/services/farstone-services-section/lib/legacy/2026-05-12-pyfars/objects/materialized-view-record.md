---
type: definition
class: system-entity
status: draft
realizes: [projection, resource]
depends-on: [predication-cell, closure-state-hash, dispatch-closure-rule-system, projection]
implementation: pyfars.runtime.views
---

# Materialized-view record

A substrate-cell projection of a *cached, content-addressed projection* — a view computed from base system cells, stored at a filesystem location named by the canonical hash of the cells it projects from, refreshed as a closure-rule firing when the base hash changes.

Materialized views are how PyFARS realizes "fast-read derived state without violating substrate-purity."
The view is *derived* (so it adds no canonical state) and *content-addressed* (so its filesystem name proves which system state it projects).
A read of a materialized view is a system-state read at the canonical-form level: equal `closure_state_hash` over the projected scope means equal view content.

This object is the system-resident realization of the materialized-view-at-quiescence pattern from the [substrate-algebra question](../questions/substrate-algebra-closure-and-replay.md), and is direct prior art for OpenClaw QMD's BM25+vectors+reranking index (a materialized view over the corpus refreshed at quiescence).

## Markdown shape

A materialized-view record lives at `governance/views/<slug>.md` and projects:

```markdown
---
type: materialized-view-record
slug: skill-index-by-trigger
projects-from-scope:
  - governance/skills/
  - governance/agents/
projection-rule: pyfars.views.skill_trigger_index
refresh-policy: on-quiescence    # on-quiescence | per-tick | on-demand
backing-path: .pyfars/views/skill-index-by-trigger.<base-hash>.json
stale-tolerance: zero            # zero | n-ticks | wall-clock-window
---
```

## Cells

A materialized-view record's frontmatter projects:

- `(slug, type, "materialized-view-record") = t`
- `(slug, projects-from-scope, <path>) = t` — one cell per scope path.
- `(slug, projection-rule, <rule-name>) = t`
- `(slug, refresh-policy, <policy>) = t`
- `(slug, base-hash, <hex>) = t` — current closure-state-hash over `projects-from-scope`.
  Updated at each refresh.
- `(slug, backing-path, <path>) = t` — filesystem location of the cached projection.
- `(slug, stale-tolerance, <policy>) = t`

When `(slug, base-hash, <H>)` changes (because the underlying scope's system state changed), the [`refreshing-materialized-view`](../morphisms/refreshing-materialized-view.md) closure rule fires and rewrites the backing path's content.

## Content-addressing discipline

The backing path embeds the base hash in the filename: `…/<slug>.<base-hash>.json`.
Two consequences:

1. **Old views are not overwritten** — refreshing produces a *new* file; the old file remains until garbage-collected.
  A reader holding the old base-hash can still read the consistent old view.
2. **Verification is filename-local** — the reader checks `(slug, base-hash, <H>) = t` matches the filename's hash; mismatch is a `guard`-channel cell.

Garbage collection runs at audit boundaries: views whose `base-hash` does not appear in any active reader's read-set may be removed.

## Refresh policies

Three policies determine *when* refresh fires:

- **`on-quiescence`** (default) — refresh fires when the closure-runner reaches a fixed point and the projected-from scope's `closure-state-hash` differs from the view's recorded base-hash.
  Aligns with the substrate-algebra: the view is correct precisely when the substrate is in algebra-equation state.
- **`per-tick`** — refresh fires unconditionally each tick.
  Cheaper to reason about; may waste work when scope is unchanged.
- **`on-demand`** — refresh fires only when a reader requests the view and the recorded base-hash does not match scope-current.
  Lazy; introduces tail-latency on first read.

## What this object commits to

1. **Views add no canonical state.** The system state's canonical form is unchanged by adding or removing a view; the view is purely a read-optimization.
  Removing a view's record and backing path leaves the substrate intact.
2. **Refresh is closure-rule-driven.** The runner, not application code, decides when to refresh.
  Views cannot self-refresh; this is what makes the refresh discipline auditable.
3. **Stale reads are bounded.** Per the `stale-tolerance` field, the substrate carries an explicit policy for how stale a read may be.
  `zero` (the default for closure-firing-relevant views) means readers wait for refresh before reading; `n-ticks` allows reads of a view up to N ticks old.

## Engineering uses

- **Skill index** (above example) — fast lookup by trigger description for the dispatch graph's selection step.
- **QMD-style BM25+vectors** — corpus retrieval index for RAG-bearing agents.
  The index is a materialized view; refresh on quiescence aligns with OpenClaw's index-rebuild discipline.
- **Roadmap-by-status view** — milestone records bucketed by status, used by the M17 governance app's tasks-app view.
- **Federation peer-status view** — most-recent envelope hash and sync-time per peer, used by the federation cycle to skip up-to-date peers.

## What this object does not specify

- Whether the projection rule's body lives in code (`pyfars.views.<name>`) or as a system-resident closure rule.
  Currently code-resident; making projection rules system-cells is the next consistency step (and would be load-bearing for [M19](../work/milestones/m19-self-developing-pyfars.md)'s self-development discipline).
- The discipline for views that *aggregate* across federation.
  A polity-wide view aggregating per-peer cells must merge before projecting; the merge-then-project vs project-then-merge order matters for non-distributive projection rules.
  Open for [M6](../work/milestones/m6-federation.md).
- Multi-base-hash views (a view that depends on multiple disjoint scopes).
  Currently the base-hash is a single hash; for multi-scope views it is the SHA-256 of the concatenation of the per-scope hashes in canonical order.
