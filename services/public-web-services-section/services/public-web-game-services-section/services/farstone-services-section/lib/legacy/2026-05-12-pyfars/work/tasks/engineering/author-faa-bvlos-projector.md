---
title: "Author the FAA BVLOS demonstration package projector"
type: task
area: research
status: open
horizon: later
milestone: m11-assurance-audit-chain-export
goal: faa-bvlos-demonstration-package-projector
depends-on: [author-certification-projector-record-type]
requires-capabilities: [corpus-editing, framework-research, telemetry-handling]
theory-basis: [projector-framework-counit]
---


## Description

Two-step task. **Step 1 (research):** read FAA BVLOS demonstration-package requirements; identify the package's structural fields (flight history, incident reports, system-state snapshots, telemetry); document the mapping from PyFARS substrate cells (especially M10 cost/energy ledger cells and telemetry observation cells) to FAA BVLOS fields. **Step 2 (implement):** author the projector record and implementation; emit a sample package from a captured event log of a flight-bearing deployment.

Research-blocked: requires FAA BVLOS framework expertise.
Composes with [M10](../../milestones/m10-cost-and-energy-ledger-extension.md) and the embodied-deployment arc (M9–M12) for telemetry sources.

## Acceptance

- [ ] Research note at `governance/notes/faa-bvlos-mapping-<date>.md` documents the mapping.
- [ ] `objects/faa-bvlos-projector.md` exists.
- [ ] Implementation at `pyfars/projectors/certification/faa_bvlos.py` projects substrate cells.
- [ ] Counit-law property test passes.
- [ ] Sample package validates against FAA expected structure.

## Progress cells

*(empty — task not yet started; research-blocked)*
