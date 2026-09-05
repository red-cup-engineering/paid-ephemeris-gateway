---
title: "Implement the compound polyglot projector"
type: task
area: engineering
status: open
horizon: doing
milestone: m11-assurance-audit-chain-export
goal: polyglot-source-projectors
depends-on: [implement-python-source-projector, implement-rust-source-projector, implement-toml-config-projector]
requires-capabilities: [code-authoring]
theory-basis: [projector-framework-counit]
---


## Description

Implement the orchestrating projector that walks a filesystem tree and dispatches per-file to the right format-specific projector based on file extension and (where the extension is ambiguous) content sniffing.
The compound projector is the user-facing entry point for `pyfars project --recursive <root>`: it produces a unified cell-set covering Python source, Rust source, TOML config, INI config, markdown (existing), JSON (existing), and any future format-specific projector.

The compound projector preserves the per-format projectors' counit laws: rendering the cell-set back produces a filesystem tree where each file individually round-trips.
Tree-level guarantees (no spurious files added or removed during round-trip) are part of the compound projector's own counit law.

This is the projector that makes the substrate's source-as-cells claim multi-language: a polyglot codebase becomes substrate-readable in one operation.
Foundational for downstream queries like "find every function across the codebase that calls `dispatch_graph`."

## Acceptance

- [ ] `pyfars/projectors/compound.py` implements `CompoundProjector` dispatching per-format.
- [ ] File-extension dispatch covers `.py`, `.rs`, `.toml`, `.cfg`, `.ini`, `.md`, `.json`; falls back to a `binary-blob` projector for unknown extensions (preserving filename and content-hash but not content-cells).
- [ ] Tree-level counit law: project tree → render tree produces byte-identical filesystem.
- [ ] Per-file projector failures emit `(file, projection-failed, ?reason) = top` on `guard` rather than stopping the walk.
- [ ] CLI `pyfars project --recursive <root>` walks; `pyfars render --recursive <output-root>` reconstructs.

## Progress cells

*(empty — task not yet started)*
