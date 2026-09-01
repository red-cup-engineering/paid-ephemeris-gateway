---
title: "Harvest orientation fragments from existing 561 substrate"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: orientation-files-derive-from-substrate
depends-on: [author-orientation-fragment-object-record, author-authoring-an-orientation-fragment-skill]
requires-capabilities: [substrate-curation, prose-editing]
theory-basis: [substrate-purity, projection-not-authoring]
---


## Description

The current `tools/platform/pyfars/src/pyfars/harnesses/repo-instructions/templates/CLAUDE.md.j2` carries hardcoded discipline prose for at least these topics:

- **`reading`** — how to navigate the corpus by `_index.md`, `depends-on:`/`realizes:`/`references:` frontmatter, and the engine API.
- **`writing`** — markdown discipline, frontmatter shape, math-as-first-class in `depends-on:`, no triage bulk-lifts.
- **`editing`** — `triage/` workspace discipline, no spurious `locates:`/`department:` frontmatter.
- **`committing`** — no commit without ask; specific paths over `git add -A`; commit messages reference task slugs.
- **`audit-output`** — audit outputs go in the audited theory's `audits/` subdir or `triage/`; do not scatter `audit-*.md` randomly; do not start dated daily-roll audit series uninvited.
- **`what-not-to-do`** — no narratives unless asked; no defensive comments; no compat shims; do not destroy uncommitted work; do not hand-edit harness-generated files.
- **`running-engine`** — `pyfars run <dir>` boots the engine; CLI is lifecycle-only; engine API endpoints; control-plane on UDS.

For each topic, author one or more orientation-fragment records under `561/prose/orientations/<topic>/<slug>.md`.
Each fragment:

1. Cites at least one `derives-from:` source — typically a `governance/skills/<gerund>.md` skill record (e.g. `governance/skills/committing-a-change-with-git/`), a `governance/decisions/*.md` decision, or an upstream concept under `tools/platform/pyfars/concepts/`.
2. Carries `applies-to-runtimes: ["*"]` for cross-runtime advice; specialize only when the prose names a runtime-specific tool (e.g. AGENTS.md should not name "Claude Code's hook protocol").
3. Has a body that is a single readable paragraph (or a short list) — not a full skill body; the fragment is the orientation projection of the skill, not a copy of the skill.
4. Sets `ordering:` to control intra-topic sequence (default 100; lower for things-that-belong-first).

Where the source records are missing, do *not* fabricate prose — leave the gap visible as a `(no fragment authored — source skill not yet in substrate)` marker, and file a follow-on task to author the missing source.
The fragment's value is in the audit trail; a fragment with no real source is worse than no fragment.

## Source-substrate spot-survey (initial pass)

The 561 polity already has these substrate records that fragments can derive from:

- `561/governance/skills/committing-a-change-with-git/` — committing topic
- `561/governance/skills/writing-a-term-or-concept/` — writing topic (if exists; verify)
- `561/governance/decisions/*` — selected decisions on substrate-purity, markdown-as-projection
- `tools/platform/pyfars/concepts/harness.md` — running-engine + harness boundaries

Audit-output discipline currently has no substrate home in 561.
Either:

- Author a `561/governance/decisions/audit-output-discipline.md` decision record first (out of scope here; would be a sister task), then derive the fragment from it; or
- Skip audit-output as a topic in the first pass and file the gap.

The harvest is not "extract every paragraph from CLAUDE.md.j2 verbatim" — the goal is *substrate-grounded* prose.
A paragraph that has no current substrate ground is either replaced by a substrate-grounded equivalent, dropped, or held until the source is authored.

## Acceptance

- [ ] At least one fragment exists under `561/prose/orientations/<topic>/` for each of: `reading`, `writing`, `committing`, `running-engine`, `what-not-to-do`.
  (audit-output and editing may be deferred if their source records aren't yet in substrate; that is a deliberate choice, recorded in the goal's progress cells, not a silent skip.)
- [ ] Every authored fragment cites a real `derives-from:` source that exists on disk.
- [ ] No fragment carries prose that's not present in (or directly summarizing) the source it cites.
- [ ] Where a topic has no current substrate ground, that absence is recorded — either by a follow-on task or in the goal's progress cells — not absorbed silently.

## Progress cells

*(empty — task not yet started)*
