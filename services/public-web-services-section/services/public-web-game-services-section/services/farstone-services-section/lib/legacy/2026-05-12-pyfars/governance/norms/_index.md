---
title: "Norms"
type: index
status: active
realizes: [norm]
---


The unit of which a normative system is composed.
A norm is a triple $\mathcal{N} = (\varphi, O, N)$ — a propositional content $\varphi$, a deontic operator $O \in \{\mathrm{Obl}, \mathrm{Per}, \mathrm{Proh}\}$, and a normative system $N$ within which the norm is operative.

## Norms vs. charter, conventions, decisions, duties

| Record kind | What it carries | Relationship to norms |
|---|---|---|
| `charter.md` | The polity's binding vision; hard-core commitments (C1-C5) | The charter authorizes the normative system $N$ in which norms are operative; charter is *meta* to norms |
| `conventions.md` | Folkways: "we name skills as gerunds", record schemas | Conventions are *guidance*, not norms — no closure rule fires from a violation |
| `governance/decisions/` | Settled engineering or operational positions | Decisions may *create* norms (e.g., "every dispatch must witness its inputs"), but a decision is the act, not the rule |
| `governance/duties/` | Obligations on a specific office | Duties are norms whose `propositional-content` is an action and whose `subject` is a specific office; they're a *specialization* of norms |
| `governance/powers/` | What an office may admit | Powers are not norms — they're the action-side of jural relations whose duty-correlate is a norm |
| `governance/norms/` | **General rules of conduct that fire as closure rules** | First-class — distinct from any of the above |

The reason norms are first-class: many rules of conduct in PyFARS aren't pinned to one office, aren't charter-tier, aren't single decisions, and aren't framed as actions an office takes.
Examples:

- "Every workitem must cite a goal."
- "Every dispatch must produce a witness with `rsv_hash`."
- "Substrate writes outside the canonical event-log path are prohibited."
- "Replay-determinism is required: same inputs produce same outputs."

These are **rules**, not policies, conventions, or decisions.
They fire as closure rules; their substrate-algebraic form is exactly a norm $\mathcal{N}$.

## Frontmatter

```yaml
---
title: "<the rule, in one declarative sentence>"
type: norm
slug: <kebab-case>
status: proposed | active | suspended | retired
deontic-operator: Obl | Per | Proh                    # obligation / permission / prohibition
propositional-content: <cell-pattern-or-prose>        # what the norm prescribes
operative-in: <normative-system-or-charter-clause>    # which system gives this force
antecedent: <cell-pattern>                            # if conditional ("if ψ then Obl(φ)")
subject: <office-slug-or-agent-class>                 # who is bound (omit for universal norms)
closure-rule: <rule-slug>                             # the closure rule that realizes this norm
violation-witness: <cell-spec>                        # what gets emitted on violation
authority-grounding: <power-slug-or-charter-clause>   # what gives the norm its force
---
```

## Body sections

```markdown
## What this norm requires/prohibits/permits
A precise statement. State the propositional content and deontic operator
together: "It is OBLIGATORY that every dispatch witness its inputs with rsv_hash."

## When it fires (antecedent)
For conditional norms, what condition activates the deontic operator.

## Authority grounding
Which charter clause, decision, or power-grant authorizes this norm. A norm
without an authority grounding has no substrate-algebraic force.

## Closure-rule realization
| Operator | Closure-rule shape |
|---|---|
| `Obl(φ)` | ψ ⟹ each cell in φ at ≥_k t. Failure leaves cells at ⊥, which an auditing rule detects as breach. |
| `Per(φ)` | No closure rule fires *against* φ. Permission is the absence of a Proh(φ) rule. |
| `Proh(φ)` | ψ ∧ (each cell in φ at t) ⟹ violation cell at t. |

## Hohfeldian relations generated
What jural-relations this norm generates on subjects (duty, claim-right) and
their correlatives. Cite or create `governance/jural-relations/` records.

## Validity vs. truth
A norm is *valid* (in force) or *invalid*; it is not true or false. Validity is
the joint-settlement state of recognition and forward-binding predicates.
```

## The four invariants

Per the predgov [norm](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/norm.md) object:

1. **Independence from compliance.** A norm's substrate cells persist regardless of whether its prescribed content is being asserted.
  Violation produces violation-witness cells while the rule persists.
2. **Authority-derived force.** The norm's force derives from the operative-in system's authority grounding.
  Without a grounded authority, no closure rule fires.
3. **Deontic consistency.** A normative system containing both $\mathrm{Obl}(\varphi)$ and $\mathrm{Proh}(\varphi)$ rules drives any cell in $\varphi$ to $\top$ — internal-conflict state.
  Avoid this.
4. **Hohfeldian-relations generation.** An operative obligation produces a [jural-relation](../jural-relations/_index.md) of `kind: duty` for each subject, with correlative claim-rights.

## Theory grounding

- [Predgov norm](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/norm.md) — formal definition.
- [Charter-as-closure-system](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/charter-as-closure-system.md) — charter is the meta-rule system that authorizes operative norms.
- [Normative-operational-layering](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/normative-operational-layering.md) — O→N rule produces duty cells from operational acts.

## Related

- [Charter](../charter.md) — authorizes the normative system
- [Duties](../duties/) — duties are subject-bound norms
- [Jural relations](../jural-relations/_index.md) — what norms generate on subjects
- [Conventions](../conventions.md) — guidance, not norms
