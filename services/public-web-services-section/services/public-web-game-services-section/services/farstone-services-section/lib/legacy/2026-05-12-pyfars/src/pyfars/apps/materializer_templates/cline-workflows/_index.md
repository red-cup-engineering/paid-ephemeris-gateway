---
kind: harness
type: harness
title: "Cline workflows harness"
status: ready
runtime: cline
target-default: ".clinerules"
manifest: ".pyfars/harness-manifests/cline-workflows.json"
emits:
  - source: runbooks
    source-args:
      runbooks_dir: "records/engineering/runbooks"
    template: "workflow.md.j2"
    target-pattern: "workflows/{slug}.md"
    mode: per-record
  - template: "witness-helper.sh.j2"
    target-pattern: "/.pyfars/cline-witness.sh"
    mode: aggregate
    executable: true
---


[Cline](https://github.com/cline/cline) reads `.clinerules/workflows/*.md` as runnable, agent-executable procedures — markdown documents with numbered `## Steps` that the cline runtime walks, executing each step (shell commands, tool calls, decisions) and surfacing the chain to the operator.
The substrate already carries `kind: runbook` records under `records/engineering/runbooks/` in the current polity repo, with legacy `operations/engineering/runbooks/` still supported — multi-step procedures composing one or more engineering skill packs.
This harness projects each runbook into a cline workflow.

The projection is not a flat copy.
Each generated workflow is wrapped in a **per-step witness protocol**: after every numbered step the workflow instructs cline to invoke `.fars/cline-witness.sh <runbook-slug> step-<N> <truth> <evidence>`, which appends a bilattice-valued dispatch witness to `.fars/event-log/<date>.jsonl`.
A workflow execution becomes a chain of dispatch witnesses, the substrate's own observation channel into the run.

`pyfars ledger tally --origin cline-workflow:<slug>` reads that chain afterward.
Truth-weighted tally tells you how many steps' acceptance conditions held; evidence-weighted tally tells you how many produced an observable artifact.
The two diverge exactly when steps "succeed" without evidence (a green test that ran no assertions) or fail with evidence (the artifact is on disk but the assertion fired) — the discrimination is the integration's leverage, the same as the [`claude-code-hooks`](../claude-code-hooks/_index.md) sister harness gets out of Claude's hook protocol.

## What gets written

- `.clinerules/workflows/<slug>.md` — one cline workflow per substrate runbook.
  Body = generated banner + per-step witness protocol preamble + the runbook's own prose body (post-frontmatter, unchanged) + a footer linking back to the substrate source.
- `.fars/cline-witness.sh` — shared helper invoked by every projected workflow.
  Takes `<runbook-slug> <step-label> [truth] [evidence]` and appends a bilattice-graded dispatch witness via the `pyfars.kernel.witness.
  Witness` + `pyfars.kernel.event_log.
  EventLog` machinery — the same code path the claude-code-hooks shims use.
- `.pyfars/harness-manifests/cline-workflows.json` — records every projected file (slug, title, step count, byte size, source path, captain-confirmation flag).
  `--uninstall` removes exactly that set.

## Substrate record contract

The substrate side is the existing runbook shape under `records/engineering/runbooks/`:

```yaml
---
kind: runbook
title: "Runbook: <human title>"
description: "<one-line outcome>"
status: ready
composes-skills: [<skill>, ...]
requires-captain-confirmation: true   # optional; surfaces in the projection
---

# <Title>

## Goal
...

## Steps

### 1. <step headline>
...
### 2. <step headline>
...
```

The walker validates that every retained runbook has at least one `### N. ...
` step heading; runbooks without numbered steps would project a degenerate workflow and are rejected at install time.

## Why a projection, not a hand-written workflow

Cline workflows tend to drift the same way agent-instruction files drift — they're written when the procedure is fresh, then frozen while the substrate (and the skill packs they compose) evolves.
By treating each cline workflow as a *projection* of a substrate runbook, the runbook stays canonical and the workflow is regenerated at will.
The witness preamble is added by the projector, not the runbook author, so every runbook automatically becomes bilattice-instrumented when it lands in cline — without the runbook author having to know cline exists.
