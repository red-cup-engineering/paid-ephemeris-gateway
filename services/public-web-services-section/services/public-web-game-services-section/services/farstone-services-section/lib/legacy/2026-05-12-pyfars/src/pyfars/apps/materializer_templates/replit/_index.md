---
kind: harness
title: "Replit Agent harness"
type: harness
target-default: ".agents/skills"
target-runtime: "replit-agent"
manifest: ".pyfars/harness-manifests/replit.json"
emits:
  - source: skill-packs
    source-args:
      skills_dir: "engineering/skills"
    template: "skill-shim.md.j2"
    target-pattern: "{prefix}{pack}-{slug}/SKILL.md"
    mode: per-record
  - source: agent-records
    template: "agent-shim.md.j2"
    target-pattern: "agent-{slug}/SKILL.md"
    mode: per-record
---


Materializes every PyFARS engineering skill (under `records/engineering/skills/` in the current polity repo, with legacy `operations/engineering/skills/` still supported) as a project-installed skill that the Replit Agent's auto-discovery picks up at session start.

## What it writes

For each `records/engineering/skills/<pack>/<skill>/SKILL.md`:

```
.agents/skills/<prefix><pack>-<skill>/SKILL.md
```

with `<prefix>` defaulting to `pyfars-`.
Each shim contains:

- A Replit-flavored frontmatter block (`name`, `description`).
- A short header explaining the shim is a projection of the PyFARS skill and pointing back at the substrate source.
- The original SKILL.md body, copied verbatim, so Replit Agent has the full instruction text on hand without having to follow the back-reference.

A manifest is written to `.agents/skills/.fars-harness-manifest.json` recording every shim and its source, so `--uninstall` is exact.

## Why a shim, not a symlink

Replit Agent reads `SKILL.md` files from `.agents/skills/<dir>/` at session start.
Symlinks confuse the discovery walk; a copy with a clear "regenerate me" header is robust.
Re-running `pyfars install-harness replit` overwrites the shims, so refreshing is one command.

## Complementary, not redundant, with MCP

The FARS MCP server exposes verbs and skills as RPC tools — *call-time* access for any MCP-aware client.
This harness exposes skills as project-installed instructions — *discovery-time* visibility inside Replit Agent's normal session-start scan.
Both paths are useful: MCP for invocation, the harness for "what skills exist and when to use them."

## Run

```bash
pyfars install-harness replit                  # install
pyfars install-harness replit --dry-run        # show what would be written
pyfars install-harness replit --uninstall      # remove via manifest
```
