---
title: "M5 — Agential Self-Generation"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: later
depends-on: [m4-memory-feedback]
goals:
  - runbooks-as-first-class-substrate
  - office-records-gate-authority
  - governance-rules-as-closure-rules
  - new-skill-records-dispatchable-next-tick
  - on-complete-cycles-into-learning
  - claude-as-pyfars-runtime
theory-basis: [agential-self-generation, normative-operational-layering, charter-as-closure-system]
cites-objects:
  - pyfars/objects/skill-record.md
  - pyfars/objects/runbook-record.md
  - pyfars/objects/office-record.md
  - pyfars/objects/eligibility-by-charter-binding.md
  - pyfars/objects/eligibility-by-skills.md
  - pyfars/objects/eligibility-by-jurisdiction.md
  - pyfars/objects/corpus-as-flatfile.md
cites-morphisms:
  - pyfars/morphisms/dispatching.md
  - pyfars/morphisms/queueing-follow-on.md
  - pyfars/morphisms/consolidating.md
cites-claims:
  - pyfars/claims/dispatch-derives-from-governance.md
  - pyfars/claims/governance-frontmatter-is-substrate.md
  - pyfars/claims/substrate-purity.md
backing-gaps:
  - pyfars/objects/governance-rule-record.md (NOT YET AUTHORED — for governance-rules-as-closure-rules)
  - pyfars/morphisms/authoring-substrate-record.md (NOT YET AUTHORED — the agent-writes-to-substrate morphism)
  - pyfars/objects/transcript-watcher-office.md (NOT YET AUTHORED — for directives-do-not-drop)
  - pyfars/objects/external-read-office.md (NOT YET AUTHORED — for external-read-office)
  - pyfars/morphisms/handling-entity-lifecycle.md (NOT YET AUTHORED — agent birth/death events; eligibility cells re-evaluate when the entity set changes mid-tick; load-bearing for new-skill-records-dispatchable-next-tick when the new skill introduces a new agent)
acceptance: "An agent completing a workitem can write a new skill record to the substrate and that skill is dispatched on the next tick without any Python restart or code change."
---


The platform's operative machinery — agents, skills, runbooks, offices, governance rules — is entirely substrate content; agents running on the platform can extend the platform's capabilities by editing the substrate.
This is the closure of the third FARS commitment (C3): agential self-generation.

After M4 the system learns from its own observations.
M5 makes the system's *machinery* itself substrate-writable: agents can author new skills, register new agents, define new governance rules, and have those changes take effect in the next tick.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `runbooks-as-first-class-substrate` | Runbook records have a triggering predicate, context, body of skill invocations; the dispatch graph fires runbooks the same way it fires skills | open | [`runbook-record`](../../objects/runbook-record.md), [`dispatching`](../../morphisms/dispatching.md) |
| `office-records-gate-authority` | Office records carry `authority-scope`, `duty`, `right` fields the dispatch's authorization check reads | open | [`office-record`](../../objects/office-record.md), [`eligibility-by-jurisdiction`](../../objects/eligibility-by-jurisdiction.md), [`eligibility-by-charter-binding`](../../objects/eligibility-by-charter-binding.md) |
| `governance-rules-as-closure-rules` | Governance rules are substrate `type: governance-rule` records the closure-rule system applies; violations produce `⊤` cells | open | governance-rule-record (gap) — would compose with [`dispatch-derives-from-governance`](../../claims/dispatch-derives-from-governance.md) |
| `new-skill-records-dispatchable-next-tick` | Skill records authored mid-tick are picked up by the next tick's dispatch graph without restart | open | [`skill-record`](../../objects/skill-record.md), [`corpus-as-flatfile`](../../objects/corpus-as-flatfile.md), [`governance-frontmatter-is-substrate`](../../claims/governance-frontmatter-is-substrate.md) |
| `on-complete-cycles-into-learning` | Workitems whose `on-complete:` produces learning outputs (new skills, refined runbooks) cycle back through dispatch automatically | open | [`queueing-follow-on`](../../morphisms/queueing-follow-on.md), [`consolidating`](../../morphisms/consolidating.md) |
| `directives-do-not-drop` | A cluster of three patterns making sure captain directives don't get lost in conversation: a *transcript-watcher* office reads session transcripts and files unfiled action items as substrate records ([archive idea](../../../../work/triage/engineering-archive/ideas/transcript-watcher-office.md)); a *missing-role intent capture* skill records when an agent improvised because no role/skill was defined for the work ([dispatch-intent 20260505040954](../../../../work/triage/engineering-archive/dispatch-intents/intent-20260505040954-796eca.md)); a *session-role resolution* skill maps "be Troi" / "act as the steward" phrases to the right office/agent/persona record ([dispatch-intent 20260505040926](../../../../work/triage/engineering-archive/dispatch-intents/intent-20260505040926-744b1a.md)) | open |
| `external-read-office` | An office whose remit is translating internal 561 truth into how outside readers (markets, platforms, advertisers, hostile institutions, ordinary readers) will likely (mis)read it. Useful pre-publish check on M18 publication channels ([dispatch-intent 20260505040935](../../../../work/triage/engineering-archive/dispatch-intents/intent-20260505040935-2d7440.md)) | open |
| [`claude-as-pyfars-runtime`](../goals/claude-as-pyfars-runtime.md) | Claude Code is a first-class agentic runtime in the dispatch graph: substrate dispatches workitems into sessions, MCP exposes substrate operations as tools, sessions are bound to offices, and outcomes are witnessed substrate transitions | open — phases captured, tasks not yet authored |

