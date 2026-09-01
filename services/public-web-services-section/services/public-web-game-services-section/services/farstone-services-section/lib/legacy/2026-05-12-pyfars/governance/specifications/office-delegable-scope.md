---
type: specification
version: "2026.05.09+office-delegable-scope"
status: draft
authored: 2026-05-09
authored-under-cycle: 2026-05-09-session-bootstrap-as-installation
realizes-claim: session-bootstrap-as-installation
exercises:
  - delegable-scope
  - project-delegable-skills
math-examples:
  - project-delegable-skills--xo-office
resolves-question: delegable-powers-distinct-from-full-powers
---

# Specification: office-delegable-scope

Version `2026.05.09+office-delegable-scope`.
The substrate-readable shape of an office's [`delegable-scope`](../../concepts/delegable-scope.md) cells, and the install-time projection rule that consumes them.
Resolves the operational portion of the [`delegable-powers-distinct-from-full-powers`](../../questions/delegable-powers-distinct-from-full-powers.md) question.

## 1. Abstract

An office record carries explicit `delegable-skills:` and `delegable-sub-agents:` slug-list cells naming the proper sub-scope $G \subsetneq A_O$ of the office's action-domain that the office permits to be delegated to its incumbents and sub-incumbencies.
The harness install command projects only the delegable scope to `.claude/skills/` and `.claude/agents/`.
Default-if-omitted is empty (no powers delegable).
The closure rule that admits delegation increments enforces $G \subsetneq A_O$ via the strict-specialization criterion of [`delegation-transport-via-beck-chevalley`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-transport-via-beck-chevalley.md).

## 2. Status

Draft.

## 3. Conformance

RFC-2119 keywords as in spec `session-bootstrap-installation` §3.

## 4. Terminology

- **Delegable scope** $G$ — the proper sub-scope of an office's action-domain $A_O$ that the office permits to delegate.
  Encoded by `delegable-skills:` and `delegable-sub-agents:` slug-list cells.
- **Action-domain** $A_O$ — the office's full set of governable actions, per PredGov [`office-as-double-settlement`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/office-as-double-settlement.md).
- **Strict-specialization criterion** — the inclusion $\pi: G \hookrightarrow A_O$ is a non-identity specialization (the counit fails on the complement $A_O \setminus G$), per [`delegation-transport-via-beck-chevalley`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-transport-via-beck-chevalley.md) §"abdication-vs-delegation criterion".

## 5. Requirements

### R1. Office records SHOULD declare `delegable-skills:` explicitly.

An office that wishes its incumbents to have access to skills MUST author a `delegable-skills:` slug-list cell naming the in-scope skill records.
Each slug MUST correspond to an existing substrate skill record at `governance/skills/<slug>.md` (or wherever the polity registers skills).
Default-if-omitted: empty list.

### R2. Office records SHOULD declare `delegable-sub-agents:` explicitly.

Symmetric to R1, for sub-agent slugs at `agents/<slug>.md`.
Default-if-omitted: empty list.

### R3. The default delegable scope MUST be empty, not "all".

A polity that omits `delegable-skills:` for an office is asserting "no skills are delegable from this office" — not "all skills."
Per [`delegation-as-authority-residuation`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-as-authority-residuation.md) row 1, silent authority cannot generate $\mathbf{t}$-valued derived grants.
An empty `delegable-skills:` is silent authority on delegation; the substrate refuses to admit delegations from such an office.

### R4. The strict-specialization criterion MUST be enforced at delegation-time.

The closure rule that admits delegation increments MUST verify $G \subsetneq A_O$ — the slug-list MUST NOT enumerate the polity's full skill/agent inventory (that would be abdication, not delegation; per row 2 of the residuation table with $G = X$).
In practice, the polity's full inventory is large enough that this is unlikely to be violated by hand-authoring; the closure rule's check is for safety against accidentally over-broad declarations.

### R5. Sub-delegation MUST satisfy $G_\mathrm{sub} \subseteq G_\mathrm{parent}$.

When a parent office delegates to a sub-office (e.g., via a sub-incumbency for a sub-session), the sub-office's `delegable-skills:` MUST be a subset of the parent's.
The closure rule MAY enforce this at sub-incumbency-author-time; alternatively, MAY enforce at delegation-exercise-time.
The substrate-algebraic guarantee per [`delegation-transport-via-beck-chevalley`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-transport-via-beck-chevalley.md) is that the predicate-specialization composition $\mathrm{dom}(R^C) \subseteq \mathrm{dom}(R^B) \subseteq \mathrm{dom}(R^P)$ bounds sub-delegation to a finite chain in the strict regime.

