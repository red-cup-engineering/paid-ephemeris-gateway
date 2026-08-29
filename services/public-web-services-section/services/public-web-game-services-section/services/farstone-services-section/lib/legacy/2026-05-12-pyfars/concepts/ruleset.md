---
type: concept
class: closure-system
status: draft
depends-on: [rule, closure, four-regime-classification]
realizes: [closure-rule-system]
---

# Ruleset

A finite or countable set of [rules](rule.md) — the substrate-recordable [closure-rule-system](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule-system.md).
A ruleset $\mathcal{S}$ generates a *closure operator* $\mathrm{cl}^{\mathcal{S}}$: the least operator that is inflationary, idempotent, and respects every rule in $\mathcal{S}$.

The closure operator is what [settling](../morphisms/settling.md) iterates.
The system-state at any moment is the closure of its witnessed cells under the active ruleset.

## Existence and uniqueness

Per upstream: the family of closure operators satisfying "inflationary + idempotent + every-rule-respected" is closed under pointwise meet.
The meet is the least such operator.
So $\mathrm{cl}^{\mathcal{S}}$ exists and is unique for any ruleset $\mathcal{S}$.

This matters operationally: there is no choice about *which* closure operator the ruleset generates.
The ruleset *is* the specification; the runtime computes the unique resulting closure.

## Ruleset and regime

The [closure-rule-language](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/concepts/closure-rule-language.md) fragment used by the ruleset's rules determines the regime of the generated closure operator (per [four-regime dichotomy](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/four-regime-dichotomy.md)):

- All-strict ruleset → strict closure ($\kappa < \omega$).
- Scott-continuous ruleset → Scott-continuous closure ($\kappa = \omega$).
- Mixed-fragment ruleset → regime is the lub of contributing fragments' regimes.

A ruleset's regime bounds how quickly settling converges, which bounds the polity's rhythm-design (a ruleset whose regime is aperiodic cannot be settled per-tick; it requires trajectory-shipping).

## The active ruleset

A polity has, at any moment, an *active* ruleset — the system-cells of `kind: rule` that are currently in-force (not revoked, not deferred, not contingently-disabled).
The active ruleset is itself a substrate-derivable cell: it is the closure of "rule X is active" cells under the active rule-amendment rules.
(The fixed-point structure here is well-defined; rule-amendment rules cannot themselves be revoked except via meta-amendment — the closure of meta-rules.)

The active ruleset evolves: rules are [enacted](../morphisms/enacting.md) (added), revoked (removed), amended (replaced).
Each amendment is a substrate witness; the ruleset's history is reconstructible.

## Ruleset stratification

In practice, PyFARS's rules group naturally into strata by purpose:

- **Frontmatter rules** — what cells must exist on what `type:` notes.
- **Cross-reference rules** — every cited slug must resolve (or be marked external).
- **Dispatch-readiness rules** — what makes a workitem dispatchable.
- **Capability-matching rules** — what makes an agent eligible.
- **Governance rules** — what offices can enact what.
- **Audit rules** — what conditions surface as findings.

Each stratum has its own contribution to the active ruleset; together they generate the polity's full closure operator.

## Ruleset extension monotonicity

Adding rules to a ruleset can only *add* induced cells, never remove them.
Per upstream, rule-extension is monotone in the bilattice's knowledge order.
This is what makes incremental governance amendments safe: a captain enacting a new rule cannot accidentally invalidate prior closure-derived cells; only $\top$-conflicts surface (and those were going to surface eventually).

## What this concept does not specify

- The substrate-form of the ruleset's edge cases: when a rule is contingently-active (active only when a higher-meta-rule's antecedent holds), the closure structure includes the meta-rule; the discipline is partly settled.
- Multi-instance rulesets.
  When polities federate, their rulesets may differ; the merged ruleset's closure (over network-sheaf consensus) is open territory.
- Ruleset versioning.
  The active ruleset at moment $\tau$ is a specific substrate-cell-set; versioning across moments is currently per-witness-history, partly settled.
