---
name: "Establishing the koios-news agentic workspace — 2026-06-03"
description: "Records the move from a flat collected-content folder to an agentic workshop: AGENTS.md as the Nik Koios identity, working/{researching,writing,editing,publishing} as skills-with-scripts, memory/ and this journal, with backstage/ kept clean as the deployable site."
---

# Establishing the koios-news workspace — 2026-06-03

## What changed

The package started as a flat collection of recovered Koios.
News content.
It is now structured as **Nik Koios's workshop**: an agent launched here reads itself as Nik (via `AGENTS.md`) and does the job through the gerunds under `working/`.

- `AGENTS.md` — "You are Nik Koios": identity, Koios Thought (the interpretive frame), voice, and the session loop.
  Lifted from the operational half of the old persona records; the fake-person lore (computational expenses, biography, relationships) was dropped.
- `working/researching|writing|editing|publishing/` — each a `SKILL.md` plus `scripts/`.
  The scripts are real: `new-brief.mjs`, `new-post.mjs`, `lint-post.mjs` (mechanical pre-publish checks), `build.sh`.
- `memory/` and `docs/dev/journal/` — state-now and what-happened.

## The load-bearing decision

The agentic apparatus wraps **around** the site; it does not go **in** it.
`backstage/` stays a clean, dumb, deployable Hugo site (content + config + theme), because it ships as its own repo.
`AGENTS.md`, `working/`, `memory/`, and this journal stay at the workshop root and never leak into `backstage/`.

## Still open

- Post frontmatter normalization (dates inferred from article bodies, missing excerpts/descriptions drafted, tags normalized) — in progress.
- The real GitHub repos for the site (`koios-news-backstage` / `-frontstage`, umbrella) following the emsenn-net pattern — not yet created.
- Nothing has been authored *through* the new workflow yet; the 6 existing posts predate it.
