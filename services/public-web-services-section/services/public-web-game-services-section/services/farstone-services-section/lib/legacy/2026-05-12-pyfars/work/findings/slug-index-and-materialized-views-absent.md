---
title: "SlugIndex and materialized-view infrastructure are defined in theory but absent from the implementation"
type: finding
status: open
observed: [code-read-query-store-2026-05-14]
expected: corpus-as-flatfile
variance: "corpus-as-flatfile defines SlugIndex as part of the corpus tuple; materialized-view-record names pyfars.runtime.views as its implementation; neither exists"
cause-configuration:
  - phased-refactor-stopped-before-index-layer
  - query-module-has-no-secondary-indexes
scope: double-loop
severity: high
contained-by: store-performance-review-2026-05-14
responds-to-via: []
---

# SlugIndex and materialized-view infrastructure — absent from implementation

## Observed

`pyfars/kernel/query.py` — every structural query is a full linear scan:

```python
def subjects_of_type(store, types):
    type_set = set(types)
    return {
        s for (s, p, o) in t_cells(store)   # scans every cell
        if p == "type" and o in type_set
    }
```

`t_cells()` itself iterates every key in `store._values`.
There are no secondary indexes of any kind: no type→subjects map, no predicate→cells map, no slug→path map.

`pyfars.runtime.views` does not exist.
The module path named in `materialized-view-record.md` as the implementation location (`implementation: pyfars.runtime.views`) is absent from the package.

## Expected

**From `corpus-as-flatfile.md`:**

> $\mathrm{Corpus}_F = (\mathrm{Root},\; \mathrm{Tree},\; \mathrm{Notes},\; \mathrm{SlugIndex},\; \mathrm{Conventions})$ $\mathrm{SlugIndex}$ is the (slug → path) map computed by walking $\mathrm{Tree}$ and reading each note's filename.

The `SlugIndex` is not optional decoration — it is part of the *definition* of a corpus-as-flatfile.
Every slug lookup in the system should route through it.
Currently slug lookups either do a full store scan or re-walk the filesystem.

**From `materialized-view-record.md`:**

> A materialized-view record is a cached, content-addressed projection — a view computed from base system cells, stored at a filesystem location named by the canonical hash of the cells it projects from, refreshed as a closure-rule firing when the base hash changes.
> This is the morphism that keeps materialized views correct-by-construction … direct prior art for OpenClaw QMD's BM25+vectors+reranking index.

Materialized views are the designed answer for: - Type-keyed indexes (`type → [subjects]`) used by dispatch - Skill/agent trigger indexes used by selection - BM25+vectors corpus retrieval for RAG-bearing agents

The `refresh-policy: on-quiescence` shape means the index is rebuilt after each closure fixpoint and cached as a content-addressed file under `.pyfars/views/`.
Subsequent reads hit the cache, not the live store.

**From `refreshing-materialized-view.md`:**

The refresh trigger is itself a closure rule: when a view's recorded `base-hash` differs from the current `closure-state-hash` over its scope, the morphism fires, re-projects, writes a new content-addressed file, and updates the `base-hash` cell.
Views cannot drift from substrate state because the closure machinery enforces freshness.

## Variance

Two things are specified but not implemented:

1. **`SlugIndex`** — the slug→path map that should be the primary identity index over the corpus.
  Every `load_one(cls, store, slug)` call and every path-to-subject resolution that currently re-walks the filesystem should route through this.

2. **`pyfars.runtime.views` / materialized-view refresh** — the module and the closure rule that would make structural queries (type-keyed lookups, skill trigger indexes, etc.) O(1) cache hits rather than O(n) full store scans.

## Cause configuration

- **Phased refactor stopped before the index layer.** The `2026-05-10-pyfars-substrate-cell-store-refactor` plan correctly eliminated the parallel `parse_X`/`discover_X` paths (Phase 1) and rewired consumers through `load_one` (Phase 2).
  But the plan's ambient law describes `load_one(cls, store, slug, by_slug=substrate.by_slug)` — a `by_slug` argument that implies the slug→path index exists.
  That index was not built.
- **Query module has no secondary indexes.** `query.py` was written as a pure functional layer over the flat `_values` dict.
  It correctly expresses what each query means.
  It does not build or consult any index structure, making every query O(n) regardless of store size.

## Single-loop vs double-loop

**Double-loop.** The plan (`corpus-as-flatfile`, `materialized-view-record`, the refactor plan's `by_slug` reference) was clear about what the index layer should be.
The execution of the refactor did not get there.
Adjusting the plan is not what closes this — implementing the specified infrastructure is.

## Adjustment hooks

Two sequential adjustments are needed:

1. **Build SlugIndex during `extract_tree`** — during the corpus walk, maintain a `slug → path` dict alongside the cell store.
  Expose it on `System` so `load_one` can resolve slugs to paths without re-scanning `store._values`.
  This is O(0) overhead on an already-O(n) walk.

2. **Implement `pyfars.runtime.views` and at least one materialized view** — starting with a type-keyed index (`type → [subjects]`) as the simplest case.
  Author a `governance/views/type-index.md` materialized-view record, implement the projection rule, wire the refresh closure rule.
  This makes `subjects_of_type()` an O(1) cache read after the first tick.

The vector/semantic case (`BM25+vectors+reranking` per `materialized-view-record.md`) is downstream of these two and belongs to M4+.
