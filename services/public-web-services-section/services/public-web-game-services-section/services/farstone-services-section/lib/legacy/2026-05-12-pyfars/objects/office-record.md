---
type: definition
class: system-entity
status: draft
realizes: [office-record, office-as-fuzzy-cell]
depends-on: [predication-cell, jsonl-event-log, dispatch-closure-rule-system, eligibility-by-jurisdiction]
implementation: pyfars.governance.office
---

# Office record

The PyFARS-realization of upstream [office-record](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/office-record.md): a markdown file under `governance/offices/<slug>.md` whose frontmatter binds the office's authority-scope, duty-set, right-set, and held-by-personnel as system cells.
Realizes [`office-as-fuzzy-cell`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/office-as-fuzzy-cell.md): the office's authority is bilattice-valued, not boolean.

An office is *what an agent can do under what conditions* — the jural relations attached to a role.
Personnel are *installed into* offices via the holds(personnel, office) cell; the office's authority is what the personnel inherits while the installation cell holds.

## Markdown shape

```markdown
---
slug: pyfars-records-officer
type: office-record
authority-scope: [governance/, work/]
duty-set: [maintain-roadmap-enrichment-discipline, link-to-records-not-shortcodes]
right-set: [create-governance-record, modify-governance-record, create-work-record]
provides-skill: [creating-records-officer-records]
incumbent: emsenn
charter-binding: charter#C2-records-discipline
---

# Office body

Description of the office's purpose, the kind of work it does, the boundaries
with adjacent offices. Read by personnel installed into the office and by the
dispatch graph at authorization-check time.
```

## Cells

An office record's frontmatter projects to:

- `(slug, type, "office-record") = t`
- `(slug, authority-scope, <path-pattern>) = t` — one cell per scope path
- `(slug, has-duty, <duty-slug>) = t` — one cell per duty
- `(slug, has-right, <right-slug>) = t` — one cell per right
- `(slug, provides-skill, <skill-slug>) = t` — one cell per skill the office's incumbent can invoke
- `(slug, holds, <personnel-slug>) = t` — one cell per current incumbent
- `(slug, charter-binding, <charter-clause>) = t` — what the office derives its authority from

## Authority as bilattice cell

Per [office-as-fuzzy-cell](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/office-as-fuzzy-cell.md), the office's authority for a specific action is bilattice-valued:

- $t$ — office holds the authority; agent under the office can perform the action.
- $f$ — office explicitly denies the authority; agent cannot perform the action.
- $\bot$ — authorization is unsettled (e.g., novel action not yet adjudicated).
- $\top$ — authorization is contested (rules conflict on whether this office holds the authority).

The dispatch's authorization check reads `(office, can-perform, action)` cells, treating $\bot$ as deny-by-default and $\top$ as hard-stop (escalate to charter-binding adjudication, do not let the work proceed).

## Read by dispatch authorization

For a workitem $W$ requiring action $\alpha$ on substrate scope $\sigma$:

$$\big((O, \texttt{authority-scope}, \sigma') = \mathbf{t}\big) \wedge (\sigma \subseteq \sigma') \wedge \big((O, \texttt{can-perform}, \alpha) = \mathbf{t}\big) \;\Longrightarrow\; (W, \texttt{eligible-by-office}, O) = \mathbf{t}$$

— a workitem is office-eligible when an office's authority-scope contains its target scope and the office can perform the required action.
[`eligibility-by-jurisdiction`](eligibility-by-jurisdiction.md) realizes the scope-containment check; office-action checks combine with it.

## Mid-tick installation, mid-tick effective

An office record authored or modified mid-tick takes effect on the next tick (per the same per-tick re-load discipline that makes [skill-record](skill-record.md)s mid-tick-dispatchable).
Installing a new incumbent is a single cell-write `(office-slug, holds, personnel-slug) = t`; the next tick's dispatch sees the new incumbent and routes accordingly.

## Discussion

Offices are *not* groups, teams, or job titles in any HR sense.
They are jural-relation bundles — collections of duties, rights, and authority-scopes that an installed personnel holds for the duration of the installation cell.
A single personnel can be installed into many offices simultaneously; an office can have many incumbents simultaneously; offices can be created, dissolved, and re-scoped by editing the substrate (per the [pyfars-steward](../governance/offices/pyfars-steward.md) office's `create-office` and `dissolve-office` powers).

The office record's load-bearing realization choice is that all four jural relations (power, privilege, duty, immunity per Hohfeld) project to system cells — power is `has-right` cells, duty is `has-duty` cells, privilege is `has-right` with no correlate-duty cell, immunity is the absence of a `liability-to` cell.
This lets the system's closure-rule machinery enforce the jural relations directly, without a separate authorization engine.
