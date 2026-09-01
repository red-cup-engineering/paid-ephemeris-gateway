---
type: survey
title: "Session-as-incumbent: applying PredGov + PredWork (and PredCat where they're incomplete) to the Claude-session-binds-to-office problem"
status: synthesized
authored: 2026-05-09
authored-by: pyfars-executive-officer--claude-opus-4-7--2026-04
informs:
  - claude-as-pyfars-runtime  # goal; specifically Phases 2 and 5
  - delegable-powers-distinct-from-full-powers  # open question; partially resolved here
references-theories:
  - predicated-governance  # office-as-double-settlement, installation, delegation, jurisdiction, jural-relation
  - predicated-work  # assignment, dispatch, witness-as-increment, capability-fiber-bundle
  - predication-categories  # closure-2-monad, predicate-specialization, right-residuation-operator, twist-product-right-residual
prior-art-cited:
  - theories/.../predicated-governance/objects/office-as-double-settlement.md
  - theories/.../predicated-governance/objects/incumbent.md
  - theories/.../predicated-governance/objects/officer.md
  - theories/.../predicated-governance/objects/jural-relation.md
  - theories/.../predicated-governance/objects/jurisdiction.md
  - theories/.../predicated-governance/morphisms/installation.md
  - theories/.../predicated-governance/morphisms/delegation.md
  - theories/.../predicated-governance/morphisms/assignment.md
  - theories/.../predicated-governance/theorems/delegation-as-authority-residuation.md
  - theories/.../predicated-governance/theorems/delegation-transport-via-beck-chevalley.md
  - theories/.../predicated-governance/theorems/jurisdiction-as-base-change.md
  - theories/.../predicated-governance/theorems/military-command-chain-as-modal-composition.md
  - theories/.../predicated-governance/theorems/charter-as-closure-system.md
  - theories/.../predicated-work/objects/assignment.md
  - theories/.../predicated-work/morphisms/dispatch.md
  - theories/.../predication-categories/morphisms/closure-2-monad.md
---


## Frame

The captain's stated bootstrap experience for the next `claude` invocation is: prompted as XO, told the next work, given context, scoped to XO skills only, with writes mediated through MCP.
[`claude-as-pyfars-runtime`](../goals/claude-as-pyfars-runtime.md) Phase 2 names this as "session bound to office" but anchors it loosely.
PredGov already carries a developed model of binding-into-office (installation, incumbency, capability propagation); PredWork carries the work-routing side (assignment-to-office, dispatch, witness-as-increment); the gaps PredGov+PredWork leave open are the kind PredCat resolves directly via residuation, predicate-specialization, and the closure-2-monad's lax-idempotence.
This survey records the mapping and identifies the substrate work that should be commissioned to make the Phase 2 cycle land cleanly.

## The mapping

A Claude session binding to an office is, on the substrate:

