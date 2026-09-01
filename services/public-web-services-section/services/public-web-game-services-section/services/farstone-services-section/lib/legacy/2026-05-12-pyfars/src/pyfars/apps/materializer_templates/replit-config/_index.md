---
kind: harness
title: "Replit configuration harness"
type: harness
target-default: ".pyfars/harness-manifests"
target-runtime: "replit-workspace"
status: partial
manifest: ".pyfars/harness-manifests/replit-config.json"
emits:
  - template: "spec.toml.j2"
    target-pattern: "replit-config.toml"
    mode: aggregate
---


Renders the **desired** `.replit` file from the substrate-owned spec at [`spec.toml.j2`](templates/spec.toml.j2), so the workspace's runtime configuration (workflows, ports, post-merge hook, Nix packages) is generated from FARS rather than hand-written.

## What it writes

A single file:

```
.pyfars/harness-manifests/replit-config.toml
```

containing the rendered desired-state TOML.
This file is **not** automatically copied to `.replit`; see "Apply step" below.

## Why it doesn't write `.replit` directly

The Replit sandbox protects `.replit` (and `replit.nix`) against direct writes from agent tools and shell processes.
Mutation has to go through:

- The Replit Agent's `configureWorkflow()` callback (from inside an agent session), or
- The Replit workspace UI (Workflows pane), or
- A task agent running in an isolated environment whose merged work the platform reconciles.

So this harness's job is to be the **source of truth**: substrate carries the spec, the harness renders the canonical desired-state file, and the apply step is a separate (manual or agent-driven) step.

## Apply step

After running `pyfars install-harness replit-config`:

1. Diff `.pyfars/harness-manifests/replit-config.toml` against `.replit`.
2. If they differ, apply the diff via one of:
   - **Agent session:** call `configureWorkflow({...})
     ` for each workflow that drifted; remove obsolete ones with `removeWorkflow({...})
     `.
   - **Manual:** edit `.replit` via the workspace UI to match.
   - **Task agent:** dispatch a task whose merged result includes the corrected `.replit`.

A future `pyfars audit replit-config` skill will automate the diff and emit the exact `configureWorkflow()` calls needed.

## Note on `specialization-of:` in adjacent agent records

Agents in this repo have begun using a `specialization-of:` frontmatter field (e.g. `predication-category-theory-researcher` declares `specialization-of: theory-researcher`).
Until FARS ships an inheritance resolver, this field is **metadata-only**: every specialization must remain fully explicit (no inherited omissions of `skills`, `jurisdiction`, etc.).
The Claude-code projection ignores the field today, so dispatching by slug ("you are a predication-category-theory-researcher") works without resolution.

## Run

```bash
pyfars install-harness replit-config              # render spec → .pyfars/harness-manifests/replit-config.toml
pyfars install-harness replit-config --dry-run    # show what would be rendered
pyfars install-harness replit-config --uninstall  # remove the rendered manifest
```
