---
title: "Directory schema for PyFARS instances"
type: specification
status: draft
authors: [emsenn, claude-opus-4-7]
date: 2026-05-07
supersedes: []
---


> **Status: draft (RFC).** PyFARS specifies how a corpus of frontmatter-markdown records is laid out on disk.
> A PyFARS *instance* — any repository configured to act as a PyFARS-tracked corpus, including the 561 superrepo — follows the schema this document defines.
> The schema is not yet enforced by code; this document precedes the enforcement.

## 1. Problem

PyFARS instances accrete content at many levels: a polity, the theories it carries, the tools it builds, the agents it dispatches, the personnel it employs.
Without a written rule for *what goes where*, every container in the lineage invents its own layout.
The same kind of record (a skill, an office, a decision) lands in different relative paths in different parts of the tree, walkers have to special-case each location, and reorganization is research-grade work each time it happens.

The captain's observation: only a handful of container-shapes actually exist, and they recur.
A polity has them.
A theory has them.
A tool has them.
Even a single agent might have them, when the agent is substantive enough to develop.
Once we name the small set of shapes, the layout collapses into a fractal: every level repeats the same pattern, scoped to itself.

## 2. The schema in one paragraph

A PyFARS container — any directory in a PyFARS instance that carries authored content — has at most five canonical subdirectories at its top level: **`governance/`**, **`work/`**, **`theories/`**, **`prose/`**, **`tools/`**.
Plus two self-description records: `_index.md` (navigation) and `<slug>.md` (the container as a record).
That is the whole schema.
Everything else lives *inside* one of the five.
The schema is recursive: any subdirectory may itself be a container with the same five facets, scoped to whatever the subdirectory is about.

## 3. Terminology

- **PyFARS instance.** A repository configured by a `.pyfars/config.toml` (or moral equivalent) to act as a PyFARS corpus.
  The 561 superrepo is one.
  Any downstream consumer of pyfars is one.
- **Container.** A directory in the lineage that carries authored content.
  Each container has a *scope* — the slice of the world it governs.
- **Record.** A frontmatter+markdown file.
  The fundamental unit of authored content.
- **Facet.** One of the five canonical subdirectories (`governance/`, `work/`, `theories/`, `prose/`, `tools/`) that a container may have.
- **Recursion principle.** The same five facets repeat at every level.
  What lives at each container is what is *scoped to that container*.

## 4. The five facets

A container has at most five canonical subdirectories, each with fixed semantics across the lineage.

| Facet | What it holds | Tense |
|---|---|---|
| `governance/` | What is settled within this container's scope. The container's *charter* of how it acts and what acts on its behalf. | The **past** that binds. |
| `work/` | What is in motion within this container's scope. Milestones, projects, tasks, the queue of incoming work, the working area where work-in-progress lives. | The **present**. |
| `theories/` | Knowledge content under this container. Recursive — each theory is itself a container with its own five facets. | The **structure** of what is known. |
| `prose/` | Long-form writing about this container, addressed to a reader. Tutorials, logs, how-to guides, explanations, narratives. | The **explanation** of the rest. |
| `tools/` | Sub-tool packages. Each tool is itself a container; tool containers additionally carry an implementation surface (`src/`, `tests/`, build files). | The **machinery**. |

A container may have any subset of the five.
A theory typically has `governance/`, `work/`, `prose/`, plus the theory's own knowledge content (sub-theories and the entity directories under §5.3).
A tool typically has `governance/`, `work/`, `prose/`, plus `src/` and friends.
A polity typically has all five.

The five names are reserved across the lineage.
`governance/skills/` always means "skills settled within this container's scope" — never something else.

## 5. Inside each facet

### 5.1 `governance/` — what is settled, and what acts on this container's behalf

Settled definitions live here.
So do the actors and assets the container exists to govern.

