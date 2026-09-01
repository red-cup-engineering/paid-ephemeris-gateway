# PyFARS Overview

PyFARS — the Python implementation of FARS (Flatfile Agentic Resource System) — gives you a single API for predication computation over unix flatfiles.
Files of any registered format (markdown frontmatter, JSON, YAML, Python source, plain markdown body) are projected into a typed predication store via the projector framework; closure-rule systems run over that store; queries, witness emission, federation by value-domain join all compose on top of the same substrate.

When the substrate also carries the agentic resources — agents, endpoints, offices, governance records, eligibility closure-rule records — the same engine can dispatch work, invoke agents, and operate as a polity.
Agentic operation is what a substrate becomes when those resources are available; it is not what pyfars requires to be useful.
Most of pyfars's capabilities run on any substrate; polity-shape is one configuration the substrate can take.

## Realization stack

The current realization (May 2026) is built on three load-bearing dependencies:

- **PyPredCalc** — the predication-categories engine providing `BilatticeValue`, `PredicationStore`, `StoreRule`, and `StoreClosureRuleSystem`.
  System cells live in a typed predication store; closure-rule systems compute fixed points over the store under the Belnap–Fitting four-valued bilattice.
- **LangGraph** — the state-graph runtime driving the `EngineProgram` lifecycle and the dispatch tick (`load → read_assignments → spawn`).
  Both are typed Pydantic state machines compiled from node functions.
- **PydanticAI** — the LLM-agent runtime inside `HarnessProgram`.
  Polity-authored agent records at `governance/agents/<slug>.md` are read at spawn time and instantiated as live PydanticAI agents with system prompts composed from the record's frontmatter and body.

## Core Principles

- **Any unix flatfile is fair game.** The projector framework turns arbitrary file formats into system cells.
  New formats become first-class by adding a projector.
- **The whole directory is the system.** Every entry point takes a polity root and walks it.
  There is no discovery file; defaults work for any subtree.
- **Four-frame discipline.** *Directory* / *system* / *polity* / *program* are distinct frames. *Substrate* names the whole stack.
- **One function per file.** Features come from new modules, not growing existing functions.
  Composition happens at call sites.
- **Polities own dispatch policy.** Closure-rule records under `objects/<slug>.md` activate runtime rules.
  Code is the runtime; cells are the policy.

## Architecture

PyFARS is organized into four frames per FARS theory's *four-frame discipline*: **directory** (bytes on disk), **system** (cells in the store), **polity** (institutional roles), **program** (running processes).
The Python packages correspond to those frames:

