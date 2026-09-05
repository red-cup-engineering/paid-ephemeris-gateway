---
type: question
status: research-synthesized
research-synthesis: ../work/surveys/session-as-incumbent-from-predgov-and-predcat.md
explores: [office, jural-relation, sub-session-binding, hohfeldian-power, agential-self-generation]
answered-by-theorems:
  - theories/.../predicated-governance/theorems/delegation-as-authority-residuation.md
  - theories/.../predicated-governance/theorems/delegation-transport-via-beck-chevalley.md
  - theories/.../predication-categories/morphisms/predicate-specialization.md
  - theories/.../predication-categories/morphisms/right-residuation-operator.md
---

# What is the substrate-algebraic relation between an office's full powers and the strictly-narrower set of powers that office can delegate to a sub-office?

The Hohfeldian framing in [`jural-relation`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jural-relation.md) names *power* as a distinct relation kind — the active-holder's capacity to alter another agent's primary jural position. *Power to delegate* is a power whose effect is to install a passive-party as incumbent of a (sub-)office with a stated authority envelope.
Under this framing, an office that has powers is not automatically authorized to delegate all of them; an office that can be enrolled-into is not automatically authorized to enroll others.

[`Office`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/concepts/office.md) treats an office as an agent entity with three classes of distinguishing predications — governance (scope, predicate authority, closure rules), reporting (escalation/delegation graph), capability (skills, runbooks).
The reporting predications include `delegates-to:` slot-filling, but the theory does not currently fix whether the *envelope* of what gets delegated is the office's full powers, a strict subset declared explicitly, or a derivation from `delegates-to:` plus a closure rule.

The question matters now because [`claude-as-pyfars-runtime`](../work/goals/claude-as-pyfars-runtime.md) Phase 5 binds Claude `Agent(...)
` sub-sessions to sub-offices.
Without a delegable-powers model, a parent session's authority is the sub-session's authority — which contradicts the standard agentic-AI discipline of bounded sub-agent capability and contradicts [`scope-as-predication`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/narratives/scope-as-predication.md)'s commitment that scope is *substrate-readable* per-call.

## What the substrate would look like with a delegable-powers commitment

Each office record carries, alongside its powers/jurisdiction declaration, a substrate-readable envelope of which of those it can delegate.
Sub-office assignment cells emitted by the dispatch graph — and by the parent session's `dispatch_subagent` MCP call — are checked at write-time against the parent office's delegable envelope; an out-of-envelope assignment fails-closed and emits an `ultra-vires` witness.
The sub-session's MCP boundary (Phase 5 move 4) reads the sub-office's authority and gates its tool calls, so authority narrowing is enforced at *both* assignment-time and call-time.

## What's at stake

If delegable-powers is *not* substrate-readable as a distinct envelope, every sub-session has the parent's full authority.
In autonomous mode this means a routine-validation sub-agent can author governance records; in interactive mode it means the captain's harness sessions cannot safely delegate to lower offices because every delegation is a full-authority delegation.
The discipline of bounded sub-agent capability — load-bearing for autonomous operation under the strict regime — collapses.

If delegable-powers *is* substrate-readable, the substrate inherits the standard separation between authority and delegation that human institutions formalize and that capability-security formalizes mathematically.
The audit trail becomes principled: every sub-action's authority chain is reconstructible from substrate state.

## What's hard

Three tensions:

1. **Additive-Bussard agent scope is permissive.** `pyfars/runtime/agent.py`'s `with_added_scope()` composes scopes by union; an empty parent scope is *unrestricted*.
  The current code cannot represent "parent has scope X; sub-agent has scope strictly narrower than X" without introducing a non-additive operator.
  The closure-rule machinery permits this — the rule would simply intersect with the delegable envelope rather than union with the sub-declaration — but it is a different shape from the existing scope composition.

2. **Recursive delegation must terminate.** If office $O_1$ delegates power $p$ to $O_2$, can $O_2$ further delegate $p$ to $O_3$?
  The Hohfeldian theory says: only if $O_1$'s delegation explicitly carried the second-order power-to-delegate.
  The substrate-algebraic question is whether the delegable envelope is a flat set or a fixed-point under iterated delegation.
  The strict regime's $\kappa < \omega$ implies the iteration must terminate finitely; the rule design has to enforce that.

