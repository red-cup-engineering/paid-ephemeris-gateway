---
name: "Authoring a jural relation record"
description: "Creates a jural-relation record in governance/jural-relations/ encoding a single Hohfeldian relation (power, duty, privilege, immunity) with its correlative passive partner. Use after a norm has been authored that generates the relation, or when grounding a power/duty record's correlative pairing."
---


## Requirements

- A norm, charter clause, or decision exists that grounds the relation's authority.
- The active-holder, scope-action, and correlative passive-party are all namable substrate entities.
- The relation's `kind:` is one of `power`, `duty`, `privilege`, or `immunity` (Hohfeld 1913).

## Steps

1. Read [`governance/jural-relations/_index.md`](../jural-relations/_index.md) for the correlative-pairing table and the frontmatter schema.
2. Identify the relation's correlative pair from the Hohfeldian table:
   - power ↔ liability
   - duty ↔ claim-right
   - privilege ↔ no-right
   - immunity ↔ disability
3. Author frontmatter with `type: jural-relation`, `kind:`, `slug:`, `active-holder:`, `passive-party:`, `scope-action:`, `triggering-powers:` (for duties), `required-action:` (for duties), `enforcement:`, `rule-type:` (N→N, N→O, O→N, or O→O), `theory-basis:`.
4. Author the body: a paragraph naming the relation, its correlative pair, and its position in the Hohfeldian octave; a section on enforcement mechanism; a section on the closure-rule realization if one exists.
5. **For powers**: ensure a corresponding skill record exists or is queued for the action the power enables; add a `enables-skills:` cell to the frontmatter.
6. **For duties**: ensure the duty's `triggering-powers:` reference power records that exist; add the duty slug to each triggering power's attached-duties list.
7. Add to the appropriate index: powers go in [`governance/powers/_index.md`](../powers/_index.md); duties in [`governance/duties/_index.md`](../duties/_index.md); jural-relations not specialized as either go in [`governance/jural-relations/_index.md`](../jural-relations/_index.md).

## Outcomes

A new file in [`governance/powers/`](../powers/), [`governance/duties/`](../duties/), or [`governance/jural-relations/`](../jural-relations/) with the correlative-pair settled, indexed, and (for duties) linked to triggering powers.

## Discipline notes

- **Powers and duties are jural-relations specializations** per the [`governance-records-use-jural-relation-schema`](../decisions/) decision.
  They live in their own directories for ergonomic access, but they share the schema.
  Don't duplicate frontmatter shape between the schemas.
- **Per [`link-to-records-not-shortcodes`](../duties/link-to-records-not-shortcodes.md)**, references to active-holder offices and triggering-power records use markdown links, not bare slugs in body prose.
- **Avoid orphan privileges and immunities.** A privilege without a corresponding no-right correlative is substrate-incomplete.
  A `kind: privilege` record must name the no-right party explicitly.
