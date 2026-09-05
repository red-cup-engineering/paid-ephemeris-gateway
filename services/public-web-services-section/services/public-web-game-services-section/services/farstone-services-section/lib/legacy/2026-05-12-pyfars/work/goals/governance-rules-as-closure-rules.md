---
title: "Governance rules as closure rules"
type: goal
milestone: m5-agential-self-generation
status: open
horizon: later
theory-basis: [norm, charter-as-closure-system, closure-driven-coordination]
tasks:
  - migrate-charter-clauses-to-norm-records
  - author-charter-violation-detection-rules
  - emit-charter-binding-violations-as-disqualification
---


After this goal, [Charter](../../governance/charter.md) clauses, [norms](../../governance/norms/_index.md), and other governance rules become enforceable closure rules.
A workitem or dispatch attempt that violates a charter clause produces a $\top$ cell on the relevant predicate; the disqualification axis takes over and the act is refused at dispatch time, with a substrate-visible witness explaining why.

## Why

The charter today is enforced by *agent-time discipline*: the executive officer reads the charter and refuses to author content that violates it.
That's correct as far as it goes, but it's pre-substrate enforcement — there's no closure rule that *fires* when a violation is attempted.

After this goal, the substrate carries the charter as norm records (a non-trivial subset of charter clauses are already shaped as norms; this goal makes the encoding complete).
Each norm has a closure rule that fires on its antecedent's settlement.
Violations don't depend on agent vigilance — they're substrate-detected and substrate-witnessed.

## Theory grounding

**1.
Charter-as-closure-system** ([`predicated-governance/theorems/charter-as-closure-system`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/charter-as-closure-system.md)).
The charter IS a closure-rule system; its theorems characterize amendment, conflict resolution, and federation under shared charters. **Migrating charter clauses to substrate-readable norm records doesn't make the charter "more enforceable"; it makes its already-existing closure-rule status operationally accessible.** The theorem says the charter is what it is; this goal exposes that.

**2.
Norm-as-closure-rule** ([`predicated-governance/objects/norm`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/norm.md)).
Each norm $\mathcal{N} = (\varphi, O, N)$ corresponds to a closure rule.
Obligation rules emit T on the prescribed cell-pattern; prohibition rules emit violation-witness cells when the prohibited content is asserted. **The substrate-form of a norm is exactly its closure rule.** Authoring norm records makes the rules first-class.

**3.
Closure-driven coordination** ([`predicated-work/concepts/closure-driven-coordination`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/closure-driven-coordination.md)).
Multi-agent coordination through substrate state, not message-passing. **The charter coordinates the polity not by agents reading documents but by agents reading substrate state that the closure rules have settled.** This is what makes the charter scale to multiple agents, multiple sessions, federated peers.

### Design constraints from this grounding

- **Each migrated charter clause becomes one or more [norm](../../governance/norms/_index.md) records.** The clause's text becomes the body of the norm record; the deontic operator (Obl, Per, Proh), antecedent, propositional content are extracted into frontmatter cells.
- **Violation witnesses produce substrate-visible $\top$ cells, not just log entries.** Per [predgov norm](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/norm.md): a prohibition rule fires `(violation-cell, prohibited-cell-asserted, <φ>) = T` on its antecedent's settlement.
  The downstream disqualification axis (charter-binding) reads these cells; an attempted dispatch on a violating workitem is disqualified with a witness citing the specific norm violated.
- **Norms compose with eligibility rules at the same dispatch layer.** Charter-binding becomes one F-emitting axis among several (rate-limit, budget, capabilities, instinct, charter-binding).
  It doesn't get special treatment in the dispatch graph — the closure rule fires, the cell is set, the disqualification composer reads it.
  Per [normative-operational-layering](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/normative-operational-layering.md), N→O closes via the dispatch axis.

## Acceptance

- [ ] Each [Charter](../../governance/charter.md) hard-core commitment (C1–C5) has at least one corresponding norm record under [`governance/norms/`](../../governance/norms/_index.md), with closure-rule frontmatter and authority-grounding back to the charter.
- [ ] Each norm has a corresponding `objects/<norm-slug>-rule.md` record authorizing the closure rule that realizes it.
- [ ] An `eligibility-by-charter-binding` rule (existing or new) reads norm-violation cells and emits F on dispatch axes accordingly.
- [ ] An attempted dispatch that violates a charter clause: produces no settled work effect, emits a witness `(dispatch-attempt, violates-norm, <norm-slug>) = T`, and the workitem remains in pending state with a substrate-readable explanation.
- [ ] Tests cover: charter-compliant dispatch admitted (regression); charter-violating dispatch refused with witness; multiple-norm-violations produce a witness per norm.
