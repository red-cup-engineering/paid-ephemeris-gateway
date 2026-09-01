---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
effect: alias-propagation
realizes: [closure-rule]
depends-on: [office-record, predication-cell]
---

# Must aliases has-duty

Alias-normalization rule.
Records that author the live frontmatter shape (`must: [...]
` for office-deontic) project to `(office, must, action) = T` cells.
Downstream consumers — the boundary, the dispatch authorization check, audits — read the spec-shape predicate `has-duty`.
This rule propagates `must` cells to `has-duty`, so consumers see one canonical predicate regardless of which authoring shape the record used.

## Rule

```yaml
rule:
  free-vars: [O, A]
  forall-vars: []
  antecedent:
    cell: { predicate: must, subject: O, object: A, threshold: T }
  consequent:
    cell: { predicate: has-duty, subject: O, object: A, threshold: T }
```

## Symmetric pair

The reverse direction (`has-duty` ⟹ `must`) is *not* derived.
Records that author with the spec-shape `has-duty:` directly do not carry a `must:` cell.
Consumers should always read `has-duty`; `must` is treated as the live-shape input to this normalization.
