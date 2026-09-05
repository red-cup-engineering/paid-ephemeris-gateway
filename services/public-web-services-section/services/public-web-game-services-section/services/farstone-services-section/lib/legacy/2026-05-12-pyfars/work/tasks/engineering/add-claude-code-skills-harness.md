---
title: "Add claude-code-skills harness projecting substrate skills to .claude/skills/"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: harness-claude-by-office-assignment
depends-on: [implement-office-resolver-in-installer]
requires-capabilities: [pyfars-package-structure, jinja2-template-authoring]
theory-basis: [harness-as-bidirectional-projection]
---


## Description

Claude Code supports project-level skills under `.claude/skills/<name>/SKILL.md`.
PyFARS does not currently project to that directory.
Skills the polity's substrate carries (under `governance/skills/<gerund>/SKILL.md` or `governance/skills/<gerund>.md`) are invisible to Claude sessions today.
Add a sister harness `claude-code-skills` that fills the gap.

For each substrate skill record allowed by Claude's office (per `_resolve_model_office(root, "claude").get("skills")`), the harness writes:

```
.claude/skills/<slug>/SKILL.md
```

The projected file is a thin shim citing the substrate record by relative path, with the substrate record's `description:` rendered as the SKILL frontmatter description and the substrate body included verbatim.
Parallels how `claude-code` (agents) and `codex` (skills as `.agents/skills/`) handle their projections.

If Claude's office's `exposes-skills:` is `["*"]`, the harness projects every substrate skill record.
If it's a curated list, only those slugs are projected.
If the office record is missing, the harness installs zero skills and surfaces a clear warning ("model:claude has no holds-office, or its office has no exposes-skills; use `pyfars install-harness claude-code-skills --override-include-all` to project everything regardless" — or similar).

Harness directory at `tools/platform/pyfars/src/pyfars/harnesses/claude-code-skills/`:

- `_index.md` — `kind: harness`, `target-default: ".claude"`, `target-runtime: "claude-code"`.
  Body documents what it writes and how it filters by office.
- No `templates/` needed if the SKILL.md output is generated directly from the substrate record (parallel to `claude-code`'s agent installer); add one if a Jinja2 wrap is preferable.

In `install_harness.py`:

- `_install_claude_code_skills` and `_uninstall_claude_code_skills` functions following the pattern of the existing claude-code installer.
- `_HARNESS_DEFAULT_TARGET["claude-code-skills"] = ".claude"`.
- Entries in `_INSTALLERS` and `_UNINSTALLERS`.

## Acceptance

- [ ] `tools/platform/pyfars/src/pyfars/harnesses/claude-code-skills/_index.md` exists.
- [ ] `pyfars install-harness claude-code-skills` (no positional arg help) lists the new harness.
- [ ] Against a polity with a populated `claude-default` office, the install writes one `.claude/skills/<slug>/SKILL.md` per office-allowed skill.
- [ ] Each projected SKILL.md cites its substrate source record.
- [ ] `pyfars install-harness claude-code-skills --uninstall` reverses cleanly.
- [ ] Manifest under `.pyfars/harness-manifests/claude-code-skills.json`.

## Progress cells

*(empty — task not yet started)*
