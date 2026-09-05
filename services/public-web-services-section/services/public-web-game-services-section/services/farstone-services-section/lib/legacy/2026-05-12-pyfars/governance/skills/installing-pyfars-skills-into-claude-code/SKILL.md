---
name: "Installing pyfars skills into Claude Code"
description: "Projects each pyfars governance/skills/ record into <polity-root>/.claude/skills/<slug>/ so pyfars development skills become available as Claude Code skills in the current polity session. Use when starting a session in a pyfars-using polity and you want the pyfars skill surface available, or after pyfars governance/skills/ has been updated."
---


The pyfars package authors development skills as substrate records under `governance/skills/`.
Claude Code reads skills from `<polity-root>/.claude/skills/<slug>/SKILL.md`.
The shapes are compatible — pyfars skill frontmatter already carries `name:` and `description:` in the form Claude Code expects.

This skill projects the pyfars skill records into the Claude-Code-shaped layout, so the next session in the polity surfaces every pyfars skill as a callable `Skill`.
The projection logic lives in [`install.sh`](install.sh), co-located with this record.

## When to use

- Starting work in a polity that uses pyfars and you want the pyfars skill surface available in this session.
- After `git pull` or any update to `tools/platform/pyfars/governance/skills/` — re-run to pick up new or changed skills.
- After moving the polity to a different machine — `.claude/skills/` is not typically version-controlled.

## Requirements

- The polity uses pyfars and has pyfars's `governance/skills/` directory locatable on disk.
- For the 561 polity, that's `tools/platform/pyfars/governance/skills/` under the polity root.
- Write access to `<polity-root>/.claude/skills/`.

## How to run

From the polity root (the directory containing `.claude/`):

```bash
bash tools/platform/pyfars/governance/skills/installing-pyfars-skills-into-claude-code/install.sh
```

For a non-561 polity, or to project a pyfars install from elsewhere:

```bash
bash <path-to-pyfars>/governance/skills/installing-pyfars-skills-into-claude-code/install.sh \
  <path-to-pyfars>/governance/skills \
  <polity-root>
```

## Skill shape

Every pyfars skill is a directory:

```
governance/skills/<slug>/
  SKILL.md             # required; carries name: + description: frontmatter
  <supporting files>   # optional: scripts, templates, references the skill uses
```

`SKILL.md` is the one valid form.
A loose `<slug>.md` is invalid and the script will error.

## What the script does

For each entry in pyfars's `governance/skills/`:

- `_index.md` is skipped (it describes the directory, not a skill).
- Otherwise the entry must be a directory containing a `SKILL.md`.
  The whole directory is copied to `<polity-root>/.claude/skills/<slug>/`, replacing any prior projection.

The projection is additive across skills: orphans from removed pyfars skills are not cleaned up.
To force a clean reflection, remove `<polity-root>/.claude/skills/*` before running.

The projection is one-way (pyfars → Claude Code).
Authoritative edits belong in `pyfars/governance/skills/`.
Edits to the projected copies in `.claude/skills/` will be overwritten on next run.

## Outcomes

- `<polity-root>/.claude/skills/<slug>/SKILL.md` exists for each pyfars governance skill.
- For directory-shaped skills, supporting files (scripts, templates) travel with the skill into the projection.
- The next Claude Code session in this polity surfaces the pyfars skill set as available skills.

## Not handled

- **Polity-authored skills outside pyfars.** Skills the polity authors itself need their own installation path; this script projects only from pyfars.
- **Removal of orphan projections.** A skill deleted from pyfars stays in `.claude/skills/` until manually removed.
- **Bidirectional sync.** `.claude/skills/` is a derived projection; pyfars is the source of truth.
