---
title: "Author the projector-counit-law claim"
type: task
area: engineering
status: open
horizon: doing
milestone: m11-assurance-audit-chain-export
goal: export-format-counit-law-verified
depends-on: [finalize-projector-protocol-as-adjoint-pair]
requires-capabilities: [corpus-editing, theory-derivation]
theory-basis: [projector-framework-counit]
---


## Description

Author `claims/projector-counit-law.md` formally stating: for any projector $P = (\text{project}, \text{render})$ conforming to the `Projector` protocol, $\text{render} \circ \text{project} \cong \mathrm{id}_{\text{Substrate}}$ modulo the projector's declared canonical form.
The claim is the formal statement that every projector is a *retract* of the substrate at its scope; rendering an export and re-projecting it produces the original cells (modulo canonicalization).

The claim's status starts as `sketch`; the proof factors through (1) the projector protocol's requirement that `project` and `render` form an adjoint pair, (2) per-projector canonical-form discipline, (3) bilattice-value preservation under projection.
Formal verification is open work for [M11](../../milestones/m11-assurance-audit-chain-export.md)'s post-landing phase.

## Acceptance

- [ ] `claims/projector-counit-law.md` exists with `type: claim, status: sketch`.
- [ ] Statement is formal (universally quantified over projectors).
- [ ] Sketch covers the three factoring steps.
- [ ] Cited from `m11-assurance-audit-chain-export.md`'s `cites-claims:` (already declared as backing-gap; this task closes the gap).

## Progress cells

*(empty — task not yet started)*
