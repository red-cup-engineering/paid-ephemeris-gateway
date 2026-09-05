---
type: concept
status: draft
authored: 2026-05-09
authored-under-cycle: 2026-05-09-session-bootstrap-as-installation
derives-from-claim: session-bootstrap-as-installation
theory-basis:
  - office-as-double-settlement
  - delegation
  - delegation-as-authority-residuation
  - delegation-transport-via-beck-chevalley
  - predicate-specialization
---

# Delegable scope

The proper sub-scope $G \subsetneq A_O$ of an [office](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/office-as-double-settlement.md)'s action-domain $A_O$ that the office is permitted to delegate to its incumbents and to sub-incumbencies.
The delegable scope is named on the office record as `delegable-skills:` and `delegable-sub-agents:` slug-list cells; the inclusion $\pi: G \hookrightarrow A_O$ is the [predicate-specialization morphism](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-specialization.md) that the system's authority-gate closure rules check at delegation-time.

## Why a distinct envelope

PredGov's [`delegation-as-authority-residuation`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-as-authority-residuation.md) requires every delegation grant $G$ to satisfy $G \subsetneq X$ where $X$ is the principal's full scope.
The boundedness invariant is structural — silence in the principal's authority cell ($a = \bot$) cannot generate a $\mathbf{t}$-valued derived grant by any mechanism (row-1 of the residuation table).
The $G = X$ degenerate case is treated as *abdication*, not delegation (per the strict-specialization criterion of [`delegation-transport-via-beck-chevalley`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-transport-via-beck-chevalley.md) §"abdication-vs-delegation criterion").

Therefore: an office's full action-domain $A_O$ is not automatically the delegable scope.
The office must declare which sub-scope $G$ it is willing to pass to incumbents and sub-incumbencies.
Without an explicit `delegable-skills:` declaration, the default is **empty** — no skills delegable.
This matches the residuation-table's row-1 refusal of silent-authority delegation and makes office-authoring discipline match the substrate-algebraic requirement.

## Cell pattern

An office record $O$ carries:

```yaml
# Required to declare a non-empty delegable scope.
delegable-skills:
  - skill:applying-roadmap-enrichment
  - skill:authoring-a-finding-record
  # ...slug list naming the in-scope skill records.

delegable-sub-agents:
  - agent:researcher
  - agent:doc-updater
  # ...slug list naming the in-scope sub-agent records.
```

Each slug references a system record (under `governance/skills/` for skill slugs; under `agents/` for sub-agent slugs).
The slug-list IS the sub-scope $G$.
The system's $A_O$ is implicitly the union of all skill-slugs and sub-agent-slugs the office's `provides-capability` section transitively admits; in practice, $A_O$ equals "all skills and sub-agents in the polity" as the practical upper bound, and `delegable-skills`/`delegable-sub-agents` is the proper sub-scope $G$.

## Recursive delegation

Per [`delegation-transport-via-beck-chevalley`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-transport-via-beck-chevalley.md): sub-delegation produces $\mathrm{dom}(R^C) \subseteq \mathrm{dom}(R^B) \subseteq \mathrm{dom}(R^P)$, bounded by the predicate-specialization composition.
For sessions:

- Parent session is bound to office $O$ with delegable scope $G_O$.
- Parent session delegates to sub-session, which is bound to a sub-office $O_\mathrm{sub}$ with $G_{O_\mathrm{sub}} \subseteq G_O$.
- Sub-sub-session (if any) bound to $O_\mathrm{sub-sub}$ with $G_{O_\mathrm{sub-sub}} \subseteq G_{O_\mathrm{sub}}$.

The strict regime's $\kappa < \omega$ guarantees finite termination; the strict-specialization criterion at each step ensures each sub-grant is genuinely narrower (not abdication-equivalent).

## Use sites

- **Harness install** (`pyfars install-harness claude-code-skills --office=O`): reads $G_O = O.\texttt{delegable-skills}$ and projects the corresponding skill records to `.claude/skills/`.
  The morphism [`project-delegable-skills`](../morphisms/project-delegable-skills.md) is the formal closure rule.
- **Sub-session dispatch**: when a parent session calls `Agent(...)
  `, the substrate authors a sub-incumbency whose office's `delegable-skills:` is computed from the parent's $G_O$ minus any explicitly-narrowed sub-grant.
  The strict-specialization criterion enforces $G_\mathrm{sub} \subsetneq G_O$.
- **MCP authority gate**: when a session attempts an MCP write to a target outside its bound office's $G_O$, the residuation gate $\rho_a g$ blocks per row-2 of the residuation table; an `ultra-vires` witness lands.

## Resolution of an open question

The cycle's authoring of this concept resolves the operational portion of [`delegable-powers-distinct-from-full-powers`](../../questions/delegable-powers-distinct-from-full-powers.md): the delegable envelope is a frontmatter slug-list cell, default empty, with the four delegation invariants forced by the residuation table.
Once the spec [`office-delegable-scope`](../../governance/specifications/office-delegable-scope.md) lands and the closure rule that consumes the cells is implemented (Phase D of the implementation roadmap), the question can be retired.
