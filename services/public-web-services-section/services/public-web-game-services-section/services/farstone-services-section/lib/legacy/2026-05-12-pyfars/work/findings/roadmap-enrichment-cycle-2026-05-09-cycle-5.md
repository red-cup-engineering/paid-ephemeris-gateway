---
title: "Roadmap-enrichment cycle 5 (2026-05-09): absorbed pypredcomp v0.x application arc as M14–M19; identified engineering-archive triage as ongoing cycle-input"
type: finding
status: actioned
observed: [enrichment-cycle-walk-2026-05-09-cycle-5]
expected: pyfars-roadmap-includes-application-surface-not-just-engine
variance: "the PyFARS roadmap as authored through cycle-4 was engine-only (substrate, dispatch, federation, supervision, audit); the captain identified a gap — 'normal software roadmaps' include applications (ERP, ICS, CMS, productivity stack), and PyFARS has prior art for all of these in pypredcomp v0.x and earlier in the engineering archive"
cause-configuration:
  - records-officer-treated-pyfars-as-engine-not-platform
  - prior-art-distributed-across-tools-pypredcomp-and-engineering-archive
  - cross-tool-prior-art-not-substrate-discoverable
scope: double-loop
severity: high
contained-by: this-cycle-itself
responds-to-via: [absorbed-pypredcomp-v0x-as-m14-through-m19, queued-engineering-archive-triage-as-ongoing-input, updated-roadmap-with-two-arc-shape]
---

# Roadmap-enrichment cycle 5

## Observed