```
governance/
├── _index.md
├── <slug>.md                # governance-as-record (per §6)
├── charter.md               # the binding vision
├── conventions.md           # record schemas, frontmatter conventions, body format
├── agents/                  # agent records (LLM-backed, native, unix-tool, endpoint)
├── personnel/               # named individuals
├── persona/                 # non-individual character/role records
├── groups/                  # collective entities, working groups, committees
├── areas/                   # physical or virtual spatial scopes
├── assets/                  # non-record assets the container holds
│   ├── computing/           #   ↳ computer systems
│   └── user-accounts/       #   ↳ accounts on external systems
├── decisions/               # binding decisions (technical or operational)
├── offices/                 # office records (the role; people fill them via personnel/)
├── incumbents/              # incumbency tuples: who holds which office at what stage
├── powers/                  # power records (what an office may admit)
├── duties/                  # duty records (what a power-holder must do)
├── jural-relations/         # Hohfeldian active/passive pairs (power↔liability, duty↔claim, …)
├── norms/                   # rules of conduct as closure-firing obligations/permissions/prohibitions
├── jurisdictions/           # scope records: where an authority's powers are operative
├── boundaries/              # boundary substrate-records with handedness coordinate (inbound/outbound/bidirectional)
├── endpoints/               # outbound-only swarm participants (LLMEndpointRecord per FARS spec)
├── peers/                   # bidirectional sovereign-node confederation members
├── runbooks/                # multi-step procedures composed of skill invocations
├── skills/                  # skill records (executable procedures, recipe-shaped)
│   └── <gerunding-phrase>.md   # MUST be a gerund verb phrase
├── templates/               # record templates and authoring archetypes
├── ideas/                   # speculative not-yet-decisions
├── specifications/          # RFCs and protocol specs (this document!)
└── questions/               # open governance questions
```