```
src/pyfars/
├── kernel/        SYSTEM FRAME — cells, closure, queries, witnesses, projectors
│   ├── store.py            System — query handle over a PredicationStore
│   ├── query.py            Cell-query helpers (subjects_of_type, objects_under, …)
│   ├── witness.py          Witness records + make_witness, hash_content/path
│   ├── event_log.py        JSONL append-only witness log
│   ├── closure.py          Closure-rule instantiator registry + StoreRule
│   │                       (subset-cover-positive, disqualification-negative,
│   │                       selection-by-load, subscription-arrival)
│   ├── projector/          bytes ↔ PredicationCell adjoint pairs:
│   │                       compound (dispatcher), markdown_frontmatter (with
│   │                       nested-YAML → dotted-path lowering),
│   │                       markdown_body, yaml_doc, json_doc, python_source,
│   │                       ledger
│   ├── operator/           Cell-mutating + cell-evaluating operators:
│   │   ├── edit/           fm_set, fm_add, fm_rm, rewrite_fm, rename_fm_key,
│   │   │                   rewrite_fm_slug, rewrite_body_link, snapshot
│   │   ├── auth/           check_authorization (FOUR residuation),
│   │   │                   compute_working_fiber (office × personnel → fiber),
│   │   │                   verify (witness-signature)
│   │   ├── federation.py   FederationEnvelope merge under cellwise ∨_k
│   │   ├── kind.py         seven-kind witness taxonomy
│   │   └── insertion / retraction / relocation
│   └── traversal/          ancestors, descendants, topo_sort, cycles,
│                           foundation_distance, descendant_counts
├── programs/      PROGRAM FRAME — processes executing operators on a system
│   ├── base.py             Program abstract base (validate → boot → run → halt)
│   ├── engine/             EngineProgram: UDS server + dispatch-tick loop.
│   │                       dispatch.py runs load → read_assignments → spawn
│   │                       per tick; spawns ScriptProgram / HarnessProgram /
│   │                       human-notification witness per Agent.type
│   ├── load_directory.py   Walk a directory, project each file to cells,
│   │                       emit one witness per file, return a loaded System
│   ├── materializer.py     System → directory materializer base
│   ├── nix_flake_materializer.py
│   │                       Concrete materializer — flake.nix from system cells
│   ├── harness.py          HarnessProgram: agentic-loop scaffolding. Every
│   │                       tool call passes through check_authorization
│   ├── script.py           ScriptProgram: one-shot subprocess enactment for
│   │                       automated-process agents
│   ├── bridge.py           BridgeProgram base for protocol translators
│   ├── mcp/, web/, identity/
│   │                       MCP / web / OAuth Authorization Server bridges
│   ├── federation.py       PyFARS ↔ PyFARS native federation
│   └── activitypub.py, a2a.py
│                           Federation bridges to external protocols (lossy)
├── sdk/           CROSS-FRAME SURFACE — typed views + shared tool primitives
│   ├── entities/           Pydantic typed views hydrated by load_one /
│   │                       load_all from cells: Agent, Assignment (minimal
│   │                       (workitem, agent) pairing), Office, JuralRelation
│   │                       (Hohfeldian), Channel, Credential, Endpoint, Event,
│   │                       FederationEnvelope, Harness, Hook, Intent, Message,
│   │                       Peer, Prompt, Session, Skill
│   ├── tools.py            Shared substrate-operation primitives — show_subject,
│   │                       polity_facts, list_offices, read_assignments,
│   │                       append_witness, read_memory, update_memory_section,
│   │                       recent_events
│   └── flatfile.py
├── client/        CROSS-FRAME — UDS client for talking to a running engine
│   └── uds.py
└── apps/          PROGRAM FRAME (UI) — CLI entry points + materializer template data
    ├── cli/                __main__ verb dispatcher; verbs `run` and `query`
    └── materializer_templates/
                            Jinja2 template sets (nix-flake, systemd-user,
                            claude-code-*, openclaw, cline-workflows, …)
```

The single load path is `load_one(EntityCls, store, subject)` — every entity is a typed view over cells.
No parallel persistence shape; no markdown re-parsing inside entities.
The single audit path is `make_witness(...) → uds.post_witness(...)
` — every state transition that the substrate cares about is a cell in the witness fiber.

## Getting Started

The CLI is *lifecycle-only* — boot an `EngineProgram` on a polity directory or run a one-shot query against a running engine.
Operations on a *running* engine go through its UDS-bound FastAPI app, not the CLI.
This is the Docker / Apache / systemd shape: the daemon's CLI is for starting and stopping; everything else goes through the running daemon's interface.

```bash
$ pyfars                              # list verbs
$ pyfars run                          # boot the engine on the current directory
$ pyfars run /path/to/polity          # boot the engine on another polity
$ pyfars query <subject> [predicate]  # one-shot UDS query against a running engine
```

`pyfars run` validates the polity root, boots the `EngineProgram` (`pyfars.programs.engine.program`), opens the event log, spawns supervised bridges, and ticks the dispatch graph (`pyfars.programs.engine.dispatch`).
SIGINT or SIGTERM halts cleanly.
Each tick reads Assignment subjects (polity-authored `(workitem, agent)` pairings produced by closure rules), diffs against the previous tick's set, emits birth/death witnesses, and — with `--autonomous` — spawns child programs (HarnessProgram for LLM-driven agents, ScriptProgram for automated-process agents, a notification witness for human agents).
On a polity without Assignment records, the engine still runs; the dispatch tick is a no-op.

Materializers (e.g. `NixFlakeMaterializerProgram`) are program-frame classes invoked directly, not via the CLI; the engine's `materialize` verb is the recommended entry point.

