---
type: definition
class: system-entity
status: draft
realizes: [closure-rule, closure-rule-language]
depends-on: [predication-cell, dispatch-closure-rule-system]
implementation: pyfars.substrate.rule_language
---

# Rule record

A system-resident closure rule: a markdown file under `objects/<rule-slug>.md` whose frontmatter declares the rule's quantifier structure and whose body's `rule:` block carries the antecedent / consequent in a positive Boolean cell-atom language.
Loaded into a `pypredcalc.predication.
FiberClosureRule[int]` over the boolean twist (the FOUR-isomorphic base) and grounded against the live `PredicationStore` via `pypredcalc.ground_rule`.

A rule record is also its own *authorizer*: presence of the file at `objects/<slug>.md` activates the rule for the polity; removing the file deactivates it.
The polity decides which rules run by curating its `objects/` set.

## Markdown shape

```markdown
---
type: closure-rule-record
slug: eligibility-by-capabilities
status: active
regime: strict
effect: subset-cover-positive
common-knowledge-grade: knowledge
realizes: [scheduling-policy, dispatch-closure-rule-system]
depends-on: [predication-cell, work-record]
---

# Eligibility by capabilities

(human-readable description, mathematical statement, etc.)

## Rule

```yaml
rule:
  free-vars: [W, D, C]
  forall-vars: []
  antecedent:
    and:
      - cell: { predicate: type, subject: W, object: workitem, threshold: T }
      - cell: { predicate: type, subject: D, object: office,   threshold: T }
      - cell: { predicate: requires-capabilities, subject: W, object: C, threshold: T }
      - cell: { predicate: provides-capabilities, subject: D, object: C, threshold: T }
  consequent:
    cell: { predicate: eligible-by-capabilities, subject: W, object: D, threshold: T }
```
```

## YAML rule grammar

The `rule:` block is the canonical authored form.
Loader: [`pyfars.substrate.rule_language`](../src/pyfars/substrate/rule_language.py).

### Top level

```yaml
rule:
  free-vars: [<var>, ...]      # entity vars instantiated per firing
  forall-vars: [<var>, ...]    # entity vars universally bound at antecedent eval
  antecedent: <formula>
  consequent: <cell-atom>      # consequent vars must be drawn from free-vars
```

### Formula nodes

```yaml
# Cell atom — one ((subject, predicate, object), threshold) condition.
cell:
  predicate: <hashable>
  subject:   <var-or-const>
  object:    <var-or-const>
  threshold: T | F | BOT | TOP

# Conjunction.
and:
  - <formula>
  - <formula>
  ...

# Disjunction. Lowered to multiple grounded rules via DNF expansion.
or:
  - <formula>
  - <formula>
  ...

# Fusion atom (twist-product fusion antecedent, truth-order threshold).
fusion:
  predicate-a: <hashable>
  subject-a:   <var-or-const>
  object-a:    <var-or-const>
  predicate-b: <hashable>
  subject-b:   <var-or-const>
  object-b:    <var-or-const>
  threshold:   T | F | BOT | TOP
```

### Variable terms

A bare string is interpreted as a `Var(name)` if it appears in `free-vars` or `forall-vars`; otherwise as a `Const(string)`.
To force a constant whose name shadows a variable, wrap as `{const: <value>}`.

### Threshold values

The threshold names map to `pypredcalc.
BilatticeValue` via the canonical `2^⋈ ≅ FOUR` encoding:

| name  | twist | FOUR |
|-------|-------|------|
| `T`   | (1,0) | T    |
| `F`   | (0,1) | F    |
| `BOT` | (0,0) | ⊥    |
| `TOP` | (1,1) | ⊤    |

A consequent `threshold: F` emits an `F`-valued cell on firing — the disqualification pattern.
A consequent `threshold: T` emits a `T`-valued cell — the positive pattern.
Two rules emitting `T` and `F` on the same cell knowledge-join to `⊤`, surfacing the contradiction (per `PredicationStore.insert`).

## Cells projected by a rule record

A `closure-rule-record` file at `objects/<slug>.md` projects the following cells when loaded by `pyfars.substrate.load.polity`:

- `(slug, type, "closure-rule-record") = T`
- `(slug, status, <status>) = T` (active / draft / deprecated)
- `(slug, regime, <regime>) = T` (strict / scott-continuous / transfinite-bounded / aperiodic)
- `(slug, effect, <effect>) = T` (subset-cover-positive / disqualification-negative / …)
- `(slug, realizes, <upstream>) = T` per upstream concept
- `(slug, depends-on, <prior>) = T` per prior record

The `rule:` body block is *not* projected as cells — it is interpreted by the rule-language loader, not by the markdown-frontmatter projector.

## Discovery and activation

`pyfars.runtime.eligibility_rules.discover_active_rules(root)` walks the polity's `objects/` directories and returns every record whose `type: closure-rule-record` cell is present.
Each discovered record is loaded into a `FiberClosureRule` via the rule-language loader; at apply time, every active rule is grounded against the current store via `pypredcalc.ground_rule(rule, entities)` and the resulting `StoreRule` list is fed to `pypredcalc.
StoreClosureRuleSystem` for fixed-point iteration.

## Two rule shapes

Positive Boolean closure cannot express subset-cover or disqualification (set inclusion needs negation, which a positive language lacks).
PyFARS supports two rule-record shapes:

1. **Inline `rule:` block.** The fully-explicit fiber-closure-rule documented above — uniform across the carrier, expressible as a positive Boolean formula.
  Used for alias-normalization rules like `must` → `has-duty`, propagation rules, and other per-cell derivations.

2. **Named `shape:` reference.** The record declares `shape: <name>` in its frontmatter and carries parameters as additional frontmatter cells.
  The grounder looks up the shape's instantiator in `pyfars.runtime.eligibility_rules.
  NAMED_SHAPES` and calls it with the store and the record's parameters.
  Used for subset-cover-positive (eligibility-by-capabilities, etc.) and disqualification-negative (eligibility-by-rate-limit, etc.).

Both shapes are first-class system records; the polity activates either by carrying its `objects/<slug>.md` file.
The named-shape registry is a small fixed set of patterns (subset-cover-positive, disqualification-negative, selection-by-load); polities that need a new pattern add it to the registry alongside the rule record.

Removing an `objects/<slug>.md` record removes the rule from the polity's active set on the next discovery pass.

## Regime classification

Per the four-regime dichotomy:

- `forall-vars: []` → **strict** (Scott-continuous, finite closure ordinal).
- `forall-vars: [...]
  ` over a finite carrier → still strict (the ∀-block expands at grounding time into a finite conjunction).
- `forall-vars: [...]
  ` over an infinite carrier → **∀-blocked**; the grounder cannot enumerate, the closure may be transfinite-bounded or aperiodic.
  PyFARS rejects discovery of such rules at load time (the polity's entity carrier is always finite).

## Discussion

The rule record is the system's *only* authoritative rule format — the runtime carries no Python-side rule registry.
This keeps the polity's logic editable by editing markdown, surfaces the rule set in the same audit / closure / search infrastructure that handles every other substrate object, and lets the same closure-rule-system theorem (replay determinism, federation portability, regime classification) cover both the rules themselves and the cells they emit.
