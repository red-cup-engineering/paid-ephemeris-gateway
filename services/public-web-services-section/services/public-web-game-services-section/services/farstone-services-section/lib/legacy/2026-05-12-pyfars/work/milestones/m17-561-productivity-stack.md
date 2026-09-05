---
title: "M17 — 561 Productivity Stack (CMS / Knowledge / Tasks / Governance / Dispatch / Fleet / Review)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: captured
depends-on: [m14-application-development-surface, m15-bundled-userland, m5-agential-self-generation]
goals:
  - tasks-app
  - knowledge-app
  - governance-app
  - dispatch-app
  - fleet-app
  - review-app
  - saas-migration-validation
theory-basis: [agential-self-generation, four-layer-rule-architecture, projector-framework-counit, public-projection]
prior-art: [pypredcomp/docs/dev/milestones/v0.7-561-productivity-stack.md]
cites-objects:
  - pyfars/objects/skill-record.md
  - pyfars/objects/runbook-record.md
  - pyfars/objects/office-record.md
  - pyfars/objects/dispatch-closure-rule-system.md
  - pyfars/objects/jsonl-event-log.md
cites-morphisms:
  - pyfars/morphisms/queueing-follow-on.md
  - pyfars/morphisms/witnessing-completion.md
  - pyfars/morphisms/dispatching.md
cites-claims:
  - pyfars/claims/governance-frontmatter-is-substrate.md
  - pyfars/claims/dispatch-derives-from-governance.md
backing-gaps:
  - pyfars/objects/tasks-app-view.md (NOT YET AUTHORED — view-record over work/tasks/ + assignment-cells)
  - pyfars/objects/knowledge-app-view.md (NOT YET AUTHORED — view-record over theories/ corpus)
  - pyfars/objects/governance-app-view.md (NOT YET AUTHORED — view-record over governance/, includes review-queue)
  - pyfars/objects/dispatch-app-view.md (NOT YET AUTHORED — view-record over live dispatch state)
  - pyfars/objects/fleet-app-view.md (NOT YET AUTHORED — view-record over peer-records + per-host substrate)
  - pyfars/objects/review-app-view.md (NOT YET AUTHORED — view-record over promotion-pending entities)
  - pyfars/morphisms/migrating-saas.md (NOT YET AUTHORED — for saas-migration-validation)
acceptance: "Six 561-specific apps ship as a coherent stack: tasks, knowledge, governance, dispatch, fleet, review. The captain works for one full week using only the productivity stack on PyFARS — no Asana, no Obsidian, no external RFC tracker. As validation, the captain migrates one external SaaS tool (e.g., Asana) fully and decommissions the external account."
---

# M17 — 561 Productivity Stack

After [M14](m14-application-development-surface.md) (SDK), [M15](m15-bundled-userland.md) (daily-driver basics), and [M5](m5-agential-self-generation.md) (substrate-writeable governance), M17 ships the polity-specific layer — the apps that replace the captain's external SaaS tools and embody the 561 Group's distinctive operational shape.

This is the **CMS-shaped layer**: knowledge management, governance content, task content, dispatch records, agent state, feedback — all substrate-resident, all federation-ready, all dispatch-readable by the engine.
None of these apps store content in their own database; they project from substrate cells the engine and other apps share.

## What's built

### Tasks app — plans/tasks/milestones board

What it replaces: Asana, Todoist, Linear.

**Substrate basis:** task records ([predicated-work `task-cell-system`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/task-cell-system.md)), plan records ([`plan`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md)), milestone records (this very directory), workflow records.