### R6. The harness install command MUST project only the declared scope.

`pyfars install-harness claude-code-skills --office=<slug>` MUST project to `.claude/skills/` exactly the substrate skill records named in the office's `delegable-skills:` cell — no more, no less.
Symmetric for `claude-code-agents`.
The morphism is [`project-delegable-skills`](../../morphisms/project-delegable-skills.md).

### R7. The install command MUST be a *replacement* projection.

Re-running `pyfars install-harness claude-code-skills --office=<new-office>` MUST produce a `.claude/skills/` whose contents reflect the new office's scope, not the prior office's union with the new.
Stale projections from prior installs MUST be removed.
The install MAY warn before removing files; it MUST NOT silently leave them.

### R8. Slug-list cells MUST reference existing substrate records.

Each slug in `delegable-skills:` MUST resolve to an existing record at the standard skills path.
The install command MUST emit a warning (and MAY refuse to install) when a slug does not resolve.
This is the substrate-side spell-check on office authoring.

### R9. The cell shape MUST be a flat slug-list, not a structured grant pattern.

For this version of the spec, `delegable-skills:` is a flat list of skill slugs:

```yaml
delegable-skills:
  - skill-slug-1
  - skill-slug-2
```

A future version MAY introduce structured grant patterns (per-skill scope-action restrictions, conditional grants, etc.).
The current spec deliberately keeps the shape simple to land Phase D in finite hops.

### R10. The implementation MUST be idempotent.

Per the morphism's idempotence: re-running the same install twice produces the same `.claude/` state.
No append-on-rerun, no order-dependence on prior install state.

## 6. Acceptance

### 6.1. XO-office projection (happy path)

Per math example [`project-delegable-skills--xo-office`](../../examples/project-delegable-skills--xo-office.md): with the XO office's `delegable-skills:` and `delegable-sub-agents:` cells populated as in the example, `pyfars install-harness claude-code-skills --office=pyfars-executive-officer && pyfars install-harness claude-code-agents --office=pyfars-executive-officer` produces a `.claude/` with exactly 11 skills and 6 agents, matching the slug-lists.
Verifiable by file-listing comparison.

### 6.2. Empty default

An office with no `delegable-skills:` cell, when used as the install target, produces an empty `.claude/skills/`.
The install command MAY emit a warning; it MUST NOT raise an error.

### 6.3. Slug not found

An office whose `delegable-skills:` names a slug with no corresponding `governance/skills/<slug>.md` record causes the install command to emit a warning naming the missing record.
The install MAY proceed (skipping the missing slug) or MAY refuse, per implementation choice; in either case, the substrate operator is notified.

### 6.4. Sub-delegation envelope check

Authoring a sub-office record whose `delegable-skills:` contains a slug not in the parent office's `delegable-skills:` MUST cause the closure-rule check to fire.
(Implementation deferred to the closure rule's authoring; this spec asserts the requirement.)

## 7. Non-normative examples

- [`project-delegable-skills--xo-office`](../../examples/project-delegable-skills--xo-office.md) — concrete projection for the XO office.

## 8. What this specification does not decide

- **The closure-rule-language formal statement** of the delegation-admission rule.
  The morphism [`project-delegable-skills`](../../morphisms/project-delegable-skills.md) is `status: draft` for this reason; promotion requires the formal statement.
- **The interaction with PyFARS's existing `with_added_scope()` agent-scope composition.** The current additive-Bussard composition and the predicate-specialization residuation gate are not yet reconciled; one of them must yield.
  Per the survey, the residuation gate is the substrate-correct treatment; `with_added_scope()`'s call sites become a special case (the abdication-equivalent $G = A_O$ that the closure rule blocks).
- **Performance.** A polity with thousands of skills and agents may need indexed lookup; the spec asserts correctness, not throughput.

## 9. References

- Claim: [`session-bootstrap-as-installation`](../../claims/session-bootstrap-as-installation.md)
- Cycle: [`2026-05-09-session-bootstrap-as-installation`](../../work/cycles/2026-05-09-session-bootstrap-as-installation.md)
- Concept: [`delegable-scope`](../../concepts/delegable-scope.md)
- Morphism: [`project-delegable-skills`](../../morphisms/project-delegable-skills.md)
- PredGov: [`delegation-as-authority-residuation`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-as-authority-residuation.md), [`delegation-transport-via-beck-chevalley`](../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/delegation-transport-via-beck-chevalley.md)
- Question (resolved by this spec): [`delegable-powers-distinct-from-full-powers`](../../questions/delegable-powers-distinct-from-full-powers.md)
