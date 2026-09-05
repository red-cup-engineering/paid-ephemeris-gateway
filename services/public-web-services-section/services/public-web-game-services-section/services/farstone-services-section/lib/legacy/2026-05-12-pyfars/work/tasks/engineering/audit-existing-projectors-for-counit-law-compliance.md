---
title: "Audit existing projectors for counit-law compliance"
type: task
area: engineering
status: open
horizon: doing
milestone: m11-assurance-audit-chain-export
goal: export-format-counit-law-verified
depends-on: [finalize-projector-protocol-as-adjoint-pair]
requires-capabilities: [code-authoring, testing]
theory-basis: [projector-framework-counit]
---


## Description

Walk every existing projector (markdown, JSON, materialized-view backing-path writers, governance-app view projectors, any deployed today) and verify each satisfies the counit law `render ∘ project ≅ id` modulo the projector's declared canonical form.
Document the audit findings as substrate cells: per-projector, `(projector, counit-law-verified, t|f|⊥) = t`.

Where a projector fails the counit law, file a finding with the failing case (input substrate cells, projected artifact, rendered-back substrate cells, diff).
Some failures are bugs (fix); some are intentional lossy projections (document as `(projector, lossy-by-design, t) = t` with rationale).

This audit is the foundation for any future projector — without it, the `polyglot-source-projectors` and `certification-artifact-projector-framework` goals can't make the counit-law claim cleanly.

## Acceptance

- [ ] Each projector under `pyfars/projectors/` has a counit-law property test in `tests/projectors/test_<projector>_counit.py`.
- [ ] Each projector record carries `(projector, counit-law-verified, ?value) = t` cell with the audit result.
- [ ] Lossy-by-design projectors carry `(projector, lossy-by-design, t) = t` with a `(projector, lossy-rationale, ?reason) = t` cell.
- [ ] An audit summary at `governance/audits/projector-counit-law-<date>.md` lists per-projector status.

## Progress cells

*(empty — task not yet started)*
