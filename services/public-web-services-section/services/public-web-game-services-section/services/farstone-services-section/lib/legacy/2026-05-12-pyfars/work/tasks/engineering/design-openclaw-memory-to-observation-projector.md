---
title: "Design the OpenClaw-memory-to-observation projector"
type: task
area: engineering
status: open
horizon: soon
milestone: m4-memory-feedback
goal: openclaw-session-close-syncs-to-substrate
depends-on: [bind-observations-to-session-and-dispatchable]
requires-capabilities: [projector-framework, openclaw-memory-format]
theory-basis: [observation-record, projector-framework-counit]
---


## Description

Specify a projector that takes an OpenClaw memory file (the in-session notes a captain or agent recorded — its current path is at `<substrate-root>/.openclaw/sessions/<session-id>/memory.md` or equivalent; verify during design) and projects it into a set of substrate observation records.

The projector follows the projector-framework counit law: re-rendering the projected observations into a memory-file-shaped artifact matches the original up to canonical form (modulo private filtering).

The design covers:

- **Input parsing.** OpenClaw's memory file format: frontmatter (declaring session, scope), body (markdown with structured `### observation` blocks or similar).
  Identify what's currently emitted and what needs to be added for substrate-readability.
- **Privacy filter.** Entries with `private: true` or in a `### private` subsection are skipped — they never leave OpenClaw.
  This must be airtight.
- **Mapping to observation cells.** Each public memory entry projects to one observation record with appropriate Stevens scale (often `nominal` for narrative observations; `ordinal` or `interval` when the entry carries a quantified judgment).
- **Counit verification path.** Document how to reverse-render observations into a memory-file artifact for the counit-law test.

The design document lands at `work/specs/openclaw-memory-projector.md`.

## Acceptance

- [ ] A spec exists at `work/specs/openclaw-memory-projector.md`.
- [ ] The spec names the OpenClaw memory file format (verify by reading the existing OpenClaw harness; cite specific paths).
- [ ] The spec covers the private-filtering rules and confirms private entries never appear in projector output.
- [ ] The spec's worked examples include: pure-narrative entry, quantified-observation entry, mixed-public-and-private memory file, empty memory file.
- [ ] Counit-law verification is specified as a property test.

## Progress cells

*(empty — task not yet started)*
