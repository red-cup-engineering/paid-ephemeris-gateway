---
name: "Authoring a norm record"
description: "Creates a norm record in governance/norms/ encoding a deontic-operator-bearing rule of conduct as a closure-rule subsystem. Use when the substrate carries a rule of conduct that fires repeatedly, isn't pinned to one office (use a duty record then), and isn't charter-tier."
---


## Requirements

- The rule is *not* a [duty](../duties/_index.md) (subject is not a specific office), *not* a [convention](../conventions.md) (no closure rule fires), *not* a [decision](../decisions/) (the act is settled, the rule of conduct continues), and *not* charter-tier (it doesn't constitute the polity).
- The rule has an authority-grounding traceable to charter, a power-grant, or another active norm.
  Without a grounding, the norm has no substrate-algebraic force.
- An identifying triple $(\varphi, O, N)$ is namable: propositional content, deontic operator (Obl/Per/Proh), and the normative system within which it operates.

## Steps

1. Read [`governance/norms/_index.md`](../norms/_index.md) for the full frontmatter schema and the four invariants.
2. Author frontmatter with `type: norm`, `deontic-operator:`, `propositional-content:`, `operative-in:`, `subject:` (omit for universal norms), `closure-rule:`, `violation-witness:`, `authority-grounding:`.
3. Author body sections per the index template: *What this norm requires*, *When it fires*, *Authority grounding*, *Closure-rule realization*, *Hohfeldian relations generated*, *Validity vs truth*.
4. **Generate the correlative jural-relations** that the norm produces on subjects, per [`authoring-a-jural-relation-record`](authoring-a-jural-relation-record.md).
  An obligation generates a `kind: duty` jural relation per subject; a permission generates a privilege; a prohibition generates a no-right.
5. Add the norm slug to [`governance/norms/_index.md`](../norms/_index.md)'s "Active norms" list (if such a list exists; otherwise the norm is discoverable by directory enumeration).

## Outcomes

A new file in [`governance/norms/`](../norms/) with `type: norm` and a substantive frontmatter triple.
The norm's closure-rule realization is implementable; its violation-witness is detectable; its Hohfeldian-generated jural-relations exist as substrate-readable records.

## Discipline notes

- **A norm is not a label.** Per [`every-dispatch-must-witness-rsv-hash`](../norms/every-dispatch-must-witness-rsv-hash.md), a norm names a *rule of conduct*, not a checklist item or a value-statement.
  If the candidate cannot be expressed as a triple $(\varphi, O, N)$, it isn't a norm — author a [convention](../conventions.md) entry instead.
- **Validity ≠ compliance.** A valid norm whose subjects don't comply produces violation-witness cells while remaining valid.
  Don't retract a norm because its subjects are violating it; that's policy-conflation.
- **Conflict between Obl(φ) and Proh(φ) drives cells to ⊤.** Audit existing norms before authoring a new one; if a candidate norm's content directly conflicts with an active one, raise the conflict to the steward via [`escalate-degeneration-to-steward`](../duties/escalate-degeneration-to-steward.md).
