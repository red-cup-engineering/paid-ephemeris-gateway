---
kind: harness
title: "Codex / ChatGPT harness"
type: harness
target-default: ".agents/skills"
target-runtime: "codex"
manifest: ".pyfars/harness-manifests/codex.json"
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


Materializes PyFARS engineering skills and agent role records as project skills under `.agents/skills/`, the skill discovery surface available to Codex/ChatGPT sessions in this repository.

## What it writes

For each `records/engineering/skills/<pack>/<skill>/SKILL.md`:

```text
.agents/skills/<prefix><pack>-<skill>/SKILL.md
```

For each top-level `records/engineering/agents/<slug>.md`:

```text
.agents/skills/agent-<slug>/SKILL.md
```

The generated shims keep the substrate record as source of truth, include the original skill body when applicable, and add Codex-specific guidance for legacy slash-command references and the current `records/` layout.

## Relationship to Replit

This harness intentionally shares the `.agents/skills` layout with the `replit` harness because both runtimes discover project skills from that directory.
The harness name in the manifest records which runtime projection was requested, while uninstall accepts either compatible name so an older Replit-generated projection can be replaced by the Codex projection without manual cleanup.

## Run

```bash
pyfars install-harness codex
pyfars install-harness codex --dry-run
pyfars install-harness codex --uninstall
```
