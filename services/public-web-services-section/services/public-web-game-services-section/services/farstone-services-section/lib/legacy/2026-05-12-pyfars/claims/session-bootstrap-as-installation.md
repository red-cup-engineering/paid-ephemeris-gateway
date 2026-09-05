---
type: claim
status: sketch
authored: 2026-05-09
authored-under-cycle: 2026-05-09-session-bootstrap-as-installation
theory-basis:
  - office-as-double-settlement
  - incumbent
  - installation
  - delegation
  - delegation-as-authority-residuation
  - capability-fiber-bundle
  - predicate-specialization
  - settling-monotonicity
informed-by-survey: ../work/surveys/session-as-incumbent-from-predgov-and-predcat.md
---

# Session-bootstrap-as-installation

A Claude Code session entering a polity becomes a substrate-bound office incumbent through a felicitous installation increment fired by the SessionStart hook.
The office's deontic profile then transfers to the new incumbency proposition by the standard PredGov capability-propagation rule, and the harness's `.claude/skills/` and `.claude/agents/` projection at install-time is the predicate-specialization morphism applied to the office's action-domain.

## The claim

Let $\mathcal{P}$ be a polity with charter $\mathcal{C}$.
Let `personnel:emsenn` (the captain) hold $R^P_{\mathrm{install}}$ — the standing power to install Claude sessions into a default office, conferred by the charter as the base case of the authority recursion (per [`installation.md`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/morphisms/installation.md) §"Composition with charter and authority chains").
Let $A_\mathrm{installer}$ be the captain's delegated session-installer subroutine — a substrate entity holding $R^B_{\mathrm{install}} \subsetneq R^P_{\mathrm{install}}$ via the captain's delegation per [`delegation.md`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/morphisms/delegation.md).
Let $O_\mathrm{default}$ be the office named by the harness install configuration (default `office:pyfars-executive-officer` for the captain's interactive sessions, per the goal record's "Substrate parameters this goal assumes").

**Claim 1 (bootstrap-as-installation).** *The SessionStart hook firing at stage $\tau_\mathrm{boot}$ is a felicitous installation increment* $I^+(A_\mathrm{installer}, \iota_\mathrm{session}, O_\mathrm{default}, \tau_\mathrm{boot})$ *per [`installation.md`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/morphisms/installation.md), where $\iota_\mathrm{session}$ is the new session-record (incumbency proposition) authored by the hook handler.
The three felicity conditions hold by construction:* - *(authority) $A_\mathrm{installer}$ holds $R^B_{\mathrm{install}}$ on `install-into-O_default` via captain-delegation; the residuation table's row 2 admits the increment.* - *(procedure) The substrate's `installation-form-of` cell for $O_\mathrm{default}$ is the SessionStart hook handler's standard procedure; the cell is settled at $\mathbf{t}$ for any office whose installation procedure has been registered with the harness.* - *(completeness) The four installation cells are populated by the hook handler from the hook event payload + harness install config.*

**Claim 2 (capability-propagation).** *Joint dignitas of $\iota_\mathrm{session}$ on the recognition and induction predicates triggers the [capability-propagation rule](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/operations-settling.md): each jural-relation $R_i$ with $\langle R_i, \texttt{active-holder}, O_\mathrm{default}\rangle = \mathbf{t}$ produces a corresponding $R_i^{\iota_\mathrm{session}}$ with $\langle R_i^{\iota_\mathrm{session}}, \texttt{active-holder}, \iota_\mathrm{session}\rangle = \mathbf{t}$.
The session's substrate-readable authority is the office's deontic profile, automatically — no per-call lookup, no caching strategy needed beyond the standard fiber-algebra reads.*

**Claim 3 (skill-projection-as-predicate-specialization).** *The harness install operation `pyfars install-harness claude-code-skills --office=O_default` reads the office record's `delegable-skills:` cell (the slug-list naming the sub-scope $G \subsetneq A_O$ of the office's action-domain $A_O$) and projects to `.claude/skills/` exactly the substrate skill records corresponding to the slugs in $G$.
This projection is the [predicate-specialization morphism](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-specialization.md) $\pi^*$ applied to the harness's projection layer: the office's full action-domain $A_O$ pulled back along $\pi: G \hookrightarrow A_O$ gives the in-scope skill set.
Symmetric for `delegable-sub-agents:` and `.claude/agents/`.*

## What the three claims jointly buy

When all three claims are settled, the captain's stated bootstrap experience is reachable: - (Claim 1) The session is bound to an office by a substrate-readable installation witness. - (Claim 2) The session has the office's authority via standard PredGov machinery, not via per-tool-call config. - (Claim 3) The `.claude/` surface the session sees is exactly the office's delegable scope, projected in by predicate-specialization at install-time.

## Sketch (for sketch → draft promotion)

**Claim 1** follows from `installation.md`'s definition once the captain's delegation to $A_\mathrm{installer}$ is settled: the felicity conditions are checked by the standard installation closure rule, and `delegation-as-authority-residuation` row 2 admits derived grants of the install-power.
The substantive substrate work is asserting the captain's standing delegation cell once at polity-bootstrap, not per session-start.

**Claim 2** is direct application of the capability-propagation rule from `office-as-double-settlement.md` §"Connection to capability fiber bundle" — no new substrate machinery.
The implementation work is making the propagation observable to MCP read tools (so `read_assignment(session_id)` can surface the propagated cells).

**Claim 3** uses predicate-specialization's $\pi^*$ as a *projection rule* — $A_O$ is the projection input, $G$ (named by the office record's `delegable-skills:` cell) is the sub-scope, the harness install command's behavior is the $\pi^*$-image.
The closure-rule formalization mirrors what `delegation-as-authority-residuation` does for runtime delegation: same residuation, but applied at install-time to the projection surface rather than at call-time to authority gates.

## What this claim does not assert

- **The MCP authority gate's runtime enforcement** — separate spec `session-mcp-authority-gate` lands the contract; its closure-rule implementation is a follow-on cycle.
- **Sub-session delegation gating** — Phase 5 of the goal; relies on this claim plus the `closure-2-monad`'s lax-idempotence applied recursively.
- **Outcome-witnessed-close** — Phase 4; orthogonal cycle.
- **The actual installation procedure registration mechanism** — the spec `session-bootstrap-installation` names the cell shape (`installation-form-of`) but the procedure-authoring DSL is implementation choice, not substrate commitment.

## Status

`sketch` because: - The captain's standing delegation to $A_\mathrm{installer}$ — the substrate cell asserting this — has not been authored in the polity.
Phase C of the implementation roadmap authors it as part of office:pyfars-executive-officer's enrichment. - The `installation-form-of` cell for `office:pyfars-executive-officer` has not been authored.
Phase C authors it. - The closure rules implementing capability-propagation and the predicate-specialization-as-projection at install-time are not yet authored in [closure-rule-language](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule-language.md).
Promotion to `draft` requires their authoring.

The structural content — that session-bootstrap *is* an installation increment, capability propagation is the standard PredGov rule, skill projection is predicate-specialization — is settled.
