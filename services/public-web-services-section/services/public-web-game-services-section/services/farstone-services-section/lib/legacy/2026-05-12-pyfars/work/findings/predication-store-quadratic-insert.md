---
title: "PredicationStore.from_cells() and merge() copy the full dict on every insertion — O(n²) store build"
type: finding
status: actioned
observed: [code-read-pypredcalc-store-2026-05-14]
expected: corpus-as-flatfile
variance: "store build is O(n²) in cell count; corpus-as-flatfile's SlugIndex is defined as a map computed by walking the tree — implies O(n) construction"
cause-configuration:
  - frozen-dataclass-copy-on-write-applied-naively
  - from-cells-delegates-to-insert-loop
  - no-batch-build-path
scope: single-loop
severity: high
contained-by: store-performance-review-2026-05-14
responds-to-via: [fix-from-cells-build-dict-directly]
---

# PredicationStore.from_cells() and merge() — O(n²) store build

## Observed

`pypredcalc/predication/store.py`:

```python
@classmethod
def from_cells(cls, cells):
    store = cls.empty()
    for cell in cells:
        store = store.insert(cell)   # copies entire dict each time
    return store

def merge(self, other):
    result = self
    for cell in other.cells():
        result = result.insert(cell) # copies entire dict each time
    return result
```

`pyfars/kernel/store.py` — both `from_scopes()` and `from_root()`:

```python
raw = PredicationStore.empty()
for cell in extract_tree(...):
    raw = raw.insert(cell)           # same pattern, in the system loader
```

`pyfars/programs/load_directory.py`:

```python
for cell in cells:
    store = store.insert(cell)       # same pattern
```

`insert()` calls `dict(self._values)` — a full copy — on every call.
With N cells the store build performs N full copies of a growing dict: O(1 + 2 + … + N) = O(n²).

On the 561 workspace (several thousand cells), this is the reason `pyfars run` does not complete in practice.

## Expected

`corpus-as-flatfile.md` defines the corpus as including a `SlugIndex` — "(slug → path) map computed by walking the tree."
A map "computed by walking the tree" implies O(n) construction, not O(n²).
The flat-dict store should be buildable in a single pass.

## Variance

Actual store build cost is O(n²).
Expected is O(n).
The workspace does not load.

## Cause configuration

- **Frozen dataclass copy-on-write applied naively.** `PredicationStore` is `frozen=True` for correctness (immutable value semantics between fixpoint iterations).
  The immutability is correct for closure-rule application; the mistake is applying it to the *build* phase as well, where the store is being constructed for the first time and immutability buys nothing.
- **`from_cells()` delegates to `insert()` loop.** A classmethod named `from_cells` whose job is to construct a store from a batch of cells should build the dict directly.
  Instead it delegates to the per-cell `insert()` path which was designed for single-cell updates after the store exists.
- **No batch-build path.** The API had `empty()` + `insert()` (per-cell) and `from_cells()` (which was the same thing).
  No path built the underlying dict without copying.

## Adjustment

Fixed in commit on 2026-05-14.
Changes:

1. `pypredcalc/predication/store.py` — `from_cells()` now builds the values dict directly in one pass; `merge()` does the same without calling `insert()` in a loop.
2. `pyfars/kernel/store.py` — both `from_scopes()` and `from_root()` now call `PredicationStore.from_cells(extract_tree(...))
  ` instead of the insert loop.
3. `pyfars/programs/load_directory.py` — collects all cells into a list first, then calls `from_cells()` once.

230 tests passed after the fix.
