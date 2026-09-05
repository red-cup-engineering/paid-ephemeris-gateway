---
title: "Python Implementation Guide"
description: "Guidelines for developing PyFARS in Python"
kind: implementation-guide
status: active
version: "0.2"
date: "2026-05-08"
---


This document provides guidelines for developing PyFARS in Python, ensuring consistency with the substrate-of-cells design and the realization stack (PyPredCalc + LangGraph + PydanticAI).

## Source Layout

PyFARS is organized into the following layers:

```
src/pyfars/
├── substrate/    Substrate primitives over arbitrary unix flatfiles
│   ├── projector/  Format-projector framework (data ↔ pypredcalc cells)
│   ├── parse/      Text → typed (frontmatter, links, citations, bibtex)
│   ├── load/       Path → typed (flatfile, flatfiles, bib, path filters)
│   ├── index/      Collection → derived (by_slug, by_kind, edges, …)
│   ├── types/      Flatfile, Predication, Diagnostic, Suggestion, …
│   ├── bilattice.py    BilatticeValue (bridges to pypredcalc.algebra)
│   ├── endpoint.py     Endpoint record loader
│   └── store.py        Substrate handle with cached-property indexes
├── operator/     Substrate operators (traversal, edit, witness)
├── closure/      Substrate validation/lint over the markdown view
│   ├── valuation/  Note → number/bool
│   ├── rule/       Corpus → diagnostics
│   └── lint/       Corpus → suggestions
├── runtime/      LangGraph-driven engine
│   ├── lifecycle.py        validate → boot → tick → halt StateGraph
│   ├── dispatch_graph.py   load_store → apply_eligibility_rules → … StateGraph
│   ├── eligibility_rules.py  closure-rule instantiator registry
│   ├── closure_runner.py   Kleene closure with provenance + rsv_hash
│   ├── agent_compiler.py   substrate record → PydanticAI Agent
│   ├── services.py         supervised long-running coroutines
│   ├── event_log.py, ledger.py, federation.py, boundary.py,
│   ├── belief.py, promote.py, group.py, office.py, session.py, …
├── analyze/      Read-only analytical queries
├── render/       Data → string
├── skills/       Substrate skill records and helpers
├── web/          FastAPI app
├── harnesses/    Installable harness packages
└── cli/          Lifecycle CLI: __main__, run, install_harness, clean, help

src/pyfars/
├── api.py        Programmatic entry points
├── convention.py KIND_LABEL, RELATION_KEYS, INTERNAL_FIELDS, …
├── spec.py       VerbSpec + Parameter + argparse/help generators
└── __main__.py   module dispatcher for the `pyfars` console script
```

The `closure/` substrate-validation layer is **not** the same as the runtime closure-rule system.
`closure/` produces diagnostics over the markdown view of authored content; `runtime/eligibility_rules.py` + `runtime/closure_runner.py` apply substrate-authorized closure rules over the typed `pypredcalc.
PredicationStore` at dispatch time.

## Core Principles

### 1. Any unix flatfile is fair game

PyFARS's substrate is the projector framework over arbitrary file formats.
Markdown frontmatter is one projector among `json_doc`, `yaml_doc`, `python_source`, `markdown_body`, `compound`.
New formats become first-class by adding a projector.

### 2. The CLI is lifecycle-only

`pyfars run / install / clean / help`.
Operations on a running engine go through its UDS-bound API per `governance/specifications/wiring-protocols.md` §4.2.
Don't add operational verbs to the CLI.

### 3. Substrate is the source for dispatch policy

Closure rule records under `objects/<slug>.md` activate runtime rules.
Code is the runtime; cells are the policy.
Don't hardcode dispatch logic; author a rule record + instantiator.

### 4. One function per file

Features are implemented by adding modules, not by growing existing functions.
Composition happens at call sites.

### 5. Constants live in one place

- `convention.py`: KIND_LABEL, RELATION_KEYS, INTERNAL_FIELDS
- `spec.py`: VerbSpec + Parameter + argparse/help generators
- Don't duplicate.

### 6. Witnesses are the audit primitive

Every state change emits a `Witness` to the JSONL event log per `runtime/event_log.py`.
The log replays into derived state via `runtime/belief.py`'s cellwise fold.

### 7. API-first design

Operations are available as clean Python functions (`pyfars/api.py`) and as engine API endpoints (UDS-bound FastAPI app).
The CLI is thin lifecycle wrappers over the API.

## Development Workflow

### Adding a new substrate operation

