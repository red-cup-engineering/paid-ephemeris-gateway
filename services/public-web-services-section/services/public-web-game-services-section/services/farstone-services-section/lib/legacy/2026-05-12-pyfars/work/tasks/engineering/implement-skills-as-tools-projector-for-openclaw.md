---
title: "Implement the skills-as-tools projector for OpenClaw"
type: task
area: engineering
status: open
horizon: doing
milestone: m4-memory-feedback
goal: openclaw-session-close-syncs-to-substrate
depends-on: [hook-openclaw-session-close-into-projector]
requires-capabilities: [code-authoring, harness-integration]
theory-basis: [projector-framework-counit, harness-discipline]
---


## Description

Implement the projector that takes substrate skill records and exposes them as OpenClaw tools at `.openclaw/tools/`.
Pairs with the substrate-side `skill→tool-spec` projector — that one feeds the PyFARS dispatch graph; this one feeds the OpenClaw runtime.
Both project from the same substrate skill record; both must satisfy the counit law against that record.

OpenClaw's tool model: each tool is a directory under `.openclaw/tools/<tool-slug>/` with `TOOL.md` (frontmatter describing the tool) plus optional `handler.ts` or shell-callable.
The projector reads each substrate skill record and produces the OpenClaw-side directory with the matching shape.

This is harness-side work: edits live in the OpenClaw harness's projector, not in PyFARS proper.
PyFARS exposes the skill records; OpenClaw consumes them through this projector.

## Acceptance

- [ ] `pyfars/adapters/openclaw/projectors/skills_as_tools.py` implements the projector.
- [ ] `pyfars install-harness openclaw` (or equivalent) wires the projector into the OpenClaw harness's boot path.
- [ ] Boot walks substrate skill records and writes corresponding `.openclaw/tools/<slug>/TOOL.md` files.
- [ ] On-substrate-write fires per-skill re-projection when a skill record changes; OpenClaw picks up the new tool on its next session.
- [ ] A test asserts: a substrate skill record with `body_kind: command` and a shell command body produces a `.openclaw/tools/<slug>/TOOL.md` whose frontmatter matches OpenClaw's expected schema, and the command-body is invocable from OpenClaw.

## Progress cells

*(empty — task not yet started)*
