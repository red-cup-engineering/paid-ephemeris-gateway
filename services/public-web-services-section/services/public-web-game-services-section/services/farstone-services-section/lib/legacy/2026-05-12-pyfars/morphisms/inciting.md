---
type: morphism
class: workitem-initiation
status: draft
depends-on: [workitem, agent, intaking, witness]
---

# Inciting

The morphism by which a [workitem](../concepts/workitem.md) is initiated *from within the polity itself*.
Inciting is the polity's own act of starting work — a captain creating a new task, a process spawning a child workitem, an audit-finding inciting remediation.
Distinct from [intaking](intaking.md) (which receives work from outside the polity, e.g., an external request landing in the queue), inciting is internally-originated.

Inciting is to workitems what enacting is to decisions: both are deliberate acts of polity-internal generation, recorded as substrate witnesses.

## Action

For an agent $A$ inciting workitem $W$ at moment $\tau$:

$$\mathrm{inciting}_A \colon W \;\longrightarrow\; w_{A,W,\tau} + W\text{'s system cells}$$

— the substrate gains the new workitem (with its frontmatter, dependencies, status) and the inciting-witness recording $A$'s authorship.
Subsequent dispatching may then assign $W$ to capable agents.

## Inciting vs. intaking vs. dispatching

Three points in a workitem's lifecycle:

- **Intaking** — receiving a work-request from outside the polity; the substrate gains a request-cell, possibly to be turned into a workitem.
- **Inciting** — creating a workitem from within the polity, by deliberate authorship.
- **Dispatching** — assigning an existing workitem to an agent.

Inciting and intaking both *produce* workitems.
Dispatching *consumes* workitems (by assigning them).

## Inciting and authority

Inciting requires authority to create workitems of the relevant kind.
A captain can incite governance-level workitems; an officer can incite workitems within their action-domain; an automated process can incite child-workitems if its parent's authority transitively permits.
Inciting outside authority produces audit-rejected witnesses.

## Inciting and audit-findings

A common inciting-pattern: validation surfaces a finding; an authorized agent reads the finding; the agent incites a remediation-workitem.
The remediation's system-cells reference the originating finding-witness; the chain ("finding incited remediation incited dispatch incited execution") is reconstructible.

## What this morphism does not specify

- The schema of inciting-witnesses (per-workitem-kind currently).
- The discipline for revoking incited workitems (cancellation).
- Bulk inciting (when one act creates many child workitems) — currently per-workitem; aggregate inciting-witnesses are partly settled.
