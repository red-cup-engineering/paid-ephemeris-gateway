---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
effect: alias-propagation
realizes: [closure-rule]
depends-on: [office-record, predication-cell]
---

# Must-not aliases has-duty-not

Alias-normalization rule.
Live records use `must-not: [...]
` to express prohibitions; the spec-shape predicate is `has-duty-not` (the prohibition-as-duty form).
This rule normalizes `must-not` to `has-duty-not`.

## Rule

```yaml
rule:
  free-vars: [O, A]
  forall-vars: []
  antecedent:
    cell: { predicate: must-not, subject: O, object: A, threshold: T }
  consequent:
    cell: { predicate: has-duty-not, subject: O, object: A, threshold: T }
```

Pair with [`must-aliases-has-duty`](must-aliases-has-duty.md) and [`may-aliases-has-privilege`](may-aliases-has-privilege.md).
