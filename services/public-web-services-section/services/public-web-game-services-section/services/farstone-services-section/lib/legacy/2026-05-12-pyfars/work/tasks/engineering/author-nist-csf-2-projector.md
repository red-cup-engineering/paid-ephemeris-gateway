---
title: "Author the NIST CSF 2.0 projector"
type: task
area: research
status: open
horizon: later
milestone: m11-assurance-audit-chain-export
goal: nist-csf-2-mapping-projector
depends-on: [author-certification-projector-record-type]
requires-capabilities: [corpus-editing, framework-research]
theory-basis: [projector-framework-counit]
---


## Description

Two-step task. **Step 1 (research):** read NIST CSF 2.0 framework spec; identify the framework's structural requirements (Identify-Protect-Detect-Respond-Recover functions; the per-function categories and subcategories); document the mapping from PyFARS substrate cells to NIST CSF 2.0 fields. **Step 2 (implement):** author `objects/nist-csf-2-projector.md` as a `certification-projector` instantiation; implement the projector at `pyfars/projectors/certification/nist_csf_2.py`; emit a sample report from a captured event log.

Research-blocked: requires reading NIST CSF 2.0 framework specs and synthesizing the substrate-to-NIST mapping.
Implementation cannot proceed without the mapping.

## Acceptance

- [ ] Research note at `governance/notes/nist-csf-2-mapping-<date>.md` documents the substrate-cell-to-NIST-field mapping.
- [ ] `objects/nist-csf-2-projector.md` exists.
- [ ] Implementation at `pyfars/projectors/certification/nist_csf_2.py` projects substrate cells to a NIST-conformant report.
- [ ] Counit-law property test passes (modulo NIST format's canonical form).
- [ ] Sample report generated from a captured event log validates against NIST's expected schema.

## Progress cells

*(empty — task not yet started; research-blocked)*
