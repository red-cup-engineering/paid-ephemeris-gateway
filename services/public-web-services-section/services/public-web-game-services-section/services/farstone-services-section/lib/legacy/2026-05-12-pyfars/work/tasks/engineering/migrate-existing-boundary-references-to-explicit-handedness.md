---
title: "Migrate existing boundary references to explicit handedness"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: boundary-records-with-handedness-coordinate
depends-on: [extend-boundary-fiber-composition-to-accept-handedness]
requires-capabilities: [python-editing, code-audit]
theory-basis: [boundary-as-fiber]
---


## Description

Audit PyFARS source for boundary-shaped code that lacks explicit handedness.
Likely loci: `runtime/boundary.py`, `runtime/services.py` (web service exposure has implicit boundary semantics), `runtime/agent_compiler.py` (agents may carry implicit dispatch directionality).

For each found locus: either the code assumes bidirectional (acceptable; emit a [finding](../../findings/_index.md) noting the assumption), or it implicitly handles only one direction (rewrite to read `handedness:` from a boundary record).

Per the [`561 — no legacy shims`](https://example.invalid) discipline: do not preserve a no-handedness path "for backwards compat."
Convert call-sites; let the type system flag any holdouts.

## Acceptance

- [ ] An audit-findings record at `work/findings/boundary-implicit-handedness-audit.md` enumerates the loci found.
- [ ] Each locus either: (a) reads handedness explicitly post-task, or (b) is documented as bidirectional-by-design with a finding citing why.
- [ ] No regression in [M3](../../milestones/m3-continuous-loop.md) lifecycle, [M2](../../milestones/m2-substrate-dispatch.md) dispatch, or harness operation.
- [ ] Tests cover: a boundary record load goes through the explicit handedness path; absence of `handedness:` produces $\top$ at load.

## Progress cells

*(empty — task not yet started)*
