---
title: "Ship [M11 — Assurance Audit Chain Export](../milestones/m11-assurance-audit-chain-export.md) as a coordinated plan"
type: plan
status: planning
milestone: m11-assurance-audit-chain-export
tasks:
  - finalize-projector-protocol-as-adjoint-pair
  - author-projector-counit-law-claim
  - audit-existing-projectors-for-counit-law-compliance
  - implement-python-source-projector
  - implement-rust-source-projector
  - implement-toml-config-projector
  - implement-compound-polyglot-projector
  - implement-binary-format-projector-spike
  - test-cross-format-predication-becomes-cell
  - author-certification-projector-record-type
  - author-nist-csf-2-projector
  - author-faa-bvlos-projector
  - author-dod-3000-09-projector
dependency-order:
  - [finalize-projector-protocol-as-adjoint-pair, audit-existing-projectors-for-counit-law-compliance]
  - [finalize-projector-protocol-as-adjoint-pair, author-projector-counit-law-claim]
  - [finalize-projector-protocol-as-adjoint-pair, implement-python-source-projector]
  - [finalize-projector-protocol-as-adjoint-pair, implement-rust-source-projector]
  - [finalize-projector-protocol-as-adjoint-pair, implement-toml-config-projector]
  - [implement-python-source-projector, implement-compound-polyglot-projector]
  - [implement-rust-source-projector, implement-compound-polyglot-projector]
  - [implement-toml-config-projector, implement-compound-polyglot-projector]
  - [implement-compound-polyglot-projector, test-cross-format-predication-becomes-cell]
  - [audit-existing-projectors-for-counit-law-compliance, test-cross-format-predication-becomes-cell]
  - [finalize-projector-protocol-as-adjoint-pair, author-certification-projector-record-type]
  - [author-certification-projector-record-type, author-nist-csf-2-projector]
  - [author-certification-projector-record-type, author-faa-bvlos-projector]
  - [author-certification-projector-record-type, author-dod-3000-09-projector]
milestone-cells:
  - "(projector-protocol, formalized, true) = T"
  - "(existing-projectors, counit-law-audit-complete, true) = T"
  - "(python-source-projector, implemented-and-passing-counit, true) = T"
  - "(rust-source-projector, implemented-and-passing-counit, true) = T"
  - "(toml-ini-projector, implemented-and-passing-counit, true) = T"
  - "(compound-polyglot-projector, tree-level-counit-law-passes, true) = T"
  - "(cross-format-query, produces-firing-cells, true) = T"
normative-cleanup: tracked
---


## What this plan does

[M11](../milestones/m11-assurance-audit-chain-export.md) carries two distinct workstreams whose tasks land jointly.
This plan covers the **polyglot-projector workstream** — the foundation that makes any projector (including the certification-artifact projectors) buildable on a verified protocol with verified counit-law compliance.
The **certification-artifact workstream** (NIST CSF 2.0, FAA BVLOS, DoD 3000.09 framework-specific projectors) is research-blocked at the framework-conformance level and is captured as backing-gaps on the milestone rather than as plan-tasks here; those tasks become authorable once the framework research lands.

The polyglot workstream is what the captain's developer-agent is positioned to execute: foundational protocol work, four format-specific projectors (Python, Rust, TOML/ini, optional binary spike), a compound orchestrator, an acceptance test.
Closing this workstream alone substantially advances M11 and unblocks downstream work — [M19](../milestones/m19-self-developing-pyfars.md)'s `source-as-substrate-cells` goal depends on the Python source projector existing.

## Dependency structure

```
finalize-projector-protocol-as-adjoint-pair
        │
        ├──→ audit-existing-projectors-for-counit-law-compliance ──┐
        │                                                          │
        ├──→ implement-python-source-projector ──┐                 │
        ├──→ implement-rust-source-projector  ───┤                 │
        ├──→ implement-toml-config-projector  ───┼──→ implement-compound-polyglot-projector
        │                                        │            │
        │                                        │            │
        └──→ implement-binary-format-projector-spike (optional)│
                                                              │
                                  ┌───────────────────────────┴──────┐
                                  │                                  │
                                  ▼                                  ▼
                       test-cross-format-predication-becomes-cell ◄──┘
```

The protocol task gates everything (no projector compiles without the protocol).
The three concrete-format projectors run in parallel after the protocol lands.
The compound projector waits for the three to complete; the cross-format test waits for compound + audit.

## Milestone cells

The plan completes when all milestone-cells in the frontmatter are at $\mathbf{t}$.
Per [plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md), the plan-level completion is the meet over the milestone-cell set.

The cells emphasize *counit-law-passing* rather than just *implemented* — a projector that doesn't pass the counit law doesn't satisfy the plan's acceptance.

## What this plan does NOT cover

- **Certification-artifact projectors** (NIST CSF 2.0, FAA BVLOS, DoD 3000.09).
  These require framework research and per-framework field-mapping work that is research-actionable but currently research-blocked.
  Captured as M11 backing-gaps; tasks authored when the research lands.
- **Performance optimization** of the polyglot projectors.
  The projectors are correctness-first; performance tuning (caching, incremental projection on file edits, parallel walks) is post-acceptance work.
- **Federation-portable projectors**.
  When two peers federate substrate that includes source-cells, do the cells render to byte-identical source on both sides?
  Open question; not in this plan's scope.

## Theory grounding

- [Predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) — formal definition.
- [Plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md) — completion as the meet of milestone cells.
- `projector-counit-law` (M11 backing-gap claim) — the formal property the projectors satisfy.
- [`materialized-view-record`](../../objects/materialized-view-record.md) — the substrate-resident projection-cache pattern; polyglot projectors compose with this.
