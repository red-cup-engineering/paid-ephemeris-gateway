---
title: "PyFARS — lawful refactor to substrate-cell-store"
type: plan
status: planning
date: 2026-05-10
author: pyfars-xo
realizes: [plan]
---


## What this plan does

PyFARS currently runs two parallel data layers: the substrate cell store (loaded once, queried as cells) and a dense network of `parse_X(path)` / `discover_X(root)` functions across `entities/`, `runtime/`, `closure/`, `analyze/`, `render/`, `web/`, `cli/`, `mcp/` that re-walk the filesystem and re-parse markdown to construct typed views.
The two layers are not partial-compatible: the cell-store law forbids parallel reads, and parallel reads exist.

This plan drives every cell asserting the parallel-reads structure to ⊥ (Phase 1: cuts), then drives the substrate-cell-store structure from ⊥ to T (Phase 2: rewires).
Phase 1 commits in one atomic move with no rewires inside it; Phase 2 commits in one atomic move with no cuts inside it.
There is **no** intermediate "both layers exist with shims" commit, because that is the bilattice-⊤ state — a closure-absorber from which no monotonic forward path exists.
See `work/inbox/friction/2026-05-10-cuts-before-rewires-refactor-discipline.md` for the categorical reasoning.

## Ambient law (B) — what survives at the end

PyFARS is a **flatfile agentic resource system**.
The kernel:

1. **Reads** a tree of flatfiles ("polity") and projects every file into cells `(subject, predicate, object) → bilattice-value` in a `PredicationStore`.
2. **Closes** the store under `closure-rule-record` cells in the substrate via pypredcalc's `StoreClosureRuleSystem`.
  Named-shape instantiators (`subset-cover-positive`, `selection-by-load`, `disqualification-negative`, `subscription-arrival`) live in the engine; specific rule records live in the polity.
3. **Ticks** — load → close → discover dispatch intents → eligibility-by-caps + selection-by-load → compile agent system prompt from charter + offices + duties + skills + endpoint → dispatch to LLM endpoint → emit witness → append events to channels → repeat.
4. **Mutates** the substrate via operators that route through projectors and emit witnesses.
5. **Boundaries** — web (HTTP), MCP (tool surface), CLI — wrap the above; thin.
6. **Typed Python views** (Pydantic) are constructed from cells via `load_one(cls, store, slug, by_slug=)`.
  They never re-walk the filesystem, never carry `source_path`, never reach for `parse_fm`.

There is **one** read path (the store, queried), **one** write path (operators with witnesses), **one** closure path (`StoreClosureRuleSystem`).
Anything else is wrong-regime and goes to ⊥.

## Phase 1: cuts

Every cell below is driven from T to ⊥ in a single atomic deletion.
After Phase 1 the package may not load.
That is the correct intermediate state — a partially-specified, non- contradictory codebase.

### Entities — drop wrong-regime structure

- Every `parse_X(path)` and `discover_X(root)` function across `src/pyfars/entities/*.py`.
  (Already done for most, finish for `agent_record`, `dispatch_assignment`, `dispatch_intent`, `endpoint`, `harness`, `hook`, `office`, `runbook`, `skill`.)
- Field `source_path: Path | None` on every entity Pydantic class.
- Method `EndpointRouter.from_polity(root)` and any other classmethod that takes a `Path`.
- Import `from pyfars.substrate.parse.frontmatter import parse as parse_fm` from any entity module.
- Import `from pathlib import Path` from any entity module that no longer needs it.

### Entities — drop entire modules with no surviving consumer

After scanning for consumers in `runtime/`, `web/`, `mcp/`, `cli/`, `auth/`, `operator/`, `api.py`:

