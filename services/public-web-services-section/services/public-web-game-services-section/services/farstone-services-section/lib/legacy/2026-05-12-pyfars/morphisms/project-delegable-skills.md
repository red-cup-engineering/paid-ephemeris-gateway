---
type: morphism
status: draft
class: install-time-projection
authored: 2026-05-09
authored-under-cycle: 2026-05-09-session-bootstrap-as-installation
derives-from-claim: session-bootstrap-as-installation
theory-basis:
  - office-as-double-settlement
  - delegable-scope
  - predicate-specialization
  - delegation-as-authority-residuation
regime: strict
purity: install-time-projection
---

# Project delegable skills

The morphism that the harness install command applies at install-time to project an office's [delegable scope](../concepts/delegable-scope.md) to the harness surface (`.claude/skills/`, `.claude/agents/`).
It is the [predicate-specialization morphism](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-specialization.md) $\pi^*$ applied to the harness's projection layer with the office's `delegable-skills:` slug-list as the sub-scope $G$.

## Definition

Let $O$ be an office with action-domain $A_O$ and delegable scope $G \subsetneq A_O$ named by `O.delegable-skills:` (slug list).
Let $\mathrm{Proj}_\mathrm{harness}: A_O \to \mathrm{HarnessSurface}$ be the projection rule that, given a substrate skill or agent slug, writes the corresponding `.claude/skills/<slug>.md` or `.claude/agents/<slug>.md` file.
Then `project-delegable-skills` is

$$\mathrm{Proj}_\mathrm{harness}|_G \;=\; \pi^* \circ \mathrm{Proj}_\mathrm{harness}$$

where $\pi: G \hookrightarrow A_O$ is the [predicate-specialization](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-specialization.md) inclusion.
Concretely: the install command iterates over $O.\texttt{delegable-skills}$ (resp. $O.\texttt{delegable-sub-agents}$), looks up each system record, and projects it to `.claude/`.
Slugs absent from the office's delegable scope are *not* projected, even if they exist in `governance/skills/` (resp.
`agents/`).

## Why predicate-specialization, not just iteration

The morphism's substrate-algebraic content is the predicate-specialization adjunction $\exists_\pi^t \dashv \pi^* \dashv \forall_\pi^t$ — same machinery as [`jurisdiction-as-base-change`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/jurisdiction-as-base-change.md) uses for jurisdictional restriction.
The reindexing $\pi^*$ takes the polity's full skill/agent set to its restriction to the office's delegable scope.
By the BC-transport theorem of [`delegation-transport-via-beck-chevalley`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-transport-via-beck-chevalley.md), this projection commutes with sub-delegation: projecting the parent's $G_O$ then taking a sub-office's $G_\mathrm{sub} \subseteq G_O$ agrees with taking $G_\mathrm{sub}$ first then projecting.

## Premise

For an install operation `pyfars install-harness claude-code-skills --office=O`: - $O$ is a system-resident office record. - $O.\texttt{delegable-skills}$ is a slug-list cell at $\mathbf{t}$ (possibly empty list).

For `pyfars install-harness claude-code-agents --office=O`: - $O.\texttt{delegable-sub-agents}$ is a slug-list cell at $\mathbf{t}$ (possibly empty list).

## Conclusion

For each slug $s$ in $O.\texttt{delegable-skills}$: - A system record exists at `governance/skills/<s>.md` (or wherever the polity registers skills). - The install command writes `.claude/skills/<s>.md` whose content is a projection of the system record (the install command's existing per-skill projection rule).

For each slug $s$ in $O.\texttt{delegable-sub-agents}$: - A system record exists at `agents/<s>.md` (or wherever the polity registers agents). - The install command writes `.claude/agents/<s>.md` whose content is a projection of the system record.

Slugs *not* in $O.\texttt{delegable-skills}$/$O.\texttt{delegable-sub-agents}$ produce *no* file in `.claude/skills/` or `.claude/agents/`.
Files from a prior install for a different office are removed (the install is a *replacement* projection, not an additive merge).

## Composition with capability-propagation

This morphism fires at *install-time* (run of `pyfars install-harness ...
`), not at session-bootstrap.
It determines which skill/agent records the session's runtime sees in `.claude/`.
The session's *authority* to invoke a skill is separate — that comes from [`propagate-office-deontic-profile-to-session`](propagate-office-deontic-profile-to-session.md) firing at SessionStart.

The two morphisms are coupled but distinct: - **`project-delegable-skills`** decides which skills are *visible* in the harness surface. - **`propagate-office-deontic-profile-to-session`** decides which authorities the session *holds*.

A skill that is visible (projected to `.claude/`) but for which the session lacks authority (because the office did not include the skill's underlying jural-relation in its deontic profile) cannot be invoked successfully — the MCP authority gate (Phase 2 deferred component) blocks.
In practice, the office's `delegable-skills` should be a sub-scope of the office's deontic profile; a polity that violates this is asking the harness to expose skills the session can't use.

## Idempotence

The morphism is idempotent: re-running `pyfars install-harness claude-code-skills --office=O` twice produces the same `.claude/` state.
(Per the install command's existing replacement-projection semantics.)

## Status

`draft` for the same reason as the companion morphism: the closure-rule formalization is informal.
The `Proj_harness|_G` factorization is precise; the formal closure-rule-language statement is the promotion gate to `proved`.