| Operational concept | PredGov/PredWork object | What it is, formally |
|---|---|---|
| The Claude session's identity (model, transport, parent) | **Officer** $a$ | A substrate entity in $E_{\mathrm{op}}$ whose cells declare its identity. Per `officer.md`, the natural-person view of the incumbent — the body natural. The session is the body natural; it is mortal/ephemeral. |
| The session-record file | **Incumbency proposition** $\iota$ | A substrate entity carrying cells $\langle\iota,\texttt{occupant},a\rangle$, $\langle\iota,\texttt{office},O\rangle$, $\langle\iota,\texttt{at-stage},\tau^*\rangle$ per `incumbent.md`. |
| The office the session is bound to | **Office** $O$ | The double-settlement entity per `office-as-double-settlement.md`: structural cells (normative-structure, action-domain, deontic-profile-actions) plus two required predicates (recognition, induction). The body politic. |
| `SessionStart` hook firing | **Installation morphism** $I^+(A,\iota,O,\tau)$ | The constitutive increment per `installation.md`: drives the recognition predicate's cell $\langle\iota,\texttt{recognized-as-incumbent-of},O\rangle$ toward $\mathbf{t}$. Felicity-checked by closure rule (appropriate authority, appropriate procedure, completeness). |
| First user prompt / session reaches "ready" | **Induction** (stage-2) | Drives $\langle\iota,\texttt{inducted-into},O\rangle$ toward $\mathbf{t}$. Joint affirming settlement of both required predicates is **dignitas** — full incumbency. |
| The session "having authority" | **Capability propagation** | Per `office-as-double-settlement.md` §"Connection to capability fiber bundle": when dignitas settles, the office's deontic profile (its jural-relations with `active-holder: O`) transfers to $\iota$ — generating mirror cells with `active-holder: \iota`. The session inherits the office's powers/duties/privileges/immunities **automatically** from substrate state, not from a per-call lookup. |
| MCP write authority gate | **Authority-gate via residuation** | Per `delegation-as-authority-residuation.md` and the underlying `right-residuation-operator`: each MCP write is gated by $\rho_a g = a \Rightarrow g$, with $a$ the office's authority cell over the action and $g$ the candidate write payload. Out-of-scope writes return a **failure-witness** (the `ultra-vires` cell from `jurisdiction-as-base-change.md` (d)). |
| Workitem bound to the office (not the session) | **Assignment** | Per PredWork's `assignment.md`: assignment is its own substrate entity with `to-office: O`, NOT a predicate on the task and NOT directly to the session. The session, *qua* office's incumbent, picks up assignments by walking the office's in-edges on `to-office`. **The session never owns work; the office owns work, and the session is the current body natural.** |
| Skill / sub-agent jurisdiction | **Predicate-specialization sub-scope** | The office's `available-skills` and `available-sub-agents` are the sub-scope $G \subsetneq A_O$ (with $A_O$ the full action-domain) under the predicate-specialization morphism $\pi: G \hookrightarrow A_O$ from PredCat. The harness install reads the sub-scope and projects only those skills/agents into `.claude/`. |
| Sub-agent dispatch | **Delegation morphism** | Per `delegation.md` + `delegation-as-authority-residuation.md`: parent's `Agent(...)` is a delegation $\rho_a g$ from the parent office's powers to a sub-incumbency. Sub-grant $G' \subseteq G \subsetneq A_O$ enforced by the residuation. Accountability stays with parent (non-transfer row). |
| Session ending | **Succession (relief)** | The incumbency's `relieved-by` cell settles; the next session into the same office is the new dignitas. Per `incumbent.md` §"Succession instantaneity", the office's structural cells are unchanged (*dignitas non moritur*). |
| Cross-rank authority chain (captain → engineering office → session) | **Composite modal frame** | Per `military-command-chain-as-modal-composition.md`: $\Diamond_{\mathrm{boot}} = \Diamond_{R^{\mathrm{captain}}} \circ \Diamond_{R^{\mathrm{office:engineering}}}$. The chain is the relational composition; chain-of-command is structural, not policy. The captain's accountability is an $H^0_t$-invariant — it survives every delegation link. |

## What this gives us — for free

Six substantive consequences fall out of the mapping without any new substrate primitives:

1. **The office, not the session, holds work.** `read_assignment(session_id)` is implemented as: look up the session's bound office via the incumbency proposition; walk the office's in-edges on `to-office` for active assignments; return the highest-priority.
  The session-record carries no assignment cells of its own.

2. **Skill jurisdiction is not a separate field.** The office's `available-skills` is a proper sub-scope of its action-domain.
  The harness install command (`pyfars install-harness claude-code-skills --office=engineering`) reads the office record, computes $\pi^*$ on the action-domain to the available-skills sub-scope, and projects only those skill records to `.claude/`.
  The same projection logic applies to `available-sub-agents`. **The "skill filter" is the predicate-specialization morphism applied at install-time.**

3. **MCP authority gating is forced, not configured.** Each MCP write tool's body invokes the residuation $\rho_a g$ where $a$ is the session's incumbency-derived authority on the requested action.
  The four delegation invariants (derivativity, accountability non-transfer, boundedness, revocability) are inherited from the residuation table — **not separate axioms to enforce**.
  The substrate-algebraic "authority check" is the residuation's row evaluation; it cannot be forgotten or bypassed.

