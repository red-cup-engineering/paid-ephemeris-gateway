---
title: "Author the DoD 3000.09 audit package projector"
type: task
area: research
status: open
horizon: later
milestone: m11-assurance-audit-chain-export
goal: dod-3000-09-audit-package-projector
depends-on: [author-certification-projector-record-type]
requires-capabilities: [corpus-editing, framework-research]
theory-basis: [projector-framework-counit]
---


## Description

Two-step task. **Step 1 (research):** read DoD 3000.09 directive's "predictability and explainability" requirements; identify the audit package's required fields; document the mapping from PyFARS substrate audit cells (rsv_hash, RuleFiring provenance, charter-binding violation cells, signed-actor cells) to DoD 3000.09 fields. **Step 2 (implement):** author the projector record and implementation; emit a sample audit package.

Research-blocked: requires DoD 3000.09 directive expertise.

## Acceptance

- [ ] Research note at `governance/notes/dod-3000-09-mapping-<date>.md` documents the mapping.
- [ ] `objects/dod-3000-09-projector.md` exists.
- [ ] Implementation at `pyfars/projectors/certification/dod_3000_09.py` projects substrate cells.
- [ ] Counit-law property test passes.
- [ ] Sample package validates against DoD expected structure (per the DoD 3000.09 review checklist).

## Progress cells

*(empty — task not yet started; research-blocked)*
