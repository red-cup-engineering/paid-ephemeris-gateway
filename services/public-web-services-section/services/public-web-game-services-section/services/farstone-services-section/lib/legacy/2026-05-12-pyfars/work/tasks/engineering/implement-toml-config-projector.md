---
title: "Implement the TOML/cfg/ini configuration projector"
type: task
area: engineering
status: open
horizon: doing
milestone: m11-assurance-audit-chain-export
goal: polyglot-source-projectors
depends-on: [finalize-projector-protocol-as-adjoint-pair]
requires-capabilities: [code-authoring]
theory-basis: [projector-framework-counit]
---


## Description

Implement the projector that takes configuration files in TOML, cfg, or ini format and produces substrate cells: per-section cells, per-key-value cells, comment cells (preserving authoring intent).
Configuration becomes substrate-readable; agents querying for `(source:pyproject.toml, dependency, ?dep) = t` use the same query interface as any other substrate query.

Uses `tomllib` (Python 3.11+) for TOML parsing, `configparser` for cfg/ini.
The rendering side reconstructs the file with key-order preservation and comment retention where the format allows (TOML comments are preserved by `tomli-w`; ini-style comments require a custom formatter).

The counit law for config formats is tighter than for source code: there's less canonicalization room.
Two TOML files rendering to byte-identical output means the cells are identical; a single key reorder produces different bytes (TOML's key-order is not semantic, so the projection sorts keys to a canonical order for cells, then renders in a stable canonical order).

## Acceptance

- [ ] `pyfars/projectors/toml_config.py`, `pyfars/projectors/ini_config.py` implement projectors conforming to the `Projector` protocol.
- [ ] Projection covers: sections (TOML tables / ini sections), key-value pairs (with type information for TOML), array values, nested tables, comments.
- [ ] Rendering reconstructs the config; round-trip produces canonical-form-equivalent output.
- [ ] Counit-law property test passes on a corpus including `pyproject.toml`, `setup.cfg`, and a fixture ini file.
- [ ] CLI verbs `pyfars project toml <file>` and `pyfars project ini <file>` work; rendering verbs symmetric.

## Progress cells

*(empty — task not yet started)*