After cycle-4 closed (rename + forward-extension step + M6/M9 rescope + M6'/M13 added), the captain reviewed the chat-rendered roadmap summary and identified a fundamental gap: **"normal software roadmaps" include applications** — ERP, ICS, CMS, productivity tooling — and the PyFARS roadmap had **none of them**.
The captain's framing: *"a very robust system for doing nothing, because you forgot that part of the roadmap"*.

The captain pointed to prior art distributed across the 561 superrepo:

1. [pypredcomp roadmap](../../../../tools/platform/pypredcomp/docs/dev/milestones/) at `tools/platform/pypredcomp/docs/dev/milestones/` — 11 milestones (v0.1 → v1.0) covering substrate, OS-class, drivers, **bundled userland**, federation, **industrial control**, **app development surface**, **561 productivity stack**, agential layer, **publishing/learning**, **self-developing OS**.
2. mash/ at `tools/platform/mash/` — Rust engine for vocabulary/ports/agents/sessions; conceptually overlapping with PyFARS engine arc.
3. [engineering archive](../../../../work/triage/engineering-archive/) at `work/triage/engineering-archive/` — earlier conceptual prior art, less detailed: `transcript-watcher-office` idea, `library/triage/from-tech-bucket-2/` concept files (application, service, expert-system, distributed-agential-relations-system), `dispatch-intents/`, ideas folders.

The captain explicitly authorized: "we have looots of prior art on plans for looots of software that we can all assume now applies to PyFARS, even if it says its about fars or mash or anything else"; "Bringing in all of this stuff is part of our PyFARS Roadmap Enrichment work cycle".

## Expected

A PyFARS roadmap that *includes the application surface* — what the polity will actually use the substrate to *do*, not just the substrate's internal correctness commitments.
Per [`roadmap-enrichment`](../../concepts/roadmap-enrichment.md) discipline, the cycle should pull this prior art in via the extension pass.

## Variance

**Engine-only roadmap**: cycles 1–4 authored M1–M13 covering substrate, dispatch, federation, boundaries, supervision, audit — *all engine-tier* work.
None of them addressed: - **ERP-shaped financial work** (ledger-tool — was in pypredcomp v0.3 bundled userland) - **ICS** (was in pypredcomp v0.5) - **CMS / knowledge management** (was in pypredcomp v0.7 productivity stack as the knowledge-app) - **Productivity tooling** (tasks, governance, dispatch, fleet, review apps — pypredcomp v0.7) - **Publishing** (pypredcomp v0.9) - **App development surface** (pypredcomp v0.6) - **Self-development capstone** (pypredcomp v1.0)

The pypredcomp roadmap *is* the application surface PyFARS lacks.
Treating it as separate-tool-not-PyFARS-relevant was the records officer's misreading.

## Cause configuration

- **`records-officer-treated-pyfars-as-engine-not-platform`**: PyFARS's framing as "the substrate engine" caused the records officer to scope its roadmap to engine concerns.
  But per memory feedback "PyFARS essence: pyfars is a non-Shannon/Turing computer over ANY unix flatfiles via predication-category projection; markdown/polity is application, not essence", PyFARS *is* the platform; the polity's apps run *on* it; the roadmap should cover both the engine and its application surface.
- **`prior-art-distributed-across-tools-pypredcomp-and-engineering-archive`**: the application-layer planning lives at `tools/platform/pypredcomp/docs/dev/milestones/` (the predication-computer's roadmap), not at `tools/platform/pyfars/work/milestones/`.
  The two tools are sibling realizations of the same machine-class theory; their roadmaps should be unified, not separate.
- **`cross-tool-prior-art-not-substrate-discoverable`**: nothing in PyFARS's substrate pointed *to* the pypredcomp roadmap.
  The records officer would not naturally walk `tools/platform/` looking for milestone records belonging to a different tool.
  The discoverability gap *enabled* the engine-only framing.

## Response

Five corrective actions taken this cycle:

1. **Authored M14–M19 as full milestone-records**, each with `prior-art:` frontmatter citing the pypredcomp source:
   - [M14 — Application Development Surface](../milestones/m14-application-development-surface.md) ← [pypredcomp v0.6](../../../../tools/platform/pypredcomp/docs/dev/milestones/v0.6-application-development.md).
     SDK with capability API, signed package format, fuel-budgeted isolation.
   - [M15 — Bundled Userland](../milestones/m15-bundled-userland.md) ← [pypredcomp v0.3](../../../../tools/platform/pypredcomp/docs/dev/milestones/v0.3-bundled-userland.md).
     Calculator/calendar/chat/email/file-browser/**ledger-tool** (ERP-shaped foundational financial layer)/terminal/text-editor.
   - [M16 — Industrial Control Surface](../milestones/m16-industrial-control.md) ← [pypredcomp v0.5](../../../../tools/platform/pypredcomp/docs/dev/milestones/v0.5-industrial-control.md).
     MQTT/Modbus drivers; bilattice handles stale/contradictory/partial natively; first physical binding (soil moisture + pump).
     Composes with M9 + M10 for safety-critical actuation.
   - [M17 — 561 Productivity Stack](../milestones/m17-561-productivity-stack.md) ← [pypredcomp v0.7](../../../../tools/platform/pypredcomp/docs/dev/milestones/v0.7-561-productivity-stack.md).
     Tasks/**knowledge (CMS-shaped)**/governance/dispatch/fleet/review apps.
     Captain migrates from Asana/Todoist/Linear/Obsidian.
   - [M18 — Publishing & Continuous Learning](../milestones/m18-publishing-and-learning.md) ← [pypredcomp v0.9](../../../../tools/platform/pypredcomp/docs/dev/milestones/v0.9-publishing-and-learning.md).
     Observation → instinct → skill → tool → hook promotion pipeline; Hugo-style publishing; persona-agents with publication channels.
   - [M19 — Self-Developing PyFARS](../milestones/m19-self-developing-pyfars.md) ← [pypredcomp v1.0](../../../../tools/platform/pypredcomp/docs/dev/milestones/v1.0-self-hosting.md).
     Capstone — agents inside PyFARS read PyFARS source, propose modifications via governance app, captain ratifies.

2. **Updated [roadmap.md](../milestones/roadmap.md) dependency diagram to a two-arc shape** — engine arc (M1–M13) + application arc (M14–M19), both forking off M5 (agential self-generation) and converging at M9 + M10 for safety-critical actuation.
  Each arc is internally linear; they share the M5 foundation.

3. **Added "Application arc" section** to roadmap.md under the existing "Roadmap-extension arc" with full descriptions of M14–M19 and source-citations to pypredcomp.

4. **Added "Engineering archive" section** to roadmap.md noting prior art queued for ongoing triage rather than absorbed wholesale this cycle (transcript-watcher-office idea; from-tech-bucket-2 concept files; mash content).
  Per CLAUDE.md "Read each file before moving it out of `triage/`", these are *per-file* work — multi-cycle absorption.

5. **Updated extension log** with cycle-5 entry recording the absorption and what made it authorable (captain's gap-identification + pypredcomp prior art being substrate-resident-but-tool-discoverable).

## Observations not yet acted on

**Cross-tool prior-art discoverability**: PyFARS's roadmap now points to pypredcomp source records via `prior-art:` frontmatter, but the records officer cannot walk *all* sibling tools systematically without help.
A future cycle should author a [`surveying-cross-tool-prior-art`](../../governance/skills/) skill that walks `tools/platform/*/docs/` for milestone-shaped content. **Deferred — skill-authoring task for next cycle.**

**Engineering archive triage**: the archive contains 80+ concept files in `from-tech-bucket-2/` alone, plus ideas, dispatch-intents, operations-archived.
Wholesale absorption would violate CLAUDE.md's read-each-file discipline.
Per the noted approach: queue triage as ongoing input. **Deferred — captain's choice when/whether to allocate cycles to per-file archive triage.**

**Numbering question still open**: with M14–M19 added to the application arc, the engine arc still has M9–M12 in its "embodied-deployment" tail.
The total count is 17 numbered milestones (M1–M19, plus M6').
Whether to renumber for cleaner reading is the cycle-4 deferred decision; cycle-5 did not address it. **Deferred — captain decision.**

**The mash project's overlap with PyFARS engine work**: mash (Rust) and PyFARS (Python) are both realizations of the predication-substrate machine-class.
Whether they continue as parallel realizations, whether one absorbs the other, or whether mash content folds into specific PyFARS milestones is a *captain decision about tool consolidation*, not records-officer scope. **Deferred — captain decision.**

## Scope

**Double-loop**: cycle-5 did not just apply the discipline; it changed what the discipline considers "the roadmap to enrich".
Pre-cycle-5: enrichment operated on PyFARS's `work/milestones/` only.
Post-cycle-5: enrichment treats sibling-tool roadmaps (pypredcomp's `docs/dev/milestones/`) as prior art to absorb, and the engineering archive as ongoing input.
This is a discipline-shape adjustment, not a single-loop application.

The captain authorized the double-loop work explicitly by identifying the gap and saying "Bringing in all of this stuff is part of our PyFARS Roadmap Enrichment work cycle".
The records officer exercises double-loop only under captain authorization.

## Related

- [`work/findings/roadmap-enrichment-cycle-2026-05-08-cycle-4.md`](roadmap-enrichment-cycle-2026-05-08-cycle-4.md) — cycle-4 finding (the rename + forward-extension cycle)
- [pypredcomp roadmap source](../../../../tools/platform/pypredcomp/docs/dev/milestones/) — prior art absorbed
- [engineering archive](../../../../work/triage/engineering-archive/) — earlier conceptual prior art queued for ongoing triage
- [M14](../milestones/m14-application-development-surface.md) through [M19](../milestones/m19-self-developing-pyfars.md) — milestone-records authored this cycle
- [Updated roadmap](../milestones/roadmap.md) — two-arc dependency diagram and application-arc section