## Engine API

A running engine binds a Unix Domain Socket at `<polity-root>/.pyfars/run.sock`.
Local CLIs and tools speak HTTP/JSON over that socket via `pyfars.client.uds`; the same FastAPI app is exposed over TCP for cross-host clients with OAuth authentication; LLM agents speak MCP over the same surface (via `McpBridge`).
The presence of `.pyfars/run.sock` is the engine-running signal — `pyfars.client.uds.engine_root()` walks upward from CWD to find it.

## Extending PyFARS

### Add a New Projector

A *projector* is an adjoint pair `(extract, create)` between bytes-of-some-format and `pypredcalc.
PredicationCell` cells, satisfying the counit law `extract(create(cells)) ≈ cells`.

1. Write `src/pyfars/kernel/projector/<format>.py` exposing a `PROJECTOR` instance with `name`, `vocabulary`, `extract(data, *, subject) -> Iterable[PredicationCell]`, and (where invertible) `create(cells) -> data`.
2. Register the file extension in `EXTENSION_PROJECTORS` in `kernel/projector/compound.py`.
3. Write `tests/test_<format>_projection.py`.

Pure functions only at the atomic level; I/O lives in the compound orchestrator.

### Add a New Closure-Rule Shape

The closure-rule applicator (`pyfars.kernel.closure`) activates rules whose `objects/<slug>.md` records exist in the system.
Adding a new *named shape* means registering an instantiator that takes the store and the rule's parameters and emits grounded `StoreRule` objects.

1. Author `objects/<rule-slug>.md` with `type: closure-rule-record`, `shape: <shape-name>`, and the per-shape parameter cells the instantiator reads.
2. Write an instantiator in `src/pyfars/kernel/closure.py`:
   ```python
   def instantiate_<shape_name>(
       store: PredicationStore, params: dict[str, Any],
   ) -> list[StoreRule]:
       ...   # walk the store; emit grounded StoreRule objects
   ```
3. Register `"<shape-name>": instantiate_<shape_name>` in `_NAMED_SHAPE_INSTANTIATORS`.
4. Write `tests/test_<shape_name>.py`.

Presence of the substrate record activates the rule; removing the record deactivates it.

### Add a New Materializer

A *materializer* is a system → directory program.
The Nix-flake materializer is the reference shape.

1. Subclass `MaterializerProgram` (or `ServiceMaterializerProgram` if you need a supervisor handoff) in `src/pyfars/programs/<name>_materializer.py`.
2. Implement `materialize(self, system: System) -> Mapping[Path, bytes]` — pure, reads cells, returns file contents.
3. Write per-materializer Jinja2 templates under `src/pyfars/apps/materializer_templates/<slug>/templates/`; the directory's `_index.md` declares `kind: materializer-template`.
4. Write `tests/test_<name>_materializer.py`.

### Add a New Entity

An *entity* is a Pydantic typed view over cells.
The shape is read back from the store by `load_one(EntityCls, store, subject)`.

1. Write `src/pyfars/sdk/entities/<name>.py` with a Pydantic `BaseModel`.
  Use `Field(alias=...)
  ` for hyphenated cell predicates.
  Tag with `@fars_object("concepts/<concept-slug>")` to bind the class to its FARS-theory concept.
2. Export from `src/pyfars/sdk/entities/__init__.py`.
3. Write `tests/test_<name>_entity.py`.

The shape carries data; mutation goes through the kernel operators or `sdk.tools` — never through entity methods on the cell-store.

## Design Rules

- **Four-frame discipline.** *Directory* = bytes; *system* = cells; *polity* = institutional roles; *program* = process.
  The Python packages mirror the frames (`kernel` ⇒ system, `programs` ⇒ program, `sdk` ⇒ cross-frame typed views). *Substrate* names the whole stack, never one frame.
- **The CLI is lifecycle-only.** `run` boots the engine; `query` is a one-shot UDS read.
  Everything else goes through the engine's UDS-bound API (or a Bridge program).