The list is illustrative, not exhaustive — a container only carries the subdirectories it has content for.
Most theories' `governance/` is much smaller than the polity's.
Most agents have no `governance/` at all (they're records, not containers).

The conceptual hinge: governance holds **what governs and what is governed**.
Charter, conventions, decisions, norms are *what governs*.
Agents, personnel, persona, groups, areas, assets are *what is governed*.
Offices, incumbents, powers, duties, jural-relations, jurisdictions, skills, templates are the connective tissue between them.

The predgov-derived directories (`incumbents/`, `jural-relations/`, `norms/`, `jurisdictions/`) make the substrate carry first-class records for what was previously implicit:

- **`incumbents/`** — who currently holds which office (the body-natural occupant of the office's body-politic, with joint-settlement of institution and induction predicates).
  See [`predgov incumbent`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/incumbent.md).
- **`jural-relations/`** — Hohfeldian active/passive pairs.
  A `governance/powers/` record names a power; a `governance/jural-relations/` record names the pair (power, liability) bound by `correlate-of`.
  See [`predgov jural-relation`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jural-relation.md).
- **`norms/`** — rules of conduct as closure-firing obligations/permissions/prohibitions, distinct from charter (meta-rule), conventions (folkways with no closure), decisions (settled positions), or duties (subject-bound to a specific office).
  See [`predgov norm`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/norm.md).
- **`jurisdictions/`** — scope records for authorities.
  A power-grant without an explicit jurisdiction is implicitly polity-wide; a power scoped to a sub-base (subject-matter, temporal, personal) gets a jurisdiction record.
  See [`predgov jurisdiction`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jurisdiction.md).

The swarm-participant directories (`boundaries/`, `endpoints/`, `peers/`) make non-in-process swarm participation first-class.
PyFARS's swarm participants form three classes by [boundary handedness](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/swarm-participation-handedness.md):

- **`peers/`** — bidirectional sovereign-node confederation members (per [M6 — Federation](../../work/milestones/m6-federation.md)).
  Each peer has its own substrate, event log, rule-system version, governance.
- **`endpoints/`** — outbound-only LLM endpoints (per [M7 — Boundary Handedness and Outbound Endpoint Participation](../../work/milestones/m7-boundary-handedness-and-outbound-endpoints.md)).
  Each endpoint is a [`LLMEndpointRecord`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md) — capability, cost, rate-limit, no signing key, cannot initiate.
- **`boundaries/`** — boundary substrate-records with handedness coordinate.
  Inbound boundaries (per [M8 — Inbound Participation: MCP/A2A Clients](../../work/milestones/m8-inbound-participation-mcp-clients.md)) expose authenticated entry points.
  Outbound boundaries (M7) wrap endpoint dispatch with cost-witnessing and rate-limit observation projection.

`runbooks/` is per [M5 — Agential Self-Generation](../../work/milestones/m5-agential-self-generation.md) — multi-step procedures composed of skill invocations that the dispatch graph fires as single dispatchables.

Hooks live under `tools/hooks/` (§5.5), not here — they're runnable wirings, tool-shaped, even though their frontmatter governs when they fire and who can change them.

### 5.2 `work/` — what is in motion

Active tracking, plus the workflow areas that feed it.

```
work/
├── _index.md
├── <slug>.md                # work-as-record (per §6)
├── milestones/              # large-grained chunks
├── objectives/
├── goals/
├── campaigns/
├── projects/
├── plans/                   # multi-task coordinations with dependency-DAG and milestone cells
├── workflows/               # type-bounded compositions; the algebraic edge-graph of plans
├── tasks/
├── backlog/
├── recurrent-practices/     # closure-rule subsystems firing on a cadence (the tick, audits, etc.)
├── observations/            # readings of substrate state in their own fiber (Goodhart-isolated)
├── findings/                # structured judgments comparing observed vs. expected
├── reviews/                 # containers for findings (audits, retrospectives, stage-gates)
├── adjustments/             # finding-justified changes that close the operations loop
├── surveys/                 # completed reconnaissance documents
├── specs/                   # internal design specs
├── implementation/          # implementation guides
├── references/              # secondary material the work refers to
├── questions/               # open work-tracking questions
├── texts/                   # long-form work-related prose (kept inward)
├── inbox/                   # newly-arrived items not yet triaged
└── triage/                  # working area; segment "triage/" load-bearing
```

`work/inbox/` and `work/triage/` are the doorway and the working bench.
Items enter inbox, get processed in triage, and graduate either out of `work/` (into `governance/decisions/`, into a project's record, into a theory's content) or to nowhere (deletion).

`work/texts/` is for prose tied to ongoing work and kept inward — session journals, sprint summaries, notes that a future session of *this* container's work needs.
`prose/` is the outward-facing equivalent.

The predwork-derived directories (`plans/`, `workflows/`, `recurrent-practices/`, `observations/`, `findings/`, `reviews/`, `adjustments/`) make the operations-loop's structure first-class.
The hierarchy `objective → campaign → milestone → goal → task` is the *what* of work; the predwork-derived directories are the *how it moves and gets evaluated*:

- **`plans/`** — dependency-DAG coordinations of tasks with explicit milestone cells.
  Sit between goals and tasks when a goal's tasks need explicit ordering and joint-completion structure.
  See [`predwork plan`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md).
- **`workflows/`** — type-bounded compositions ($\tau_{\mathrm{in}} = \tau_{\mathrm{out}}$).
  Plans contain workflows as their internal task-graph; standalone workflows exist for recurring algebraic shapes (e.g., the dispatch graph).
  See [`predwork workflow`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/workflow.md).
- **`recurrent-practices/`** — closure-rule subsystems firing on a cadence.
  Unlike one-shot tasks, these have a different cohomological signature; nested practices have nested cycle-boundaries.
  See [`predwork recurrent-practice`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md).
- **`observations/`** — readings of substrate state in their own fiber (Goodhart-isolated; the metric never writes back into the observed entity).
  See [`predwork observation`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/observation.md).
- **`findings/`** — structured judgments comparing observed vs. expected, with single-loop / double-loop scope and witnessing cause-configurations (not labels).
  See [`predwork finding`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/finding.md).
- **`reviews/`** — thin containers for findings (audits, retrospectives, stage-gates).
- **`adjustments/`** — finding-justified changes that close the operations loop.
  See [`predwork adjustment`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/adjustment.md).

### 5.3 `theories/` — knowledge

Knowledge content.
Recursive — a theory is itself a container.

```
theories/
├── _index.md
├── <theory-slug>/                # one sub-theory; itself a container
│   ├── _index.md
│   ├── <theory-slug>.md          # this theory as a record
│   ├── theories/                 # sub-sub-theories
│   ├── concepts/                 # concept records
│   ├── objects/                  # object records (where the theory has categorical structure)
│   ├── morphisms/                # morphism records (same — math-theory shape)
│   ├── claims/                   # claim records (formerly "theorems"; the new canonical name)
│   ├── lemmas/
│   ├── definitions/
│   ├── examples/
│   ├── counterexamples/
│   ├── conjectures/
│   ├── computations/             # Lean files etc.
│   ├── lean/
│   ├── references/               # plus references.bib at the directory level
│   ├── audits/                   # audit reports about this theory
│   ├── governance/               # this theory's settled definitions (its charter, its skills, etc.)
│   ├── work/                     # this theory's active research questions
│   └── prose/                    # this theory's long-form writing
└── ...
```

The content directories (`concepts/`, `objects/`, …) are knowledge-specific and only appear inside a theory.
The four facets `governance/`, `work/`, `prose/` (and rarely `tools/`) appear if the theory is being actively developed.

### 5.4 `prose/` — long-form writing about this container

Subdirectories named by *content shape*.
The Diátaxis four (tutorials, how-to, reference, explanation) are recommended seeds; the canonical names are:

```
prose/
├── _index.md
├── tutorials/               # learning-oriented, step-by-step
├── how-to/                  # goal-oriented recipes
├── reference/               # information-oriented descriptions
├── explanation/             # understanding-oriented design discussions
└── logs/                    # temporal first-person session/project journals
```

Other subdirectory names (`guides/`, `narratives/`, `essays/`) are permitted when the content is actually that shape.
Don't force-fit Diátaxis when the shape is genuinely different.

`prose/` is for the **outside reader**.
The audience is someone who didn't author this container's contents.

### 5.5 `tools/` — sub-tool packages and tool-shaped record collections

Two kinds of contents live under `tools/`:

**Tool packages.** Each is itself a container with an implementation surface.

```
tools/
└── <tool-slug>/             # one tool package; itself a container
    ├── _index.md
    ├── <tool-slug>.md
    ├── src/                 # the code
    ├── tests/
    ├── pyproject.toml       # or Cargo.toml etc.
    ├── flake.nix
    ├── README.md            # short orientation; doorway into prose/
    ├── governance/          # tool-specific governance
    ├── work/                # tool-specific work tracking
    ├── prose/               # tool-specific docs
    ├── theories/            # rare: a tool's internal theory layer (PyFARS has one)
    └── tools/               # rarer still: nested tool packages
```

The implementation surface (`src/`, `tests/`, `pyproject.toml`, `flake.nix`) is what *makes the container a tool*.
A tool without `src/` is a tool record, not a tool container.

**Tool-shaped record collections.** Some kinds of records are themselves tooling — runnable artifacts wired into the substrate's automation rather than abstract definitions.
They live alongside tool packages under `tools/`:

```
tools/
├── hooks/                   # hook records: event-handler wirings
└── ...                      # other runnable-artifact collections as they appear
```

Hooks are the canonical example: a hook record is a settled wiring between a substrate event and a runnable handler — concrete tooling, not abstract governance.
The record sits under `tools/hooks/`; its frontmatter declares what it binds to and who can change it (governance-shaped metadata) but the record itself is a tool-shaped artifact.

This is the difference between `governance/skills/` (skills are settled procedures — what an agent *should* do) and `tools/hooks/` (hooks are settled wirings — what the substrate *will* do automatically).

## 6. Three-stage entity evolution

Every authored entity in the lineage progresses through up to three stages.
The earlier stages are lightweight; later stages exist only when the entity has grown the content to fill them. **Each stage retires the previous form**: there is no overlap.

### Stage 1 — flat record

```
<parent>/
└── <slug>.md                # the entity is a single file
```

The lightest form.
The entity has no sub-content of its own; it sits as one record among siblings in its parent's collection (`governance/skills/queuing-intents.md`, `governance/personnel/emsenn.md`).

### Stage 2 — promoted to folder

When sub-content accumulates (per-person history, per-project sub-records, supplementary files), the entity is promoted to a folder named for its slug.
The self-record moves inside, *keeping its slug name*:

```
<parent>/
└── <slug>/
    ├── _index.md             # navigation for the folder
    ├── <slug>.md             # the entity-as-record (now inside)
    └── ...                   # supplementary files, sub-records
```

The folder name carries the entity's identity; the file inside is slug-named so it survives the next promotion.

### Stage 3 — entity becomes a theory

When the entity is substantive enough to be reasoned about as its own theory — to have *concepts*, *claims*, *definitions*, *examples* — it grows the knowledge layer (§7).
The self-record migrates from the folder root into `concepts/`, where it becomes one concept among others:

```
<parent>/
└── <slug>/
    ├── _index.md
    ├── concepts/
    │   ├── _index.md
    │   └── <slug>.md         # the entity-as-self-concept (slug-named because siblings)
    ├── claims/
    ├── definitions/
    ├── examples/
    ├── governance/
    ├── work/
    ├── prose/
    └── (theories/, tools/ as needed)
```

At stage 3 the previous `<slug>/<slug>.md` retires; the canonical self-record is `<slug>/concepts/<slug>.md`.
The polity is at stage 3 (it is a theory of itself); a math theory in `theories/` is at stage 3.

### Promotion rules

- Default to stage 1.
  Promotion is cheap; premature folders are noise.
- Promote to stage 2 when supplementary content arrives.
- Promote to stage 3 when the entity has primitive concepts of its own that are independently citable.
- `_index.md` exists at every container (stages 2 and 3); it is mandatory navigation.
- A leaf-directory holding a flat collection of records (e.g., `governance/decisions/`) only carries `_index.md` — it is a collection, not a substantive entity, so it has no self-record.

## 8. The recursion principle

The same five facets recur at every level. **What lives at each container is what is scoped to that container.**

A skill about authoring papers on agentic computing lives at `theories/.../computing/governance/skills/<gerund-phrase>.md`.
A skill about bumping submodule pointers in the polity lives at `<polity>/governance/skills/<gerund-phrase>.md`.
A skill about adding a new harness to PyFARS lives at `tools/platform/pyfars/governance/skills/<gerund-phrase>.md`.

The same applies to decisions, offices, duties, agents, projects: each lives in the container whose scope it falls under.
A polity-wide decision lives at `<polity>/governance/decisions/`.
A theory-specific decision lives at the theory's `governance/decisions/`.
A tool-specific decision at the tool's `governance/decisions/`.

This is why the operational reorganization has to read each record to route it: a skill currently sitting at `operations/engineering/skills/foo.md` is not on its way to a single canonical home.
It's on its way to *whichever container is the right scope* — possibly a theory, possibly a tool, possibly the polity itself.

## 9. Naming conventions

N1. **Plural directories, singular files.** A directory holds a collection ⇒ plural name.
A file holds one record ⇒ singular name.
Exception: collective-noun records keep the singular form even when at a directory-eligible position (e.g., `charter.md` is one charter, not "charters").

N2. **Skills are gerund verb phrases.** `processing-X.md`, `writing-Y.md`, `installing-Z.md`.
Names indicate the activity the skill performs.

N3. **Lowercase-kebab-case** for both directory names and file slugs.

N4. **Index file is `_index.md`** with the underscore prefix.

N5. **One entity per file** at the leaf.
A single record holds one office, one skill, one decision — not a list.

N6. **Frontmatter required** on every authored `.md` file except `README.md` (which is doorway prose).

## 10. Composition rules

R1. **At-most-one-of-each.** A container holds at most one instance of each canonical subdirectory at its top level.
There is no case where `governance/` and `theory/` both exist as siblings; they refer to the same facet.

R2. **No-empty-decoration.** A canonical directory exists iff it has content.

R3. **Recursion.** Every subdirectory may itself be a container with the full schema, scoped to its own jurisdiction.

R4. **`_index.md` is mandatory** at every container with any other content.
`<slug>.md` is mandatory when the container is substantive enough to be a record in its own right.

R5. **Triage is a path segment.** A record under `<container>/work/triage/foo.md` is **not** the same record as `<container>/foo.md`.
The segment is load-bearing.

R6. **Generated outputs are not in the lineage.** Anything `pyfars install-harness` projects, anything Nix builds, anything a publisher generates — these live at gitignored paths under `.claude/`, `.openclaw/`, `.mcp.json`, `result/`, etc. They are not containers.

## 11. Migration: the routing rule

PyFARS instances that pre-date this spec hold content in legacy locations.
Migrating is **routing-by-scope**, not flat relocation.
For each legacy record:

1. **Read the record.**
2. **Identify its scope.** Is it polity-wide, theory-specific, tool-specific, agent-specific?
3. **Route to the appropriate container's appropriate facet.** A skill goes to that container's `governance/skills/`; an active project goes to `work/projects/`; a settled decision goes to `governance/decisions/`.

The 561 superrepo is one such migration.
Specific sub-migrations (texts/ → prose/, runbooks → governance/skills/, agents → governance/agents/, departments → routing-by-scope) are tracked as separate tasks at the polity's `work/`.
This RFC names *the rule*; the polity's task list names *the work*.

What this rule means concretely for legacy locations in the 561 instance:

- `operations/<dept>/` paths dissolve.
  `<dept>/` doesn't survive as a directory bucket.
  The "engineering vs science vs command" classification, when relevant, expresses through frontmatter, not paths.
- A record currently at `operations/engineering/skills/foo.md` may end up at *any* of: a theory's `governance/skills/`, a tool's `governance/skills/`, or `<polity>/governance/skills/`.
  The destination depends on what the skill is about.
- `operations/engineering/services/` deletes; the service-shaped records were always misfiled (services are runtime concerns belonging to the relevant tool, not records of the polity).
- `operations/science/research/` dissolves into `theories/`; each research note becomes (or grows into) theory content.
- `operations/.../texts/` and `theories/.../texts/` both dissolve into the corresponding `prose/`.

## 12. What this schema does not cover (yet)

- **Frontmatter schemas per record kind.** What fields a `kind: office` record requires, what fields a `type: skill` record requires.
  Those live in the conventions document or in per-kind specifications (planned: `specifications/record-kinds.md`).

- **Walker logic.** How `pyfars install-harness` and `pyfars validate` traverse a schema-conformant lineage is implementation, not schema.

- **Persistence semantics.** Whether a record is the source-of-truth or a projection from an event log is governed by the EAVT log architecture, not by this schema.
  A record's *location* follows this schema; whether the file is the truth or a projection is orthogonal.

- **Cross-container references.** Frontmatter relations (`depends-on:`, `cites:`, `serves:`, etc.) are governed by frontmatter conventions, not by directory schema.

- **Transitions.** A record being rewritten across a long migration may sit half-in-old-location, half-in-new for some duration.
  The schema accepts that as a lived state during a migration.

## 13. Acceptance criteria

This spec is *adopted* (not draft) when:

1. The captain has approved §4 (the five facets), §5 (their internal layouts), §6 (container-as-record), §7 (record promotion), §8 (the recursion principle).
2. The 561 polity has been migrated to fully match the schema, with operations/ dissolved.
3. `pyfars validate` (or some new walker) flags directories that violate the schema.

When all three hold, this document's `status:` flips from `draft` to `adopted`.
