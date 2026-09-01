---
type: example
kind: math
status: draft
authored: 2026-05-09
authored-under-cycle: 2026-05-09-session-bootstrap-as-installation
realizes-claim: session-bootstrap-as-installation
exercises:
  - project-delegable-skills
  - delegable-scope
---

# Project delegable skills — XO office

Concrete predicate-specialization computation for `office:pyfars-executive-officer`'s install-time skill projection.
Demonstrates Claim 3 (skill-projection-as-predicate-specialization) of [`session-bootstrap-as-installation`](../claims/session-bootstrap-as-installation.md).

## Substrate state

The polity carries:

- The XO office record at `governance/offices/pyfars-executive-officer.md` with frontmatter:

  ```yaml
  delegable-skills:
    - applying-roadmap-enrichment
    - authoring-a-question
    - authoring-realization-claim
    - authoring-objects-and-morphisms-from-claim
    - authoring-math-examples
    - authoring-a-specification
    - authoring-a-finding-record
    - authoring-an-observation-record
    - authoring-tests
    - authoring-code-examples
    - promoting-task-horizons
  delegable-sub-agents:
    - researcher
    - theory-researcher
    - doc-updater
    - librarian
    - operations-officer
    - harness-optimizer
  ```

- Substrate skill records at `governance/skills/<slug>.md` for ~33 distinct slugs (the full set the polity has authored to date).
- Substrate agent records at `agents/<slug>.md` for ~30 distinct slugs (`architect`, `cartographer`, `librarian`, etc.).

The polity's full action-domain $A_O$ for the XO office is the union of all skills and sub-agents the office *could in principle* govern (in practice, all skills and agents in the polity).

## Computation

The harness install command `pyfars install-harness claude-code-skills --office=pyfars-executive-officer` reads $G = O.\texttt{delegable-skills}$ — an 11-slug list.
The morphism [`project-delegable-skills`](../morphisms/project-delegable-skills.md) computes $\pi^* \circ \mathrm{Proj}_\mathrm{harness}$:

For each slug $s \in G$: 1.
Look up `governance/skills/<s>.md`; verify it exists.
2.
Project to `.claude/skills/<s>.md` via the existing per-skill projection rule.

Slugs absent from $G$ (e.g., `auditing-derivation-chain-governance`, `consulting-predwork-theory`, `deriving-pyfars-development-goals`, etc., which are also in `governance/skills/` but not in the XO office's delegable scope) produce **no** file in `.claude/skills/`.

Symmetric for `pyfars install-harness claude-code-agents --office=pyfars-executive-officer`: from a polity inventory of ~30 agents, only the 6 named in `delegable-sub-agents:` get projected to `.claude/agents/`.
Agents the XO does not delegate (e.g., `codi`, `diviner`, `predicated-sociologist`, `rust-build-resolver`) are absent from the projected harness surface.

## Resulting `.claude/` state (post-install)

```
.claude/
├── skills/
│   ├── applying-roadmap-enrichment.md
│   ├── authoring-a-finding-record.md
│   ├── authoring-a-question.md
│   ├── authoring-a-specification.md
│   ├── authoring-an-observation-record.md
│   ├── authoring-code-examples.md
│   ├── authoring-math-examples.md
│   ├── authoring-objects-and-morphisms-from-claim.md
│   ├── authoring-realization-claim.md
│   ├── authoring-tests.md
│   └── promoting-task-horizons.md
├── agents/
│   ├── doc-updater.md
│   ├── harness-optimizer.md
│   ├── librarian.md
│   ├── operations-officer.md
│   ├── researcher.md
│   └── theory-researcher.md
├── hooks/...        # unchanged by skill/agent projection
└── settings.json    # unchanged
```

11 skills + 6 agents — the XO's delegable scope, projected.

## Predicate-specialization commutativity

The morphism's BC commutativity (per [`delegation-transport-via-beck-chevalley`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-transport-via-beck-chevalley.md)): if a sub-office $O_\mathrm{narrower}$ has $G_\mathrm{narrower} \subseteq G_O$ (e.g., $G_\mathrm{narrower} = \{\texttt{authoring-a-question}, \texttt{authoring-realization-claim}\}$ — just the cycle-startup skills), then projecting $O_\mathrm{narrower}$ produces a 2-skill `.claude/skills/` — and this projection agrees with first-projecting $O$ then sub-restricting to $G_\mathrm{narrower}$.
The two-step procedure commutes by BC.

This commutativity is what makes sub-session dispatch principled: the parent's installer can project the parent's $G_O$ once, then a sub-session with $G_\mathrm{sub} \subsetneq G_O$ can be projected by sub-restricting in place.

## Falsifiability

The example fails if:

- A skill listed in `delegable-skills:` does not have a corresponding substrate record at `governance/skills/<slug>.md`.
  Symptom: the install command emits a warning or fails; the projected `.claude/skills/` is incomplete relative to the office's declared scope.
- An agent listed in `delegable-sub-agents:` does not have a corresponding substrate record at `agents/<slug>.md`.
  Symptom: same as above for `.claude/agents/`.
- The install command projects skills *not* in `delegable-skills:`.
  Symptom: `.claude/skills/` carries skills the office does not authorize; the projection is not the predicate-specialization $\pi^*$ but a wider operation; Claim 3 is refuted on this implementation.

## What this example earns

Concretely shows that the captain's stated "XO skills, not other skills" experience is the predicate-specialization morphism applied at install-time.
The 11-skill / 6-agent projection is the substrate-algebraic realization of that experience; once the install lands (Phase D), the next `claude` start sees exactly this surface.
