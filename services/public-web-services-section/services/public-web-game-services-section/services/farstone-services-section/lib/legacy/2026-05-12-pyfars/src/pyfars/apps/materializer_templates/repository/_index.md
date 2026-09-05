---
kind: harness
title: "Repository conventions harness"
type: harness
target-default: "."
target-runtime: "repository"
manifest: ".pyfars/harness-manifests/repository.json"
emits:
  - template: "README.md.j2"
    target-pattern: "README.md"
    mode: aggregate
    context: ["orientation"]
  - template: "gitignore.j2"
    target-pattern: ".gitignore"
    mode: aggregate
    context: ["orientation"]
---


Generates the polity-root's platform-agnostic repository files — `README.md` (the GitHub-rendered landing page; the human first-time-reader entry point) and `.gitignore` (git's own ignore-list) — from substrate state plus templates owned by this harness.

The `repository` runtime is git-the-tool plus humans-reading-on-the-web.
These files exist regardless of which agent runtime is in use; `git` reads `.gitignore` and the GitHub renderer reads `README.md`.

## What it writes

| File | Template | Consumer |
|---|---|---|
| `README.md` | [`templates/README.md.j2`](templates/README.md.j2) | GitHub renderer; humans browsing the repo |
| `.gitignore` | [`templates/.gitignore.j2`](templates/.gitignore.j2) | `git` |

Both files carry a banner at the top noting they're harness-generated and pointing at the regeneration command.

The manifest is written to `.pyfars/harness-manifests/repository.json`.

## Substrate context the template sees

Same shape as the other orientation harnesses, plus the `fragments(topic)` callable filtered to runtime `repository` plus cross-runtime (`*`).
See [`orientation-fragment`](../../../objects/orientation-fragment.md).

`.gitignore` is special: its lines are not paragraphs but pattern-groups.
Pattern-group prose is kept inline in the template until a substrate-side gitignore-curation source emerges; until then, treat the template's pattern groups as the curation surface.
Document the choice here so future curators know where to add patterns.

## Run

```bash
pyfars install-harness repository
pyfars install-harness repository --dry-run
pyfars install-harness repository --uninstall
```

## Editing

Edit substrate orientation-fragment records under `<polity-root>/prose/orientations/<topic>/<slug>.md` to change `README.md` prose; edit `.gitignore` patterns directly in [`templates/.gitignore.j2`](templates/.gitignore.j2) for now (pending a substrate-side curation source).
