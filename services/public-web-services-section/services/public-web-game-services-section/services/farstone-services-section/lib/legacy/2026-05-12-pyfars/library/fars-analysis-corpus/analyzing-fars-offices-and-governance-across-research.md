---
title: "Analyzing FARS offices and governance across research"
specialization: analysis
feature: offices-and-governance
description: "Everything we know about how governance works in FARS — offices as fuzzy cells with formality assessments, the universal office template, Hohfeldian deontic profiles, the guild/office parallel, progressive sharpening."
date-created: 2026-04-07
informs: [system-architecture-refactor, charter-and-governance, operations-loop]
synthesizes:
  - offices-as-fuzzy-cells
  - office-predication-template
  - office-predication-work-summary
software-sources:
  - analyzing-how-lpmud-discworld-informs-development-of-fars
  - analyzing-how-rimworld-informs-development-of-fars
  - analyzing-how-dwarf-fortress-informs-development-of-fars
  - analyzing-how-bussard-informs-development-of-fars
  - analyzing-how-tab-informs-development-of-fars
---

# Analyzing FARS Offices and Governance

## Offices are fuzzy cells

Each office is a cell — site, fibers, constructors, laws — but fuzzy (prose-specified rather than algebraic).
The offices-as-fuzzy-cells analysis mapped all 26 offices:

| Cell component | Office analog | Current formality |
|---|---|---|
| **Site** | Action domain | Prose strings (F1-F2) |
| **Fibers σ** | What the office recognizes as valid input | Mix: some typed, most prose |
| **Fibers Δ** | What the office produces | Mix: some typed, most prose |
| **Constructors** | What tools the office can use | **F3** — tool allowlists are algebraic |
| **Laws** | Delegation bounds, escalation rules | Prose (F1-F2) |

Key finding: constructors (tool lists) are universally F3.
Sites (action domains) are universally F1-F2.
The system is settled in what tools offices CAN use but unsettled in what domains they SHOULD work in.

### Formality distribution by department

Engineering offices average F2.5.
Science averages F1.8.
Command averages F2.2.
Engineering is closest to formal because it operates near typed systems (compilers, graphs).
Science is farthest because it handles natural language.

### Sharpening candidates (closest to full F3)

1. Bookkeeper — double-entry IS algebraic
2. Docs-lookup — search function with formal pipeline
3. Graph-analyst — Datalog queries are algebraic
4. Harness-cleaner — reference counting is formal
5. Doc-updater — filesystem diff → index update
6. Observer — event stream pattern detection
7. Quartermaster — inventory queries and thresholds

### Irreducibly fuzzy (judgment-heavy)

1. Architect — system design
2. Researcher — reading comprehension and synthesis
3. Triage processor — unstructured → structured
4. Chief of staff — cross-domain synthesis
5. Planner — novel request decomposition

### Sharpening IS the settlement path

Training = sharpening = moving from F0→F3.
F1→F2: write structured checklists.
F2→F3: replace prose with formal checks.
At F3, the office can be demoted to a deterministic tool.
Progressive automation: every task completion should encode itself so a less capable agent can do it next time.

## The universal office template

Every office record needs (from office-predication-template):

1. **Core identity** — id, title, type, description, department
2. **Authority** — source, Weber type (traditional/charismatic/rational-legal), five scope dimensions (positional, substantive, temporal, jurisdictional, plus who is bound)
3. **Normative system** — which charter rules bind THIS office (not all offices)
4. **Deontic profile** — all four Hohfeldian positions: duties (must), powers (can command), privileges (may without asking), immunities (cannot be forced)
5. **Accountability** — bearer, scope, installation-anchored, non-transferable, escalation path
6. **Action domain** — entities governed, channels read, channels write, state transitions
7. **Capabilities** — work types handled, settlement path position
8. **Installation** — felicity conditions, mechanism, markers

When all offices use this template, the system can compute: who can do X?
Is Y accountable for Z?
What work can office X handle?
Is this office authorized for Y?

## What external software confirms

**LPMud guilds:** Determine what a player can do.
Joining = investiture.
Skills = capabilities.
Advancement = formality progression.

**RimWorld work priorities:** Per-colonist priority per work type.
Skills improve by doing.
Passion doubles learning rate.
Same as offices with formality levels that sharpen through practice.

**DF:** Properties generate behavior.
Don't code dispatch rules — code capability predicates.
The match emerges from composition.

**Bussard:** Sandbox IS a table of what exists.
The office's reads/writes ARE the sandbox.

**TAB:** Behaviors separate from models.
The same duty can attach to multiple offices.
Additive inheritance.

## Current state

First-officer has full predication (384 lines).
Operations-officer, chief-of-staff, bookkeeper, planner, researcher enriched this session with Hohfeldian profiles.
Remaining offices need the same treatment.

The 5 `*-context` files (office-vocabulary-overhaul, agent-governance-enrichment, charter-infrastructure, command-domain-extraction, work-domain-layer-separation) contain plan-specific task briefs.
They serve their respective plans and don't need feature-level consolidation.

## See also

- [Office](../../../library/theories/humanities/theories/sociology/theories/work/terms/office.md) — the general concept
- [Charter](../../charter.md) — the normative system governing all offices