- `entities/derivation.py`, `inquiry.py`, `procedure.py`, `process.py` — workitem subclasses; not used in the dispatch loop.
- `entities/idea.py`, `plan.py`, `runbook.py` — workitem variants; not used.
- `entities/instinct.py`, `observation.py` — settlement-path concepts; not used.
- `entities/duty.py`, `jural_relation.py` — predicate-shaped, not Pydantic-class-shaped; live as cells.
- `entities/personnel.py`, `polity.py`, `ship.py` — not used.
- `entities/tool.py` — overlaps with `unix_tool`; not used.
- `entities/closure_rule.py` — closure rules are substrate records, not Pydantic classes.
- `entities/work_record.py`, `workitem.py` — work records live as cells; the dispatch loop reads them as cells, not as typed views.
- `entities/subscription.py` — subscription-arrival lives as cells consumed by the named-shape instantiator.
- Any `__init__.py` re-exports for the deleted classes.

What survives in entities/: `agent_record.py`, `office.py`, `skill.py`, `endpoint.py`, `channel.py`, `witness.py`, `event.py`, `message.py`, `prompt.py`, `dispatch_intent.py`, `dispatch_assignment.py`, `harness.py`, `hook.py`, `_load.py`. ~14 modules.
Each carries the Pydantic class, no parse/discover, no `source_path`.

### Closure / lint / valuation — userspace, not engine

- All of `closure/lint/*` — userspace lint rules.
- All of `closure/rule/*` — engine-side hardcoded lint rules.
  The shape registry (subset-cover-positive, etc.) lives in `runtime/eligibility_rules.py`; specific lint instances belong in a polity as substrate-authored closure-rule-records.
- All of `closure/valuation/*` — userspace.
- `closure/__init__.py` exports of all of the above.

### Analyze / render — userspace, not engine

- All of `src/pyfars/analyze/*` — `commit_witness_coverage.py`, `inbound_refs.py`, `stats.py`.
  Userspace audit tooling.
- All of `src/pyfars/render/*` — userspace rendering.

### Spec / harness markdown / misc