## What lands together

- Runbook records compose multiple skill invocations into a workflow the dispatch graph can fire.
- Authorization isn't just capability/skill matching — it's office-scoped, with the office's `authority-scope` constraining what work the agent under that office can accept.
- Charter rules become enforceable closure rules; a workitem that violates the charter surfaces as a `⊤` cell on `(W, charter-binding-violated, ...)
  ` and the disqualification axis takes over.
- The continuous-learning pipeline closes: an agent doing work N produces a skill refinement that's available for work N+1 to dispatch against.

## Done when

An agent completing a workitem writes a new `governance/skills/<slug>.md` record (or `governance/runbooks/<slug>.md`).
On the next tick, that skill is visible in the projector-loaded `PredicationStore`, the eligibility rules pick it up, and the dispatch graph routes a matching workitem to it — all without any Python restart or code change.

## Theoretical shape

M5 closes the third hard-core commitment (charter C3 — agential self-generation):

**1.
The four-layer rule architecture** ([`flatfile-agentic-resource-system/concepts/four-layer-rule-architecture`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/four-layer-rule-architecture.md)).
Substrate, schema, behavior, surface — the layers compose, with each capable of being authored by an agent that ticks within the substrate.
M5 makes layer 3 (behavior — runbooks, skills, governance rules) substrate-writable end-to-end.

**2.
Office-as-fuzzy-cell** ([`flatfile-agentic-resource-system/concepts/office-as-fuzzy-cell`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/office-as-fuzzy-cell.md)).
Office records carry `authority-scope`, `duty`, `right` fields; the dispatch graph reads them to gate authorization.
Authority becomes *bilattice-valued* — an office holds an authority `t`, doesn't `f`, hasn't been settled $\bot$, or has contested authorization $\top$.

**3.
Closure-driven coordination** ([`predicated-work/concepts/closure-driven-coordination`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/closure-driven-coordination.md)).
Multi-agent coordination through substrate state, not message-passing.
Charter rules become enforceable closure rules; coordination is what the closure produces, not what agents negotiate explicitly.
After M5, the polity coordinates by making rules visible in the substrate; agents that read the substrate read the coordination.

## Predication-categories grounding (cycle-1/2 bindings)

Three theorems make M5's "auto-author rules" goal correctness-bearing rather than aspirational:

**A.
Self-generated rules MUST be fragment-classified at authoring time.** Per [rule-language-fragment-realizability-refinement](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/rule-language-fragment-realizability-refinement.md): the fragment hierarchy has *proved* status only at bare $\Pi_1+<$ and named-ordinal-entity-equality. $\Pi_2$ schemas, ordinal-arithmetic, and second-order are *open conjectures* (sketch only).
Self-generation that produces a rule outside the proved fragment puts the substrate into territory where:

- realizability characterization is open;
- the audit-projector may not terminate at audit-export time;
- federation-portability claims are not justified.

**A structural fragment classifier is therefore a precondition for M5 ship**, not a parallel polish task.
The classifier reads each `StoreRule.antecedents` and emits the fragment classification; M5's `authoring-substrate-record` morphism (currently a `backing-gap`) gates rule registration on the classifier returning a proved-fragment label.
Rules in unproven fragments require explicit captain attestation.