1. Identify the appropriate layer (`substrate/`, `operator/`, `closure/`, `runtime/`, `analyze/`, etc.).
2. Create a new file with one primary function.
3. Add necessary imports from lower layers.
4. Ensure function is pure where possible.
5. Add unit tests in `tests/`.
6. If appropriate, expose via `api.py`.

### Adding a new projector

A *projector* is an adjoint pair `(extract, create)` between bytes-of-some-format and `pypredcalc.
PredicationCell` cells satisfying the counit law `extract(create(cells)) ≈ cells`.

1. Write `src/pyfars/substrate/projector/<format>.py` exposing a `PROJECTOR` instance with `name`, `vocabulary`, `extract`, and (where invertible) `create`.
2. Register the file extension in `EXTENSION_PROJECTORS` in `compound.py`.
3. Write `tests/test_projector_<format>.py`.

### Adding a new eligibility closure rule

The dispatch graph activates closure rules whose `objects/<slug>.md` records exist.
Adding a rule:

1. Author `objects/<rule-slug>.md` declaring the rule's antecedent / consequent shape.
2. Write an instantiator in `src/pyfars/runtime/eligibility_rules.py`:
   ```python
   def instantiate_<rule_slug>(store: PredicationStore) -> list[StoreRule]:
       ...   # walk the store; emit grounded StoreRule objects
   ```
3. Register `"<rule-slug>": instantiate_<rule_slug>` in `RULE_INSTANTIATORS`.
4. Write `tests/test_runtime_eligibility_<rule_slug>.py`.

### Adding a new substrate-validation rule

1. Write `src/pyfars/closure/rule/<name>.py` exporting `def check(notes, ...) -> Iterator[Diagnostic]`.
2. Add the import + call in `closure/rule/compose_rules.py`.
3. Add the (code, title) entry to `render/diagnostics_report.py`'s `DEFAULT_SECTION_ORDER`.
4. Write `tests/test_rule_<name>.py`.

### Adding a new score (valuation)

1. Write `src/pyfars/closure/valuation/<name>.py` exporting `def score(note_or_slug, *, ...) -> ...
  `.
  One function, no orchestration.
2. Compose with others via `closure/valuation/composite.score(*signals, combine=...)
  ` for multi-signal products.

### Adding a new lifecycle CLI verb

The CLI is lifecycle-only.
New verbs are extremely rare; the four existing verbs (`run`, `install`, `clean`, `help`) cover the lifecycle.
Operational verbs go into the engine API surface, not the CLI.

If a genuine lifecycle verb is needed:

1. Write `src/pyfars/cli/<verb>.py` with a `SPEC: VerbSpec` constant and a `main(argv)` entry.
2. Add the verb to `VERB_MODULES` in `cli/__main__.py`.
3. Add a CLI smoke test entry.

### Adding a new harness

A *harness* is a runtime-specific view of the substrate for an external agent runtime.

1. Create `src/pyfars/harnesses/<harness>/` with `_index.md` (`type: harness`) and `templates/`.
2. Implement install / uninstall logic; the `install_harness` CLI dispatcher reads each harness's manifest.
3. The new harness becomes available as `pyfars install <harness>`.

## Testing

### Unit Tests

- Place in `tests/` following module structure.
- Test pure functions in isolation.
- Mock dependencies when necessary.

### Property Tests

- Place in `tests/property/` using hypothesis.
- Test invariants (closure idempotence, projector counit law, etc.).

### Conformance Tests

- Place in `tests/conformance/` for critical substrate behaviors.
- These gate releases.

### CLI Smoke Tests

- Place in `tests/test_cli_smoke.py`.
- Test lifecycle CLI verb execution.

### Integration Tests

- Test harness projection.
- Test API accessibility.
- Test end-to-end dispatch via the lifecycle StateGraph.

## Documentation

### Module Docstrings

Each module should have a docstring explaining its purpose and (where applicable) the FARS spec section it implements:

```python
"""Substrate operator for rewriting frontmatter keys.

Specs: theories/.../flatfile-agentic-resource-system/morphisms/edit.md
"""
```

## Related

- [Charter](../../governance/charter.md)
- [Decisions](../../governance/decisions/)
- [Wiring Protocols](../../governance/specifications/wiring-protocols.md)
- [Substrate-Driven Dispatch](substrate-driven-dispatch.md)
- [OpenClaw as Interface](openclaw-as-interface.md)
- [Substrate Purity Decision](../../governance/decisions/substrate-purity.md)
- [OpenClaw-First Decision](../../governance/decisions/openclaw-first.md)

--- *This guide adapts principles from PyPredCalc's implementation guides, tailored to PyFARS' role as the substrate-of-cells layer for predication computation over arbitrary unix flatfiles.*
