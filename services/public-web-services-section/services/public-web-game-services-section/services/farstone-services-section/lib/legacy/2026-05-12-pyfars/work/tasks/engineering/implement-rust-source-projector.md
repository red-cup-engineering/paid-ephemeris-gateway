---
title: "Implement the Rust source projector"
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

Implement the projector that takes Rust source files (`.rs`) and produces substrate cells: per-function, per-struct, per-trait, per-impl-block, per-use-statement, per-derive-attribute, lifetime-and-generic cells.
Pairs with [`implement-python-source-projector`](implement-python-source-projector.md) — both project source-as-cells; the polyglot framework dispatches to the right one based on file extension.

Uses `syn` (Rust's standard parser, accessed via the `tree-sitter-rust` grammar through Python bindings, OR a subprocess call to `rustfmt --emit=ast`) for parsing.
The rendering side reconstructs Rust source from cells using `rustfmt` for canonical formatting.

This projector is *secondary* to the Python projector for PyFARS-self-development purposes (PyFARS is Python), but it's load-bearing for federated polities whose substrate touches Rust source — and for the broader claim that PyFARS's substrate is language-agnostic at the source-projection layer.

## Acceptance

- [ ] `pyfars/projectors/rust_source.py` implements `RustSourceProjector` conforming to the `Projector` protocol.
- [ ] Projection covers: functions, structs, enums, traits, impls, use statements, derive attributes, generic parameters, lifetimes.
- [ ] Rendering reconstructs `.rs` files; round-trip via `rustfmt` produces canonical-form-equivalent source.
- [ ] Counit-law property test passes on a Rust corpus (e.g., `pypredcalc`'s Rust modules if any, or a fixture corpus).
- [ ] CLI verb `pyfars project rust <file>` emits cells; `pyfars render rust <output-file>` reconstructs.

## Progress cells

*(empty — task not yet started)*