- `src/pyfars/spec.py` — pre-substrate spec authority; gone.
- `src/pyfars/harnesses/*/_index.md` references to `discover_X` / `parse_X` source-name strings: *retain* the source registry names (they're slug strings the substrate still recognizes), but ensure the strings refer to the substrate query identifiers, not deleted Python functions.

### Substrate — drop pre-substrate shims

- `substrate/load/polity.py` — back-compat shim wrapping `load_with_notes`.
  Callers should import from `pyfars.substrate.load` directly.
- `substrate/load/_singularize.py`, `substrate/load/_corpus_root.py` if only used by deleted code.
- `substrate/parse/*` modules other than `frontmatter.py` (used by the markdown projector), if any.

### Runtime — drop path-based shims

- `runtime/agent_compiler.compile_agent(record_path)` — path-based wrapper.
  Caller compiles `AgentRecord` from store directly.
- `runtime/substrate_tools._authorize` use of `parse_agent_record(record_path)` — looks up agent in store.
- `runtime/enactment._resolve_skill(root, slug)` — path tree walk.
- `runtime/eligibility_rules.apply_active_rules` root-based code path — substrate-handle-based should be the only entry.

### Operator — drop operators not used by tick / boundaries

After scanning the dispatch loop and boundary surfaces:

- Specialized `operator/edit/*` subcommands not called by `runtime/*` or boundaries — keep only the four canonical primitives: insertion, retraction, relocation, edit.
- The witness emission path stays.

### Boundary cruft

- `web/app.py` use of `discover_skill_packs` and `discover_dispatch_assignments` — deletion targets.
- `cli/install_harness.py` use of `parse_harness` — deletion target.
- `cli/_runner.py`, `cli/help.py`, `cli/clean.py`, `cli/hook_dispatch.py` — keep only what wraps engine API.

### Tests

Already deleted by the captain.
Nothing to do.

### Substrate validator (?)

If the engine needs a "substrate is well-formed" validator at boot (broken links, missing slugs, etc.), it can be ONE function on the substrate handle, calling pypredcalc's closure machinery against substrate-authored closure-rule-records.
No `closure/lint/` tree.

## Intermediate state (⊥)

After Phase 1, the package contains:

```
src/pyfars/
  substrate/        # kernel: load → cells; project; query; operate
    load/           # walk + project (no polity shim)
    projector/      # md, yaml, json, py, bib
    parse/frontmatter.py
    operator/       # file mutation primitives
    query.py
    store.py
    rule_language.py  # YAML rule grounder
  runtime/          # engine: closure, tick, dispatch, agent compile
    eligibility_rules.py  # named-shape registry + apply
    agent_compiler.py     # AgentRecord → CompiledAgent
    dispatch_graph.py     # tick's LangGraph
    enactment.py          # skill execution
    event_log.py          # channels + append
    harness_installer.py  # template-driven install
    lifecycle.py          # boot/halt
    profile.py            # runtime profile
    services.py           # web/mcp services boot
    substrate_tools.py    # six agent tools
    tool_registry.py      # tool registry
  entities/         # ~14 typed views (no parse, no discover)
    _load.py        # load_one, load_all
    agent_record.py
    channel.py
    dispatch_assignment.py
    dispatch_intent.py
    endpoint.py
    event.py
    harness.py
    hook.py
    message.py
    office.py
    prompt.py
    skill.py
    witness.py
  web/              # HTTP boundary
  mcp/              # MCP boundary
  cli/              # CLI boundary
  auth/             # OAuth (web)
  harnesses/        # harness templates (markdown)
  api.py            # SDK surface
```

Imports may be broken; the package may not load.
The structure is visible.
There are no shims, no parallel paths, no cells asserting the wrong-regime structure.

## Phase 2: rewires

One commit, no cuts inside it.
Build the substrate-cell-store algebra over the ⊥ intermediate.

1. **`load_one`, `load_all`** in `entities/_load.py` are the universal loaders.
  (Already authored.)
2. Every consumer that needs a typed view calls `load_one(EntityClass, substrate.store, slug, by_slug=substrate.by_slug)`.
  No classmethod indirection unless the entity needs entity-specific massaging.
3. **Runtime functions take Substrate.** `apply_active_rules` takes `substrate`; `compile_agent` takes `(substrate, slug, router)`; `_resolve_skill` takes `(substrate, slug)`; the tick's LangGraph takes `substrate`.
4. **Boundaries take Substrate.** `web.create_app(substrate)`, `mcp.tools(substrate)`, CLI commands construct Substrate from a polity root and pass it down.
5. **Harness installer source registry** stays as substrate query identifiers (`agent-record`, `office`, `skill`, etc.); the harness markdown templates reference these names, the `_records_of_type` helper does the substrate query.
6. **Verify the package loads** and `pyfars run <polity>` boots the engine, loads substrate, runs at least one tick, dispatches at least one prompt, emits at least one witness.

## Sequence

| Commit | What |
|---|---|
| `+phase-1` | Every cut listed above, atomic. Imports break; package may not load. No tests (already gone). |
| `+phase-2` | Every rewire listed above, atomic. Package loads. `pyfars run <polity>` produces at least one dispatch witness. |

Optional follow-up commits for renames (e.g. `runtime/eligibility_rules.py` → `runtime/closure.py`) — not part of this plan.

## Why two commits and not more

A third "stabilizing" commit between Phase 1 and Phase 2 is exactly the cruft attractor.
Splitting either phase across multiple commits reintroduces the halfway-state pathology — each sub-phase commit is a partial migration that asserts both old and new structure simultaneously, producing the bilattice-⊤ contradiction.
Two commits, no more.

## Out of scope

- Polity content (Farstone, the 561 substrate, etc.) — a polity is downstream of PyFARS; PyFARS has no opinion on its content.
- Test suite reconstruction — captain's call when to add tests back; not blocking the migration.
- Theory work — separate agent is formalizing the bilattice account of refactor regimes.
- Renames for clarity (`agent_record.py` → `agent.py`, etc.) — clean follow-up work; not part of this lawful refactor.