3. **Default vs explicit.** A captain authoring a new office must declare its delegable powers explicitly, or there must be a sensible default (e.g., "no powers delegable unless declared").
  A permissive default reproduces the current additive-Bussard problem; a restrictive default makes office authoring more verbose.
  The choice has charter-level implications.

## What would need to be answered

1. Does an office record gain a `delegable-powers:` field (frontmatter list referencing power-slugs from the office's own declaration), or is the delegable envelope derived by closure rule from the office's `delegates-to:` slot plus a charter-level binding?
2. What is the default — empty (no powers delegable) or full (all powers delegable)?
3. Does sub-delegation require the second-order power-to-delegate explicitly, or is it derivable from the iteration of the closure rule?
4. Where does the rule live — in `pyfars/runtime/eligibility_rules.py` alongside the existing capability-closure rules, or in a new `governance/closure-rules/delegation.py` module that the dispatch graph reads via the projector?

When this resolves, the resolving claim and the rule design go to the appropriate places (a claim or object under [`agential-orchestration-platform`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/), an instantiator under `pyfars/runtime/`, possibly a [decision](../governance/decisions/) about the default).
This question note is then deleted.

## Research synthesis (2026-05-09)

Substantively answered by [`session-as-incumbent-from-predgov-and-predcat`](../work/surveys/session-as-incumbent-from-predgov-and-predcat.md).
Summary of resolutions:

**Q1 (frontmatter field vs. derived?)** — **Frontmatter cells**: `delegable-skills:` and `delegable-sub-agents:` slug-list cells on the office record.
Semantically these name the proper sub-scope $G \subsetneq A_O$ of the office's action-domain $A_O$, encoded by [predicate-specialization morphism](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-specialization.md) $\pi: G \hookrightarrow A_O$.
The closure rule is *not* the source of the scope — the scope is data on the office record; the closure rule *enforces* the predicate-specialization at delegation-time.

**Q2 (default — empty or full?)** — **Empty**.
Per [`delegation-as-authority-residuation`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-as-authority-residuation.md) row 1, silent authority ($a = \bot$) cannot generate $\mathbf{t}$-valued derived grants — silence cannot manufacture content.
A default of "all powers delegable when omitted" would conflate silence-on-delegability with explicit-permission-to-delegate, exactly the row-3 ex-falso pattern the residuation table refuses to admit.
Office authoring becomes more explicit (each office *names* what it delegates), but this is the substrate-algebraic discipline the residuation table forces.

**Q3 (recursive delegation termination?)** — **Bounded by predicate-specialization composition.** Per [`delegation-transport-via-beck-chevalley`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-transport-via-beck-chevalley.md): sub-delegation chain produces $\mathrm{dom}(R^C) \subseteq \mathrm{dom}(R^B) \subseteq \mathrm{dom}(R^P)$, and the strict regime's $\kappa < \omega$ guarantees finite termination.
The "second-order power-to-delegate" is automatic: an office whose delegable scope $G$ is non-empty thereby *can* delegate within $G$, and recipients can sub-delegate within their inherited $G' \subseteq G$.
No separate "permission to delegate further" cell is needed; the strict-specialization criterion of the BC-transport theorem provides it structurally.

**Q4 (rule location?)** — Engineering choice.
The closure rule lives wherever the substrate's other authority-gate rules live; this is *not* a substrate-algebraic question, just a code-organization one.
Likely answer when the cycle runs: a new module `pyfars/runtime/closure/delegation_residuation.py` co-located with `eligibility_rules.py`, since it is one of the substrate-side authority-gate closure rules.

The third tension named in this question (additive-Bussard scope is permissive) is also resolved: the substrate replaces additive-union with **predicate-specialization residuation** at the delegation point.
The runtime's existing `with_added_scope()` becomes a special case (when $G = A_O$ — i.e., abdication-equivalent — but the closure rule blocks that as not-a-delegation).

**What this question's resolution leaves for the cycle to do:** author the closure rule formally in [closure-rule-language](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule-language.md); add `delegable-skills:` / `delegable-sub-agents:` to the office-record schema and the office-authoring convention; replace `with_added_scope()`'s call sites with the residuation gate.
The question may be deleted once the Phase-2 cycle's specifications land.
