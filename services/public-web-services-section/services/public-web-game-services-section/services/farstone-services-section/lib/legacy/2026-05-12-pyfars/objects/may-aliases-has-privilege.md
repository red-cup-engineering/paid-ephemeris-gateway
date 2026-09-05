---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
effect: alias-propagation
realizes: [closure-rule]
depends-on: [office-record, predication-cell]
---

# May aliases has-privilege

Alias-normalization rule.
Records that author the live frontmatter shape (`may: [...]
` for office-deontic) project to `(office, may, action) = T` cells.
The spec-shape predicate is `has-privilege`.
This rule normalizes `may` to `has-privilege` so consumers read one canonical predicate.

## Rule

```yaml
rule:
  free-vars: [O, A]
  forall-vars: []
  antecedent:
    cell: { predicate: may, subject: O, object: A, threshold: T }
  consequent:
    cell: { predicate: has-privilege, subject: O, object: A, threshold: T }
```

Pair with [`must-aliases-has-duty`](must-aliases-has-duty.md) and [`must-not-aliases-has-duty-not`](must-not-aliases-has-duty-not.md).
