---
title: "Add versioning to PyFARS (YYYY.MM.DD+noun)"
type: task
status: captured
captured-at: "2026-05-09"
captured-from: "captain:emsenn"
---


PyFARS does not currently carry a release version.
Add versioning, using the form `YYYY.
MM.
DD+noun` (e.g. `2026.05.09+<noun>`).
The `+<noun>` is a PEP-440 *local version identifier* — using `+` as the separator (rather than `.
`) so the version parses cleanly through `setuptools`/`pip` and Nix's `buildPythonApplication`.

## From the captain

> Add versioning to PyFARS.
> We want to use YYYY.
> MM.
> DD+noun versioning.

## Open questions for triage

- Where the version string lives (single source of truth: `pyproject.toml`, a `_version.py`, a substrate record, or projected from a release record under `work/milestones/`).
- How the `noun` is chosen per release (captain-named per cut? derived from the milestone slug?).
- Whether the version is exposed via the CLI (`pyfars help` / `pyfars --version`) and the engine API.
- Migration of existing `arc-d.*` / `arc-l.*` tag lineage — preserved as historical, replaced going forward, or both.
- Downstream consumers that pin PyFARS (561's `flake.lock`, the harness install pipeline) — what they need to read.