**B.
The iterate-with-graders pattern is structurally a single closure-rule firing.** Per [closure-monad-no-non-trivial-periodic-orbits](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-monad-no-non-trivial-periodic-orbits.md): $T^k(v) = v \implies T(v) = v$.
Period-1 only; no orbit of minimal period $\geq 2$ exists.
The "iterate-with-graders" three-stage self-improvement pattern (referenced in [`memory-feedback-self-generation-and-failure-modes`](../../questions/memory-feedback-self-generation-and-failure-modes.md)) is realized algebraically as a single closure-rule firing with graders embedded as substrate-resident closure rules over candidate self-generation cells. **M5 doesn't need oscillation guards on the self-generation loop** — the algebra cannot ping-pong between candidate states.

**C.
Substrate expressivity is bounded at $2^{\aleph_0}$ regardless of fragment.** Per [realizability-cardinality-bound](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/realizability-cardinality-bound.md): under countable-support increment sequences, the realizable family of $L_\mathrm{ns}$-subsets has cardinality at most $2^{\aleph_0}$ — strictly smaller than $2^{\aleph_1}$ (the universe). **Adding richer rule fragments doesn't extend states; it changes the parametrization.** M5's self-generation does not give the polity access to "more" states by inventing more expressive rules — it gives the polity access to the *structural shape* of the realizable family the four-regime classification decomposes.
The captain's framing of self-generation as "agents extend the platform's capabilities" is correct only inside this structural envelope; "extension" means *parametrization choice*, not *expressivity expansion*.

**D.
Per cycle-1 finding on Cl-algebra property-likeness:** Self-generated cells, once admitted, do not produce a separate `is_cl_algebra` check — the substrate's existing `nxt == current` termination in `kernel/closure.py:apply_active_rules` is the property-like check per Kelly–Lack (K2).
M5's "skill-records-dispatchable-next-tick" goal does not need additional substrate-state validation beyond what M2 already provides; the new skill enters the next tick's closure run identically to authored skills.

## Imminent vagueness — resolved by theory research

Three of M5's `backing-gaps` are well-defined by theory once a structural fragment classifier is in place; the fourth is genuinely a captain-design choice but with theory-grounded options.

### `governance-rule-record` schema (backing-gap)

Per [closure-rule-system](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule-system.md) + [rule-language-fragment-realizability-refinement](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/rule-language-fragment-realizability-refinement.md): governance-rule-records are *closure rules*, distinguished from eligibility-rules only by their tier (rules / guidelines / values per the Carter-Little hierarchy referenced in the [governance-charter-and-accountability question](../../questions/governance-charter-and-accountability.md)) and their on-violation behavior (produce $\top$-cell on the disqualification axis):

```yaml
---
slug: <rule-slug>
type: governance-rule
tier: rules    # rules / guidelines / values per Carter-Little hierarchy
fragment: bare-pi-1+lt    # required by structural fragment classifier
regime: strict             # required by structural fragment classifier
antecedent: <closure-rule-fragment>
consequent: <(s, p, o, value)>
on-violation: produce-top-cell-on-axis    # standard for governance rules
---
```

Implementation: a new named shape in `kernel/closure.py:NAMED_SHAPES` reads governance-rule records, emits `StoreRule` objects whose consequent is a $\top$-cell on `eligibility-by-charter-binding` for any workitem matching the rule's antecedent.
Mechanically the same shape as the existing `disqualification-negative` shape, just reading from governance-rule records rather than from flag predicates.

**Per cycle-1 closure-rule-language fragment hierarchy:** the `fragment` field MUST be `bare-pi-1+lt` for the audit-projector to terminate.
Charter rules in $\Pi_2$ schemas are research, not policy.

### `authoring-substrate-record` morphism (backing-gap)

Per the existing witness format (`kernel/witness.py:make_witness`): substrate-write witnesses already exist.
The morphism IS the pattern: agent invocation → substrate file write → witness emission with `kind="mutation"` → next-tick projection re-loads the cell.

**The vagueness is in the *gating discipline*, not the witness shape.**

- An agent's `authoring-substrate-record` action is admitted iff the resulting cell's closure-rule (if any) is in the proved fragment.
- The classifier reads the new cell's antecedent shape; rules outside bare-$\Pi_1+<$ require explicit captain attestation.
- `before_hash` and `after_hash` fields on the witness verify byte-equivalent replay.

