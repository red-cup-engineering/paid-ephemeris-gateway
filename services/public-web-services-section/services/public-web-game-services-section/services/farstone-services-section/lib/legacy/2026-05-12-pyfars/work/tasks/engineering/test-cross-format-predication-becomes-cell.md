---
title: "Test cross-format predication becomes a substrate cell"
type: task
area: engineering
status: open
horizon: doing
milestone: m11-assurance-audit-chain-export
goal: polyglot-source-projectors
depends-on: [implement-compound-polyglot-projector]
requires-capabilities: [code-authoring, testing]
theory-basis: [projector-framework-counit]
---


## Description

Build the acceptance test for the polyglot-source-projectors goal: a query crossing file-format boundaries (e.g., "find every Python function name that appears as a key in a TOML config file") produces substrate cells the closure-rule system can fire on.
This is the load-bearing claim — projection-of-different-formats produces *cells*, not format-segregated artifacts; the substrate's algebra applies uniformly.

Test corpus: a fixture project with `pyproject.toml` declaring entrypoints, `setup.cfg` declaring dependencies, and `src/<package>/` Python source.
The query "what entrypoints in `pyproject.toml` reference functions defined in `src/`?" produces cells whose firing emits a result.

Acceptance is binary: either the cross-format query works (test passes) or it doesn't (test fails).
A passing test closes the polyglot-source-projectors goal; failing test produces a finding identifying which projector is the blocker.

## Acceptance

- [ ] Test fixture in `tests/fixtures/polyglot-corpus/` exists with the cross-format dependency described.
- [ ] Test in `tests/projectors/test_cross_format_query.py` runs the compound projector, runs a closure-rule query crossing formats, asserts the expected result cells.
- [ ] Test passes in CI.
- [ ] Test failure produces a useful diagnostic identifying which projector or query stage failed.

## Progress cells

*(empty — task not yet started)*
