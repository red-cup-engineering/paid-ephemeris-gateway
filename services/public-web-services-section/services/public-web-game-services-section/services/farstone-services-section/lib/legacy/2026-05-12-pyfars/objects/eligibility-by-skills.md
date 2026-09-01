---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
shape: subset-cover-positive
requires-predicate: requires-skills
provides-predicate: provides-skill
consequent-predicate: eligible-by-skills
realizes: [scheduling-policy, dispatch-closure-rule-system]
depends-on: [dispatch-closure-rule-system, capability-table, work-record, predication-cell]
---

# Eligibility by skills

A closure rule in the dispatch-closure-rule-system: an office is *eligible* for a work-record when the office's skill-holdings cover the work-record's skill requirements.
Realizes the upstream [capability-matching](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/capability-matching.md) at the skill axis.

## Rule statement

For a work-record $W$ with `requires-skills: [S_1, S_2, \ldots, S_n]` and an office $O$ with `provides-skill: [P_1, P_2, \ldots, P_m]`:

$$\big\{S_1, \ldots, S_n\big\} \subseteq \big\{P_1, \ldots, P_m\big\} \;\Longrightarrow\; (W, \texttt{eligible-by-skills}, O) = \mathbf{t}$$

The cell `(W, eligible-by-skills, O) = t` records that the skills check passes.
Other eligibility checks (capabilities, jurisdiction, capacity) are separate rules; total eligibility is the conjunction across all axes.

## Antecedent cells

The rule reads: - `(W, requires-skills, S)` cells for each $S$ in the work-record's skill requirements. - `(O, provides-skill, P)` cells for each $P$ in the office's skill holdings.

These cells project from frontmatter per [`governance-frontmatter-is-substrate`](../claims/governance-frontmatter-is-substrate.md): the work-record's `requires-skills:` field projects multiple cells, one per skill; the office's `provides-skill:` field similarly.
The rule reads cells, not frontmatter directly.

## Consequent cells

The rule produces: - `(W, eligible-by-skills, O) = t` if the subset condition holds for all required skills. - `(W, eligible-by-skills, O) = f` if any required skill is not held by the office. - `(W, eligible-by-skills, O) = ⊥` if either side is unspecified (e.g., a work-record with no `requires-skills:` cell — admit-by-default? or unspecified eligibility?).

The realization commits to: an empty `requires-skills:` is interpreted as "no skill requirement," so eligibility-by-skills is $\mathbf{t}$ trivially.
An empty `provides-skill:` for an office means it covers no skill-requiring work; eligibility-by-skills is $\mathbf{f}$ for any non-empty requirement.

## Composition with other eligibility rules

Total dispatch eligibility for a work-record $W$ and office $O$ is the conjunction (knowledge-meet $\wedge_k$) across all eligibility axes:

$$\mathrm{eligible}(W, O) \;=\; \mathrm{eligible\text{-}by\text{-}skills}(W, O) \;\wedge_k\; \mathrm{eligible\text{-}by\text{-}capabilities}(W, O) \;\wedge_k\; \mathrm{eligible\text{-}by\text{-}jurisdiction}(W, O) \;\wedge_k\; \ldots$$

A failure on any axis makes the office ineligible.
A $\bot$ on any axis (unspecified) makes the eligibility unspecified — typically dispatch refuses to fire on unspecified eligibility to avoid silent incorrect dispatches.

## Polity-extension

Polities may refine the rule: - *Skill-equivalence*: if office $O$ holds skill $P$ and the polity declares `(P, equivalent-to, S) = t`, then $O$'s skill set is augmented with $S$ for eligibility purposes.
This requires an additional closure rule. - *Multi-skill bundles*: if a polity declares "skill bundle $B$ provides $[S_1, S_2]$," and an office holds $B$, then it holds $S_1$ and $S_2$.

These extensions are themselves system cells (closure rules) added by the polity.

## Open structural questions

- *Skill specificity*.
  When a work-record requires skill $S$ and an office holds skill $S'$ where $S'$ is more specialized than $S$, does eligibility hold?
  The rule as stated requires set inclusion; specialization handling needs an extension rule.
- *Skill freshness*.
  Should skills carry an "expires-at" predicate?
  A skill held in the past but not currently practiced may not actually cover the requirement.
  Currently no expiration handling.
- *Skill grants*.
  Skills granted via delegation chain (one office grants another the right to exercise its skills temporarily) require the delegation closure to extend `provides-skill:` cells.
  Currently the rule reads only direct `provides-skill:` cells.
