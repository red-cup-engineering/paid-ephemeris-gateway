---
type: concept
class: agent-form
status: draft
depends-on: [agent, entity, personnel, witness]
---

# Officer

A first-class [agent](agent.md)-form: an entity that *holds an office* — a system-tracked incumbency relation between the entity and a named role with associated powers, duties, and capabilities.
Officers are the form by which authority is exercised in the polity.

Officer is the incumbency face of an office.
The office is the *role* (defined in `governance/offices/<slug>.md`); the officer is the *holder* during a particular incumbency.
Powers and duties attach to the office; the officer exercises them by virtue of holding the office.

## What distinguishes an officer

Per upstream office-as-double-settlement, an office's incumbency requires *both* recognition (the polity recognizes the candidate as eligible) and induction (the candidate is formally inducted into the office).
Both are system cells; both must be at $\mathbf{t}$ for the entity to be officer-of-that-office.

An officer's system state includes:

- **Held office** — `(officer, holds-office, office-slug) = t`.
  The incumbency relation.
- **Recognition** — `(polity, recognizes-as-eligible-for-office, officer)` (or equivalent).
  Per the personnel concept, recognition is a polity grant.
- **Induction** — `(office, inducted, officer) = t` (or equivalent).
  The formal induction.
- **Powers exercised** — derivative cells projected from the office's powers via incumbency.

## Officer vs. other agent-forms

- **Officer vs. personnel**: officers are typically (but not necessarily) personnel.
  An office may admit non-personnel officers in some polities (e.g., a guest office, a delegated officer).
  Most offices in 561 require personnel-status as a prerequisite.
- **Officer vs. persona**: officer is incumbency; persona is voice-identity.
  An entity may hold an office and operate a persona simultaneously, with each agent-form active in different contexts.
- **Officer vs. operational agent**: officer is the durable role; operational agents are dispatched against specific work-items.
  An office may dispatch work to operational agents (delegating); the officer remains accountable.

## Multiple incumbencies

An entity may hold *multiple* offices simultaneously, with each incumbency a separate system cell.
The captain (emsenn) holds three: command, engineering, science.
Each is its own incumbency; powers and duties from each compose.

When two offices' duties conflict, the resolution is per the polity's governance discipline (typically: the captain's office-of-command takes precedence, or a designated mediator settles).

## Officer in dispatch

For dispatch eligibility: - An office's `provides-skill: [...]
` cells declare what skills its incumbent can exercise. - When a workitem requires a skill, the dispatch closure walks office incumbents to find eligible officers. - The officer's authority for the workitem is bounded by the office's `deontic-profile`; an officer cannot exercise authority beyond what the office holds.

## Officer as one of the agent-forms

The captain's polity recognizes officer alongside [persona](persona.md), [personnel](personnel.md), and operational agents as distinct first-class agent-forms.
An entity may be all four simultaneously (the captain is).
The agent-form catalogue is the working framework; this concept names officer's role within it.

## What this concept does not yet specify

- Officer-rotation discipline.
  Some polities may rotate office incumbency through eligible candidates (per `rotational-authority` upstream pattern); the rotation discipline is partly upstream, partly polity-specific.
- Vacant offices.
  An office without a current officer has no incumbency cell at $\mathbf{t}$; what its workitems are dispatched to (or whether dispatch blocks) depends on policy.
- Acting officers.
  A temporary officer covering during a permanent officer's absence — the discipline is partly settled.
- Office-coalition (multiple officers jointly governing one office).
  Open.
