---
title: "Test roundtrip from OpenClaw memory to substrate cells and back"
type: task
area: engineering
status: open
horizon: later
milestone: m4-memory-feedback
goal: openclaw-session-close-syncs-to-substrate
depends-on: [hook-openclaw-session-close-into-projector]
requires-capabilities: [property-testing, projector-framework]
theory-basis: [projector-framework-counit, observation-fiber-isolation]
---


## Description

Property test verifying the counit law for the OpenClaw memory ↔ observation-cells projector: starting from any memory file, project to observations, re-render to a memory-file artifact, compare to the original modulo:

- Canonical form (whitespace, key ordering, etc.)
- Private filtering (private entries are dropped on projection; the re-rendered artifact has only the public entries)

The test should cover representative memory file shapes: empty, single-public-entry, single-private-entry (projects to nothing, re-renders to empty), mixed, structured tables of observations, narrative paragraphs with embedded `### observation` blocks.

This test is the **acceptance gate** for [`openclaw-session-close-syncs-to-substrate`](../../goals/openclaw-session-close-syncs-to-substrate.md): without it passing, the goal is not met.

## Acceptance

- [ ] A property test exists at `tests/test_openclaw_memory_projector_counit.py` (or equivalent).
- [ ] The test generates random memory files (with controlled shape: public/private mix, structured/narrative ratio) and verifies counit-law for each.
- [ ] The test's pass criterion is "re-rendered memory matches original public content, modulo canonical form".
- [ ] Failure modes diagnosed clearly: private leak, canonical-form drift, content loss.
- [ ] The test runs in CI on every change to `runtime/openclaw_memory_projector.py`.

## Progress cells

*(empty — task not yet started)*