- **Polities own the math.** Closure-rule records under `objects/<slug>.md` activate runtime rules.
  Code is the runtime; cells are the policy.
  The runtime carries no hardcoded rule list.
- **One way to do everything.** Assignments are `(workitem, agent)` and nothing else.
  Entities are typed views hydrated via `load_one`.
  Tool calls in HarnessProgram go through `check_authorization`.
  Materializers go through `MaterializerProgram`.
- **Witnesses are the audit primitive.** Every state change emits a `Witness` to the JSONL event log.
  The log replays into derived state via `pyfars.kernel.query.belief_fold`'s cellwise FOUR knowledge-join.
- **Federation goes through the substrate's value-domain join.** Cellwise `∨_k` over the Belnap–Fitting FOUR.

## Theoretical Foundation

PyFARS implements the predication substrate described in the repository's mathematical theory program:

- **Predication Category Theory**: The foundational mathematical framework.
  Bilattice values, predication fibrations, the closure 2-monad, the four-regime classification.
- **Predicated Computing Theory**: Engineering theory of computers whose primary substrate is the predication cell.
- **Flatfile Agentic Resource System (FARS) Theory**: Sub-sub-theory under agential-orchestration: agential predicated-computing systems whose substrate is a corpus of unix flatfiles.
- **PyFARS as Realization**: The Python implementation that runs.

Substrate cells take the form `(subject, predicate, object) ↦ BilatticeValue`.
The projector framework lifts cells out of any registered file format; the closure-rule system computes fixed points; agents read and act through the same substrate.

For detailed mathematical background, see the `theories/` directory in the repository root, particularly:

- `theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/`
- `theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/`
- `theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/`
- `theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/`

## Running and Testing

PyFARS is built and exercised through Nix.
From the PyFARS repository root:

```bash
# Development shell
nix develop -c pyfars <verb> [args...]

# Build the package
nix build
nix run .#pyfars -- <verb> [args...]

# From the 561 meta-repo, normal live-system work:
make install  # installs pyfars into the user's Nix profile
```

### Tests

```bash
# Package-level gate
nix flake check

# Faster local narrowing inside the devshell
nix develop -c pytest tests -q
```

The test suite covers kernel primitives (store, witness, event log, projectors, edits), entities (Assignment, JuralRelation, Session), closure-rule shapes (selection-by-load), the dispatch tick (load → read_assignments → spawn), the FOUR-residuation authorization gate, the Memory-Bank tools, and the nested-YAML projection round-trip.

## History

The package was first greenfield-rebuilt from `operations/engineering/tools/triage/` (deleted), collapsing six ad-hoc Python workspaces and a 700-line query module into one library.

The May 2026 refactor settled the runtime on **PyPredCalc + LangGraph + PydanticAI** and reorganized the package around the four-frame discipline:

  - The cell-store + projectors + operators became `pyfars.kernel`
    (system frame).
  - The Program-class hierarchy (EngineProgram, HarnessProgram,
    ScriptProgram, materializers, bridges) became `pyfars.programs`
    (program frame).
  - The Pydantic typed views + shared tool surface became
    `pyfars.sdk`.
  - The Assignment entity was collapsed to a minimal
    `(workitem, agent)` pairing; status / priority / routing live as
    polity-authored cells around the workitem.
  - The dispatch tick became a pure scheduler; LLM-driven work runs
    inside HarnessProgram where every tool call passes through
    `check_authorization`.
  - The markdown-frontmatter projector gained nested-YAML →
    dotted-path predicate lowering, making nested polity declarations
    first-class system cells.

## Further Reading

- The [README](../README.md) for the public-facing overview, OpenClaw integration, and CLI quick-start.
- [`prose/`](../prose/) for Diátaxis-organized long-form docs (tutorials, how-tos, explanation).
- [`work/`](../work/) for active goals, milestones, tasks, and the theory-derivation loop.
- [`governance/`](../governance/) for the charter, decisions, offices, conventions, specifications, and skills.
- [`concepts/`](../concepts/), [`objects/`](../objects/), [`morphisms/`](../morphisms/), [`claims/`](../claims/) for the self-theory atoms.
