---
title: "Implement the Python source projector"
type: task
area: engineering
status: open
horizon: doing
milestone: m11-assurance-audit-chain-export
goal: polyglot-source-projectors
depends-on: [finalize-projector-protocol-as-adjoint-pair]
requires-capabilities: [code-authoring, ast-parsing]
theory-basis: [projector-framework-counit]
---


## Description

Implement the projector that takes Python source files and produces substrate cells: per-function cells, per-class cells, per-import cells, per-decorator cells, signature cells, docstring cells.
The projection makes Python source readable as substrate content — every function definition becomes `(source:module.name, function:fn_name, body, "<source-text>") = t`, every import becomes `(source:module.name, imports, target_module) = t`, etc.

This is the foundational projector for [M19](../../milestones/m19-self-developing-pyfars.md)'s `source-as-substrate-cells` goal: PyFARS reading its own Python source is the same projector reading it as any other Python file.
Once the projector exists, agents querying substrate for source content use the same query interface as any other substrate query.

Uses Python's `ast` module for parsing; the rendering side reconstructs source from cells via canonical formatting.
The counit law holds modulo `black`-style canonical formatting (whitespace, quote-style, line-wrapping); two source files producing the same cells render to the same canonical form.

## Acceptance

- [ ] `pyfars/projectors/python_source.py` implements `PythonSourceProjector` conforming to the `Projector` protocol.
- [ ] Projection covers: functions, classes, methods, imports, decorators, type signatures, docstrings, module-level constants.
- [ ] Rendering reconstructs source files from cells; round-trip produces canonical-form-equivalent source.
- [ ] Counit-law property test in `tests/projectors/test_python_source_counit.py` passes on a corpus including `pyfars/runtime/` source.
- [ ] CLI verb `pyfars project python <file>` emits cells; `pyfars render python <output-file>` reconstructs.

## Progress cells

*(empty — task not yet started)*