**Views:** Plan board (kanban-style; columns derived from task lifecycle states the substrate already settles), Milestone view (the milestone records themselves rendered with their goal completion state), Task detail (assigned-to, dependencies, duty cells, completion witnesses), Burn-down (per-plan progress derived from the plan's milestone-cells settling history).

**Dispatch integration.** A task in the tasks app is the same task the engine's dispatch graph reads.
Marking a task as ready in the UI settles `(task:foo, ready, t)`; the dispatch graph picks it up on the next tick.
Marking complete settles the goal cell; the engine fires `on-complete:` follow-on workitems automatically.
There is no UI-to-engine bridge — the UI and the engine read the same cells.

**Reporting.** Per-plan time-and-cost reports use the same hledger machinery as [M15](m15-bundled-userland.md)'s ledger app: `attention:morgan:engineering` charges flow naturally into per-plan cost views.
A task's "actual time spent" is the sum of attention-account postings tagged with the task slug.

**GitHub Issues integration.** A task can mirror a GitHub issue: the substrate cell carries `(task:foo, mirrors-github-issue, owner/repo#123, t)`; a closure rule + GitHub driver keeps state synchronised in both directions.
This is M17's bridge for project work that needs to be visible to non-PyFARS contributors.

### Knowledge app — the CMS-shaped surface

What it replaces: Obsidian, Notion, internal wikis.

**Substrate basis:** the polity's `library/` and `concepts/` and `objects/` and `theorems/` etc. — every Markdown record is a knowledge-app entity.
The frontmatter carries the entity-type; the body is the content; the predicate-graph (depends-on, references, witnessed-by) is the navigation graph.

**Views:** Library browser (tree by directory, but also by predicate-derived faceting — show me all `type: theorem` records that depend-on `bilattice`), Full-text search (over body text, with frontmatter filters), Monograph builder (compose a sequence of records into a single render — for publishing, [M18](m18-publishing-and-learning.md) consumes these), Cell linking + back-linking (Obsidian-style; computed from `depends-on`/`references` frontmatter).

**Editing rides M15's text editor.** No separate editor; the knowledge app's "open this entity for editing" launches [M15](m15-bundled-userland.md) text-editor in markdown-with-frontmatter mode on the entity's file.
Edits are CRDT-collaborative; concurrent edits federate via [M6](m6-federation.md).

**Cross-entity reference integrity.** A closure rule enforces "no broken links": if `concepts/foo.md` depends-on `concepts/bar.md` and `bar.md` is deleted, the substrate produces `(concepts/foo.md, has-broken-reference, bar, t)` and the knowledge-app surfaces it as a fix-up workitem.

### Governance app — charter compliance, ADRs, votes

What it replaces: RFC trackers, Discourse, ADR Markdown-on-GitHub workflows.

**Substrate basis:** `governance/` — charter, charter-amendments, ADRs, votes, decisions, offices, duties, rights, jural relations.
All [predicated-governance](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/) records.

**Views:** Charter view (current charter rendered with amendment history; per-clause compliance status from closure rules), ADR workflow (draft → discussion → decision → ratified; each transition is a substrate event), Vote/proposal flow (proposal record → vote-cells per voter → ratification on quorum, per [M6'](m6prime-coordination-federation.md) quorum-records), Decision register (chronological + searchable), Triage workflow surface (incoming proposals, captain-review queue).

**Charter-binding violations surface here.** When the engine produces `(workitem:foo, charter-binding-violated, true, t)` (per [M2](m2-substrate-dispatch.md)'s eligibility-by-charter-binding rule), the governance app surfaces it as a review workitem.
The captain (or the governance-officer) judges, witnesses, and the dispatch graph picks up the resolution next tick.

### Dispatch app — office × task fiber composition

What it replaces: nothing in mainstream SaaS — substrate-native.

**Substrate basis:** the dispatch graph's own state ([M2](m2-substrate-dispatch.md)) — eligibility cells, selection cells, assignment cells, tick-firing records.

**Views:** Active fiber view (which `(workitem, dispatchable)` pairs are eligible right now; which the selection rule would pick), Tick history (every tick's firing log; per-tick budget consumption; per-tick rule firings), Rationale UI (for any given dispatch, the chain of eligibility-rule firings that admitted/refused each candidate; click on a rule to see its substrate definition), Auto-dispatch daemon controls (pause/resume; budget overrides per scope).

This makes the engine's reasoning *visible* to the captain.
The dispatch graph already produces the data ([M2](m2-substrate-dispatch.md)'s closure-runner provenance + `rsv_hash`); M17 surfaces it.

### Fleet app — sessions, agents, runbooks dashboard

**Substrate basis:** session records, agent records ([M5](m5-agential-self-generation.md) makes these substrate-writable), runbook records, agent-health cells.

**Views:** Active sessions (which agents are currently dispatched on what), Agent detail (per-agent state: capabilities, recent firings, current fuel-budget, witness chain), Runbook library + editor, Agent health metrics (per-agent dispatch latency, completion rate, $\top$-cell rate per agent — surfaces the [M3](m3-continuous-loop.md) anomaly metrics).

### Review app — failure analysis, observation log, instinct evolution

What it replaces: post-mortem docs, retrospective templates, learning-debt trackers.

**Substrate basis:** observation records ([predicated-work `observation`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/observation.md)), finding records ([`finding`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/finding.md)), adjustment records ([`adjustment`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/adjustment.md)), instinct records (M18 introduces these formally; M17 read-only previews).

**Views:** Failure analysis (clicking through from an anomaly cell in the dispatch app or fleet app surfaces here), Observation log (chronological captain observations; tagged by topic; searchable), Instinct evolution (preview of [M18](m18-publishing-and-learning.md)'s observation→instinct→skill→tool→hook pipeline; M17 ships read-only views, M18 ships the promotion machinery).

## Knowledge-as-commodity (the use case the productivity stack enables)

When operational practice lives as substrate cells (event-log segments, closure rules, practice objects, witness trails), it can shift from product-form to commodity-form.
The captain's framing example: a print-farm operator's swarm learns situated operational practice; selectively shares part of that practice with an apprentice's swarm; the apprentice runs, audits, forks, adapts the shared practice without inheriting customers, finances, or local authority.

This is qualitatively different from courses, PDFs, prompt packs, or SaaS workflows — those are inert information products.
Substrate-resident practice is *transferable situated capacity* another agentic substrate can actually run.

M17's apps are what make this possible: - The knowledge app is where the source operator authors and curates the practice cells. - The governance app gates which capabilities transfer with the practice (per [M14](m14-application-development-surface.md) capability-as-jural-relation). - The dispatch app handles the apprentice's swarm running the inherited practice. - The review app surfaces friction the apprentice surfaces back.

The use case crosses M17 + [M18](m18-publishing-and-learning.md) (publication channels) + [M14](m14-application-development-surface.md) (capabilities exposed across instances).
M17 is where it becomes operational rather than theoretical.

## What M17 does NOT claim

- **Not feature-parity with mature SaaS.** Asana has a decade of feature accretion; M17's tasks app does what the captain's plans need and nothing more.
  The point is *substrate-residency* — every action a witness, every record federation-ready — not feature parity.
  The captain accepts narrower features for these properties.
- **Not multi-polity.** M17 assumes one polity per substrate (the 561 Group).
  Multi-polity work (federations of polities, polity-spanning records) is later — would rescope individual apps.
- **Not unauthenticated public-facing.** M17 is the captain's *working surface* (authenticated).
  Public-facing rendering is [`public-projection`](../../concepts/public-projection.md) and the polity homepage at 561.group, separately.
  M17 + public-projection + [M18](m18-publishing-and-learning.md)'s site generation compose for publication.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `tasks-app` | Plans/tasks/milestones board; dispatch integration via shared cells; hledger-style cost reporting; GitHub Issues mirror | open |
| `knowledge-app` | Library browser + faceted search + monograph builder + back-linking; rides M15 text-editor for editing | open |
| `governance-app` | Charter view + ADR workflow + vote/proposal flow + decision register + triage queue | open |
| `dispatch-app` | Active-fiber view + tick history + rationale UI + auto-dispatch controls | open |
| `fleet-app` | Sessions + agents + runbooks dashboard + health metrics from M3 anomaly stream | open |
| `review-app` | Failure analysis + observation log + instinct-evolution preview (M18 ships full pipeline) | open |
| `saas-migration-validation` | Captain migrates one external SaaS tool fully and decommissions the external account | open |

## Done when

The captain works for one full week using only the productivity stack on PyFARS.
The captain migrates one external SaaS tool (Asana, Todoist, Obsidian, etc.) fully and decommissions the external account.
The substrate's witnesses cover the work the SaaS tool used to record.

## Theoretical shape

**CMS-as-projection.** The knowledge app is a *projection* of the substrate's library/concepts/objects fibers.
Adding a new concept record is *not* "creating a knowledge-base entry"; it's *settling a substrate cell* the knowledge app then renders.
Structurally distinct from SaaS CMSs (which store content in their own DB and project to a UI); PyFARS's CMS is projection-only — substrate is the truth.

**Productivity-stack-as-substrate-extension.** Each productivity app is a PyFARS application against the [M14](m14-application-development-surface.md) SDK.
They share substrate state with each other and with [M15](m15-bundled-userland.md) bundled apps and with the engine itself.
The dispatch app reading a task cell reads the *same* cell the engine's dispatch graph reads.

**Apps that can be authored by agents.** Per [M5](m5-agential-self-generation.md), an agent in PyFARS can author skills/runbooks/governance rules that the engine immediately dispatches against.
M17 makes this *visible to the captain*: the governance app surfaces newly-authored governance rules; the fleet app surfaces newly-authored agents; the tasks app surfaces newly-authored task workflows.

**The operations-loop made visible.** Closing the loop: tasks-app feeds dispatch-app feeds fleet-app feeds review-app feeds back into tasks-app. This is the [`operations-loop`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/operations-loop.md) made visible; the productivity stack is what the operations-loop looks like in the captain's hands.

## Related

- [Roadmap](roadmap.md)
- [M14 — Application Development Surface](m14-application-development-surface.md), [M15 — Bundled Userland](m15-bundled-userland.md), [M5 — Agential Self-Generation](m5-agential-self-generation.md) — prerequisites
- [M18 — Publishing & Continuous Learning](m18-publishing-and-learning.md) — what the productivity stack feeds when the loop closes