Implementation: a new closure rule `verify-authoring-fragment` fires on every `kind="mutation"` witness whose target ends in `objects/*-rule.md` or `governance/skills/*.md`; antecedent is "witness emitted in this tick"; consequent is "rule's fragment classification ≠ proved → emit $\top$ on charter-binding axis, queue for captain review".

### `handling-entity-lifecycle` morphism (backing-gap)

The dispatch graph already emits `assignment_birth` / `assignment_death` witnesses (`programs/engine/dispatch.py`).
The vagueness is whether eligibility re-evaluates *mid-tick* when the entity set changes.

Per [closure-monad-no-non-trivial-periodic-orbits](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-monad-no-non-trivial-periodic-orbits.md) + [aperiodicity-characterization](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/aperiodicity-characterization.md): the closure converges in finite steps per tick in the strict regime; mid-tick re-evaluation would be a separate closure run.

Per [multi-observer-system](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/multi-observer-system.md): the entity set IS the multi-observer system's category $O$; entity-set changes are $O$-update events. $H^1(O, \mathcal{V})$ measures coherent disagreement *after* the update.
The natural lifecycle policy is **next-tick re-evaluation**:

- A birth/death witness emitted at tick $T$ becomes a substrate cell in tick $T+1$'s projector load.
- Tick $T+1$'s `apply_eligibility_rules_node` runs over the new entity set; eligibility cells re-emerge with the new structure.
- No mid-tick re-eval needed; the closure-2-monad's lax-idempotence guarantees the next tick's run produces the structurally-correct state.

**Implementation:** the morphism is *no morphism*, structurally — the existing per-tick closure run handles entity-set changes by reloading the store.
M5's `handling-entity-lifecycle` backing-gap is *closed by recognizing it as already-implemented*; what remains is a regression test verifying that a new skill-record authored at tick $T$ becomes dispatchable at tick $T+1$.

### `runbook-record` triggering predicate (vague but theory-grounded)

Per [closure-rule-language](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule-language.md): a runbook is a *composed closure rule* — its triggering predicate is the antecedent, its body is a sequence of consequents emitting workitem cells.
The runbook fires when its trigger antecedent is satisfied; the dispatch graph then routes the resulting workitems normally.

The captain-design choice is whether runbooks are flat (one rule per runbook) or composed (a runbook references skill-record slugs which themselves are rules).
The substrate-coherent shape is **composed**: a runbook is a `governance/runbooks/<slug>.md` record whose body lists skill-record slugs in order; the closure rule's instantiator emits cells for each skill in the list iff the trigger antecedent fires.
Sequential vs parallel execution is a follow-on M5 question per the existing [`quantifier-adjoints-and-aggregate-workitems`](../../questions/quantifier-adjoints-and-aggregate-workitems.md) question.

## Related self-questions

Cross-cutting questions in [`questions/`](../../questions/) that bear on M5's surface (see [`questions/_themes.md`](../../questions/_themes.md) for the full theme map):

- [`quantifier-adjoints-and-aggregate-workitems`](../../questions/quantifier-adjoints-and-aggregate-workitems.md) — realizing aggregate workitems (broadcast intents, compose-of-tasks workitems, recurring-aggregate practices) via the quantifier-adjoint structure on work fibers.
  Self-generation that *only* produces atomic workitems leaves the substrate without aggregate-workitem expressivity; this question scopes how aggregation enters M5's purview.
- [`ctde-as-substrate-snapshot-training-pattern`](../../questions/ctde-as-substrate-snapshot-training-pattern.md) — Centralized Training, Decentralized Execution with the substrate as global critic and per-agent contexts as local actors.
  Bears on whether self-generation's "agent learns and edits substrate" produces *individually* learned skills or *centrally trained, decentrally executed* skills.
  Crosses M4 (memory feedback) and M5 (the agent-edits-substrate boundary).
- [`two-internal-logics-as-substrate-query-api`](../../questions/two-internal-logics-as-substrate-query-api.md) — exposing the predication hyperdoctrine's two internal logics as a query API.
  Bears on M5 because self-generated agents that author rules need a stable logic-API to author *against*; an unstable query surface makes self-generation's "skills written in this tick are dispatchable next tick" brittle.

## Related

- [Roadmap](roadmap.md)
- [Charter](../../governance/charter.md) — C3 (agential self-generation)
