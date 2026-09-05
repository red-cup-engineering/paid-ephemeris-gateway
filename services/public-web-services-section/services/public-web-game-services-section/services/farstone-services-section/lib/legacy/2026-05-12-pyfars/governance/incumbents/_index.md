---
title: "Incumbents"
type: index
status: active
realizes: [incumbent]
---


A formal tuple recording that a particular agent currently holds a particular office at a particular history.
An incumbent is the quadruple $\mathrm{Inc} = (O, \tau^*, a, \iota)$ — the office, the current stage, the occupant, and the incumbency proposition asserting *$a$ holds $O$ at $\tau^*$*.

## Why first-class

PyFARS authors office records under `governance/offices/` (`pyfars-executive-officer.md`, etc.).
What's currently implicit: **who currently occupies each office**.
This information lives in agent records' `serves-as:` fields or in conversation context, not as a substrate fact.

The body politic / body natural distinction (per Kantorowicz) requires both: - The office is the **body politic** — its normative structure (powers, duties, jurisdiction) persists across all stages, regardless of who occupies it. - The occupant is the **body natural** — a substrate entity (typically an agent or persona record) indexed to the current stage.

An incumbent record is the **bridge**.
It carries the `(office, stage, occupant)` tuple plus the joint-settlement of the two required predicates: *institution* (authority conferred) and *induction* (corporeal possession entered).

## When to author one

- A new agent or persona is installed in an office (write the incumbent record at installation).
- An office is filled by multiple agents over time (each installation produces a new incumbent record; prior records get a `succeeded-by:` pointer).
- A vacancy needs to be substrate-visible (write an incumbent record with `vacancy: true` and no occupant).

## Frontmatter

```yaml
---
title: "<occupant> as <office> from <date>"
type: incumbent
slug: <office-slug>--<occupant-slug>--<start-date>     # composite slug to disambiguate successions
status: instituted | inducted | full | retired         # joint-settlement state
office: <office-slug>
occupant: <agent-or-persona-slug>                      # may be absent if vacancy
instituted-at: <ISO-timestamp>                         # past-settling axis: authority conferred
inducted-at: <ISO-timestamp>                           # forward-stable axis: possession entered
relieved-at: <ISO-timestamp>                           # when retired
relieved-by: <authority-or-power-slug>                 # by whose authority retired
succeeds: <prior-incumbent-slug>                       # the predecessor incumbent
succeeded-by: <next-incumbent-slug>                    # populated when next is installed
vacancy: false                                          # true when no occupant; office has structural cells but no body-natural
---
```

## Body sections

```markdown
## Institution
The act conferring authority — appointment by the captain, election, charter
provision. Cite the authorizing power or decision.

## Induction
The act of entering corporeal possession — the agent's first dispatch under
the office, the registration in the substrate, the first witness emitted as
this office.

## Joint-settlement state
- `instituted-only`: authority conferred, possession not yet entered (vacancy filled in principle, not in practice)
- `inducted-only`: possession entered, authority not yet conferred (de facto, not de jure)
- `full`: both predicates at affirming settlement; full incumbency

## Powers and duties active under this incumbency
The jural relations that attach to *this* occupant via the office's authority
during this stage. Not the office's structural cells (those are stage-invariant) —
the cells that carry the occupant's identity in the active-holder slot.
```

## Joint-settlement of two predicates

Per the [predgov incumbent](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/incumbent.md) object, full incumbency requires both predicates at $\mathbf{t}$:

- **Institution** — authority conferred.
  Past-settling axis: the appointment is recognized.
- **Induction** — possession entered.
  Forward-stable axis: the occupant is present in every continuation of $\tau^*$.

This is identical in shape to the office-as-double-settlement two-required-predicates structure, applied here at the incumbent-quadruple granularity rather than the office granularity.

## Succession instantaneity

When the previous incumbent's incumbency proposition retires (e.g., $\langle \iota, \texttt{relieved-by}, A\rangle = \mathbf{t}$) and a new incumbency proposition $\iota'$ is admitted by [installation](../transitions/_index.md), the office's structural cells are unchanged.
The "instantaneous succession" — the body politic passes — is the substrate-algebraic fact that the office's deontic profile transfers to whichever $\iota$ currently has both required predicates at $\mathbf{t}$.
There is no waiting for the office's structural cells to be re-settled because they were never un-settled. *Dignitas non moritur*.

## Theory grounding

- [Predgov incumbent](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/incumbent.md) — formal quadruple definition.
- [Office-as-double-settlement](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/office-as-double-settlement.md) — same two-axis joint-settlement structure at the office level.
- [Officer object](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/officer.md) — the occupant view: the natural-person bearing the office's authority.

## Related

- [Offices](../offices/) — the body politic; structural cells stage-invariant
- [Personnel](../personnel/) — the body natural occupants
- [Jural relations](../jural-relations/_index.md) — attached to the office; activated by incumbency
- [Powers](../powers/) — operative on the active-holder cell which the incumbency populates