4. **Sub-session bookkeeping is delegation transport.** When a parent session calls the `Agent(...)
  ` tool, the substrate move is a delegation $R^B$ derived from $R^P$ (the parent's office-derived powers).
  Per `delegation-transport-via-beck-chevalley.md`, this delegation transports cleanly under the parent's eventual succession (office-scope delegations survive; personal-scope delegations lapse).
  Sub-MCP enforcement is just `\rho_{a'} g'` with $a'$ the sub-incumbency's authority — the same machinery as parent-MCP, no new code path.

5. **Captain's accountability is structural.** Per the chain-of-command theorem, the captain's `accountable-for` cells survive every delegation link.
  Every action a sub-sub-Claude session takes propagates accountability all the way back to `personnel:emsenn` — automatic, audit-readable, irrefutable in substrate.
  This is the substrate-algebraic content of "captain answers for the ship."

6. **Ultra-vires is a substrate primitive.** Per `jurisdiction-as-base-change.md` (d), an MCP call attempting work outside the session's office's jurisdiction produces an explicit `ultra-vires` cell — not just a permission-denied response.
  The audit trail records the attempt, the office's scope at the time, and the closure-rule that blocked it. **This is what "fail-closed" means substrate-algebraically.**

## Where PredGov is incomplete; what PredCat directly closes

Three places where PredGov+PredWork stop short and PredCat machinery completes the picture:

### 1. Ephemeral occupants and bounded incumbencies

`incumbent.md` is stage-indexed but assumes persistent personnel.
A Claude session lives for minutes-to-hours.
PredGov has the right machinery but doesn't apply it to ephemeral occupants explicitly:

- The `succession` morphism's existing closure rule on incumbency cells handles relief; the felicity condition for "session ended" is just `\langle\iota,\texttt{terminated-at},\tau\rangle = \mathbf{t}`.
- *Dignitas non moritur* applies trivially: the office persists across session boundaries; sessions come and go; the office's structural cells are stable.
- **No new PredGov primitive needed.** The Phase-2 cycle authors a *concept* in the operational vocabulary — "session-as-ephemeral-incumbent" — pointing at the existing PredGov objects.
  The substrate work is recognizing the cells, not inventing new ones.

### 2. Automated installer (no personal agent issuing the speech-act)

`installation.md` describes installation as "a constitutive speech act (Searle 1995) issued by an authority holding the relevant power" — Searle-flavored but PredGov's substrate-algebraic content is just "an increment with the right cells and a felicity check."
A piece of code (a closure rule that fires on hook event) is a perfectly good installer **if it holds the install-power**.

The captain's standing power to install Claude sessions into `office:engineering` is delegated to a session-installer subroutine via `delegation.md`'s machinery: bounded scope ($G$ = "install Claude sessions into office:engineering"), accountability stays with captain, revocable.
The session-installer is a delegate-of-captain entity in $E_{\mathrm{op}}$; its installation increments are felicitous because: - (authority) it holds $R^P$ via captain-delegation - (procedure) the SessionStart hook fires the standard installation procedure - (completeness) the four installation cells are populated by the hook handler

**No new PredGov primitive needed**, but the *concept* "automated-installer" is worth naming in the operational vocabulary as a sub-class of delegate.
Phase-2 cycle should author it.

### 3. Delegable-powers as a distinct envelope from full-powers

The open question [`delegable-powers-distinct-from-full-powers`](../../questions/delegable-powers-distinct-from-full-powers.md) asks whether an office's delegable scope is a separate frontmatter field, derived from `delegates-to:`, or determined by closure rule. **PredCat answers this directly** via `delegation-as-authority-residuation.md` + `delegation-transport-via-beck-chevalley.md`'s proposed strict-specialization criterion:

- The delegable scope is the proper sub-scope $G \subsetneq A_O$ encoded by predicate-specialization $\pi: G \hookrightarrow A_O$.
- The closure rule that admits a delegation increment checks: $G \subsetneq A_O$ (boundedness, row 2 of the residuation table); $a \geq_k \mathbf{t}$ (the office's own authority is positive, not silent or denied); the strict-specialization criterion (the inclusion $\pi$ is non-identity, with the counit failing on the complement $A_O \setminus G$).
- **No new substrate type is needed.** The delegable scope is a structural cell on the office record naming the sub-scope — slug list `delegable-skills:`, `delegable-sub-agents:`, semantically identical to a `provides-capability` section restricted to the delegable subset.
- The default-if-omitted question (Q2 of the question record) gets a principled answer: **omitted = empty (no powers delegable)**.
  This matches `delegation.md`'s "abdication-witness" treatment of $G = X$ — silence cannot mean "all powers delegable" without algebraic over-affirmation.
- The recursive-delegation question (Q3) is settled by `delegation-transport-via-beck-chevalley.md`: sub-delegation is bounded by the predicate-specialization composition $\mathrm{dom}(R^C) \subseteq \mathrm{dom}(R^B) \subseteq \mathrm{dom}(R^P)$.
  Termination is guaranteed by the strict regime's $\kappa < \omega$.

## Where PredCat's closure-2-monad earns its keep

The closure-2-monad's lax-idempotence (per `closure-2-monad.md`: $\mu \dashv \eta_\mathrm{Cl}$ with identity counit) is the formal guarantee that **nested sessions converge on the same fixed point as iterated single-level closure**.
Concretely:

- Parent session's substrate operations are a closure step under captain → office:engineering → session-incumbency authority composition.
- Sub-session's operations are a *nested* closure step under parent's delegated authority.
- Lax-idempotence says: the doubly-closed substrate is the same as the singly-closed substrate, up to the canonical 2-cell. **Sub-sessions don't fork the substrate's semantics.**

Without lax-idempotence, a sub-Claude could in principle observe substrate state that the parent could not — a semantic split that breaks audit.
With it, every sub-session's view of the substrate is a refinement of the parent's, and audit is monotone in the delegation chain.

## What this means for the Step-2 cycle

The Phase-2 cycle's question, claim, and substrate authoring should be:

**Stage-1 question** (to be authored): *"How does a Claude session bind to a substrate office at boot, such that the office's deontic profile transfers to the session, the office's delegable-skills scope projects into `.claude/`, and the session's MCP writes are gated by the office's authority — using only the existing PredGov + PredWork machinery applied to ephemeral occupants?"*

**Stage-3 claim** (to be drafted): *"Session-bootstrap-as-installation: the SessionStart hook is a felicitous installation increment $I^+(A_\mathrm{installer}, \iota_\mathrm{session}, O_\mathrm{default}, \tau_\mathrm{boot})$ where $A_\mathrm{installer}$ is the captain's delegated session-installer subroutine, $\iota_\mathrm{session}$ is the new session-record, $O_\mathrm{default}$ is the office named in the harness install config, and $\tau_\mathrm{boot}$ is the hook-firing stage.
Capability propagation transfers $O_\mathrm{default}$'s deontic profile to $\iota_\mathrm{session}$.
Skill projection is the predicate-specialization $\pi^*$ on $A_O$ to the office's `delegable-skills` sub-scope."*

**Stage-4 substrate primitives** (to be authored): - *Concept:* `session-as-ephemeral-incumbent` — the operational reading of `incumbent.md` for sessions. - *Concept:* `automated-installer` — the operational reading of an `installation` morphism whose installer is a delegate-subroutine, not a personal agent. - *Object:* `session-record` — the substrate-resident incumbency proposition $\iota$ for a session. - *Morphism:* `propagate-office-deontic-profile-to-session` — the closure rule that fires on dignitas settlement. - *Morphism:* `project-delegable-skills` — the install-time predicate-specialization on the office's action-domain.
(Naming candidate; the cycle may rename.)

**Stage-6 specifications** (to be authored): - `session-bootstrap-installation` — the contract for the SessionStart hook handler's installation behavior. - `office-delegable-scope` — the substrate-readable shape of an office's `delegable-skills:` and `delegable-sub-agents:` cells (resolves the open question's Q1). - `session-mcp-authority-gate` — the contract for MCP write tools' residuation gate.

**Stage-7 integration**: enriches `claude-as-pyfars-runtime.md` Phase 2 with the proper PredGov/PredCat anchoring (this survey's mapping table); carves out follow-on plans for the projection step (`ship-office-scoped-harness-projection`) and the gate step (`ship-mcp-authority-gate`).

## Open items not closed by this survey

- **The session-installer's actual identity in substrate.** Is it a single subroutine entity (`agent:claude-session-installer`) named in `agents/`, or a closure-rule-firing-as-installer pattern?
  The survey takes "delegate-of-captain entity" as the conceptual reading; the implementation choice is open and should be a stage-4 substrate-authoring decision.
- **Session-MCP authority gate's per-call mechanics.** The residuation $\rho_a g$ is well-defined; what's open is whether the office's authority cell is read fresh per call, cached at session-bootstrap, or kept in a session-scoped jural-relation cache.
  This is implementation detail, but it interacts with revocability (mid-session captain-revocation must take effect immediately, which argues for fresh reads).
- **Does the `Witness` payload need an `incumbency` field?** Currently every witness carries `truth`/`evidence` plus surface-identity (`channel`/`origin`/`agent`).
  Should it also carry the incumbency-proposition slug under whose authority the write occurred?
  This makes the audit trail self-contained and is consistent with `installation.md`'s witness-records-the-installer pattern.
  Likely yes; defer to the Stage-6 spec.
- **The `delegable-skills` cell shape in the office record.** Slug-list of skill records, or a structured sub-scope description (with grant patterns à la `provides-capability`)?
  Likely slug-list to start, refactorable later.
  Defer to stage-6.

## Recommendation

The Step-2 cycle as commissioned in the prior turn's proposal should: (a) author the question with this survey as its stage-2 prior-art; (b) draft the claim above; (c) author the four stage-4 substrate primitives; (d) draft the three stage-6 specifications; (e) integrate into `claude-as-pyfars-runtime.md` Phase 2 with the proper PredGov vocabulary.
Two follow-on plans (skills/agent projection; MCP authority gate) carve off the engineering side cleanly.

Estimated cycle weight: **medium**.
The substrate primitives are not novel — they're substrate-instantiations of PredGov objects.
The novelty is naming "session-as-ephemeral-incumbent" and the predicate-specialization framing of `delegable-skills` as substrate-algebraic content.
The cycle's deepest move is the Stage-3 claim, which is where the formal commitment lands.
