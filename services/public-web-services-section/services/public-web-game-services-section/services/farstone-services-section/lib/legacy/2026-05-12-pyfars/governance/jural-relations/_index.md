---
title: "Jural relations"
type: index
status: active
realizes: [jural-relation, power, duty, privilege, immunity]
---


A jural relation is a substrate entity representing a single Hohfeldian (1913) relation between agents — a power, duty, privilege, or immunity — together with its structural data and its correlative partner.
Treating jural relations as first-class entities (rather than as multi-cell encodings spread across several predicates) keeps the predicate-category at a manageable size and exposes the correlative pairing as a substrate-readable relation.

## Why first-class

PyFARS already authors `governance/powers/` and `governance/duties/` as separate record kinds.
What's missing: the **correlative pairing** between them.

Per Hohfeld, every active jural relation has a correlative passive partner:

| Active kind | Correlative passive |
|---|---|
| power | liability |
| duty | claim/right |
| privilege | no-right |
| immunity | disability |

A power record at `governance/powers/dispatch-task-to-office.md` *implies* a liability somewhere — but the correlative is currently invisible to the substrate.
Same for duties: a duty on the executive officer implies a claim-right somewhere (typically the captain's).
The substrate doesn't know who the claim-holder is unless we record it.

A jural-relation record makes the pair explicit: one record, two cells (active-holder and passive-party), one scope-action, one correlative pointer.
This is what lets the substrate audit "every power has a corresponding duty of accountability" as a closure rule.

## Frontmatter

```yaml
---
title: "<active-kind>: <active-holder> over <passive-party> regarding <scope-action>"
type: jural-relation
slug: <kebab-case>
status: proposed | active | revoked | expired
kind: power | duty | privilege | immunity            # the active position
active-holder: <agent-or-office-slug>                # who holds the power/duty/etc.
passive-party: <agent-or-office-slug>                # the correlative party
scope-action: <action-or-substrate-operation>        # what the relation regards
correlate-of: <jural-relation-slug>                  # the correlative partner record
authority-grounding: <power-slug-or-charter-clause>  # what gives this force
norm-source: <norm-slug>                             # the norm that generated this (if any)
revoked-at: <ISO-timestamp>                          # if revoked
expires-at: <ISO-timestamp>                          # if time-bounded
---
```

## Body sections

```markdown
## What this relation is
One paragraph: who holds what, against whom, regarding what action.

## Authority grounding
The charter clause, decision, norm, or power-grant that creates this relation.
A jural relation without an authority grounding has no substrate force.

## Correlative pair
The correlative-of slug, and what makes them paired (predicate-converse plus
kind-rename per Hohfeld).

## Closure-rule consequences
What rules fire on the cells of this relation. For powers: what acts the
active-holder may admit. For duties: what acts the active-holder must perform
(an Obl(action) on the active-holder).
```

## Predicate-converse structure

Per the [predgov jural-relation](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jural-relation.md) object: the swap of active-holder and passive-party is exactly the predicate-converse on a fictional 2-place predicate `holds-jural-relation-with`.
The kind-rename (`power` ↔ `liability`) is a predicate-specialization.
Together, `correlate-of` is a fixed composition of these two existing predicate-category generators — **not** a new generator.

This is why a jural-relation record can express its correlate via `correlate-of: <slug>` without creating duplicate cells: the converse is self-adjoint in both bilattice orders, so the active-side and passive-side views of the same fact carry exactly the same information up to relabeling.

## Klein-four orbit

The bilattice's Klein-four group acts on jural-relation cells:

- **Negation $\sim$**: maps a duty at $\mathbf{t}$ ("$A$ owes $X$") to its denial.
- **Conflation $-$**: maps no-information to contested.
- **Double $\sim\circ-$**: a known duty maps to a contested denial.

The Klein-four action combined with `correlate-of` recovers Hohfeld's full octuple structure (power, liability, no-power, immunity; duty, claim, privilege, no-claim) as the group orbit of any starting kind.

## CALM-stable jural-relation queries

Settled cells comprising a jural relation are $\leq_k$-monotone once at $\mathbf{t}$.
Confirming "does $A$ bear duty $R^D$ with scope-action $X$?" is **coordination-free**.
Confirming "$A$ does *not* bear the duty" requires coordination — it's the absence of a positive cell.
This gives distributed governance monitoring a CALM-stable foundation.

## Theory grounding

- [Predgov jural-relation](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jural-relation.md) — formal definition.
- [Correlate-of morphism](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/morphisms/correlate-of.md) — predicate-converse + specialization composition.
- [Predicate-converse-quantifier-adjoints theorem](../../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/predicate-converse-quantifier-adjoints.md) — the mathematical content of self-adjointness.

## Related

- [Powers](../powers/) — the active-side records (power-kind specifically)
- [Duties](../duties/) — the active-side records (duty-kind specifically)
- [Norms](../norms/_index.md) — norms generate jural relations on subjects
- [Incumbents](../incumbents/_index.md) — incumbencies attach jural relations to specific occupants
