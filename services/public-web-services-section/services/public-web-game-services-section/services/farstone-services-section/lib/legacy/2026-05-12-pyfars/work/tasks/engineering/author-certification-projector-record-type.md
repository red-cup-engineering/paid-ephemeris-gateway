---
title: "Author the certification-projector record type"
type: task
area: engineering
status: open
horizon: later
milestone: m11-assurance-audit-chain-export
goal: certification-artifact-projector-framework
depends-on: [finalize-projector-protocol-as-adjoint-pair]
requires-capabilities: [corpus-editing, theory-derivation]
theory-basis: [projector-framework-counit, charter-c2]
---


## Description

Author `objects/certification-projector.md` as the substrate record type for projectors that produce certification artifacts (NIST CSF 2.0 reports, FAA BVLOS demonstration packages, DoD 3000.09 audit packages, etc.).
The record carries the projector's input scope (which substrate cells it reads), output schema (the certification framework's expected fields), and counit-law-verification cell.

The record type is a specialization of the general `Projector` protocol with framework-conformance fields added: `framework-name`, `framework-version`, `output-format`, `signed-by-policy`.
Per-framework projectors (NIST, FAA, DoD) instantiate this type.

## Acceptance

- [ ] `objects/certification-projector.md` exists with the required frontmatter shape.
- [ ] The body cites the `Projector` protocol and explains how certification adds to the base.
- [ ] Per-framework projectors (NIST/FAA/DoD) are positioned as instantiations of this type.

## Progress cells

*(empty — task not yet started)*
