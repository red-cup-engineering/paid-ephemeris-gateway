---
name: "Installing a harness"
description: "Realizes a harness type-definition against the current polity-root, recording every projected file in a manifest and emitting a substrate witness for the install. Use whenever bringing a new harness online or refreshing an existing harness after substrate-record changes."
---


## Requirements

- The harness type-definition exists at `src/pyfars/harnesses/<slug>/` with a populated `_index.md` declaring `target-default` and `target-runtime`.
- The substrate records the harness reads from exist (e.g. `records/engineering/agents/` for [`harness:claude-code`](../../src/pyfars/harnesses/claude-code/_index.md), `records/engineering/hooks/` for [`harness:claude-code-hooks`](../../src/pyfars/harnesses/claude-code-hooks/_index.md)).
- `pyfars` is on the operator's `PATH`.
- The polity-root carries `.pyfars/config.toml` naming the active records-root and event-log directory.
- For sister-set installs (the four claude-* harnesses), all four type-definitions and all referenced substrate-record sets are present; the four are installed jointly per the [`harness`](../../concepts/harness.md) commitment that operator-runtime sister harnesses come up together.

## Steps

1. **Validate target-runtime is supported.** Read the harness type's `_index.md`; refuse to proceed if `status: draft` and no override flag is given.
2. **Validate the substrate-record-set is non-empty.** A harness with zero source records is almost always a misconfiguration — bail with a clear error rather than projecting an empty target.
3. **Capture prior file state.** For every target path the install will write, read and record the existing bytes (if any) into a `captured-prior-state` block keyed by path.
  Empty paths get an empty entry.
  This is the load-bearing step for invertible uninstall — see the [`harness-manifest`](../../objects/harness-manifest.md) record.
4. **Render the harness's templates against the substrate records.** Each substrate record produces zero, one, or many projected files per the harness's projection rules.
5. **Write the projected files.** Use containment-checked path resolution: refuse `..
  ` traversal and any path resolving outside the declared target directory.
  Each write records the projected path, content-hash, and source-substrate-record-path.
6. **Emit a `harness-installed` witness.** Append one JSONL line to the polity's event-log naming `harness-slug`, `install-timestamp` (ISO-8601 UTC), `manifest-path`, `projected-files-count`, and the content-hash of the manifest itself.
  The witness is the substrate's record of the install per [`witness`](../../concepts/witness.md); it must fire after the projected files and manifest are on disk and before `install-harness` returns success.
  If any earlier step failed, no witness is emitted (atomicity per the witness concept's "fires fully or not at all").
7. **Write `.pyfars/harness-manifests/<slug>.json`.** Include every projected file (`path`, `content-hash`, `source-substrate-record-path`), every captured-prior-state entry, the `target-default` and realized target, the `projector-version` (the running `pyfars` package version), and the `uninstall-discipline` (the path-resolution rules applied).
8. **For sister-set installs, repeat steps 1–7 for each of the four claude-* harnesses.** Optionally emit one composite `harness-set-installed` witness in addition to per-harness witnesses, so audits can distinguish "the operator surface was brought up wholly" from "individual harnesses were touched in isolation."

## Outcomes

- The polity-root carries the harness's projected files at the realized target.
- `.pyfars/harness-manifests/<slug>.json` enables exact `--uninstall` (delete projected files, restore captured prior state).
- The substrate event-log records the install as a substrate event reachable by audit, replay, and ledger query.
- For sister-set installs of the four claude-* harnesses, the operator runtime has the full round-trip: outbound projection of substrate (agents, hooks, MCP, slash commands) into `.claude/`/`.mcp.json`, plus inbound witness round-trip via `pyfars hook-dispatch` per [`wiring-protocols`](../specifications/wiring-protocols.md) §4.5.

## Discipline notes

- **Substrate-purity ([decision](../decisions/substrate-purity.md)).** The harness writes outside `records/` (into `.claude/`, `.mcp.json`, etc.).
  This does not violate substrate-purity because every world-event the harness later receives becomes a substrate witness through `hook-dispatch`; nothing about the world's state leaks into the substrate uninstrumented.
- **Markdown-as-projection ([decision](../decisions/markdown-as-projection.md)).** The files the harness writes (e.g. `.claude/agents/<slug>.md`) are *derived*, not primary.
  Hand-edits will be overwritten on next install; edit the substrate records instead.
- **Manifest is not authoring-source.** Do not hand-edit `.pyfars/harness-manifests/<slug>.json`.
  Per [`harness-manifest`](../../objects/harness-manifest.md), the manifest is a *result* of running the projector; the type-definition and substrate records are the source of truth.
- **The hook-endpoint protocol is in migration ([wiring-protocols](../specifications/wiring-protocols.md) §4.5).** Today `pyfars hook-dispatch` writes the polity-image directly.
  The target shape is HTTP POST to the engine over `<polity-root>/.pyfars/run.sock` when an engine is up, falling back to direct image-modification when not.
  Installing the `claude-code-hooks` harness does not depend on the engine running; the inbound channel works in both modes.
