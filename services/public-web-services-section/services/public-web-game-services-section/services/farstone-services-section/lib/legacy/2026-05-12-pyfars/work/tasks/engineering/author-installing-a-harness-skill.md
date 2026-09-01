---
title: "Author the installing-a-harness skill record"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: claude-code-harness-properly-installed
depends-on: [author-harness-manifest-object-record]
requires-capabilities: [skill-authoring, frontmatter-design]
theory-basis: [substrate-purity, witness-as-increment]
---


## Description

`pyfars install-harness <name>` exists as a verb but no skill record under `governance/skills/` documents the discipline of installing a harness.
The four sister harnesses' `_index.md` files describe each harness's own emit-shape, but the cross-cutting *installation discipline* (read records → render templates → capture prior state → write projection → witness install → write manifest) is not skill-shaped anywhere.

Author `tools/platform/pyfars/governance/skills/installing-a-harness.md` following the gerunding-recipe form already used by sibling skills (cf. `writing-task-records.md`, `authoring-an-observation-record.md`).

Frontmatter:

```yaml
---
name: "Installing a harness"
description: "Realizes a harness type-definition against the current polity-root, recording every projected file in a manifest and emitting a substrate witness for the install. Use whenever bringing a new harness online or refreshing an existing harness after substrate-record changes."
---
```

Body sections (per the gerunding-recipe convention):

1. **Requirements** — harness type-definition exists at `src/pyfars/harnesses/<slug>/`; substrate records the harness reads from exist; `pyfars` on `PATH`; polity-root has `.pyfars/config.toml`.
2. **Steps** — (a) validate target-runtime is supported and substrate-record-set is non-empty; (b) capture prior file state of any target the install will overwrite; (c) render the harness's templates against the substrate records; (d) write the projected files; (e) emit a `harness-installed` witness to the JSONL event-log naming the harness slug, manifest path, and projected-file count; (f) write `.pyfars/harness-manifests/<slug>.json` with every projected file plus captured prior state.
3. **Outcomes** — the polity-root carries the harness's projected files; the manifest enables exact `--uninstall`; the substrate event-log records the install as a substrate event.

Cite: [`harness`](../../concepts/harness.md), [`harness-manifest`](../../objects/harness-manifest.md), [`witness`](../../concepts/witness.md), [`wiring-protocols`](../specifications/wiring-protocols.md) §4.5 / §4.7, [`substrate-purity`](../decisions/substrate-purity.md), [`markdown-as-projection`](../decisions/markdown-as-projection.md).

## Acceptance

- [ ] `governance/skills/installing-a-harness.md` exists with gerunding-recipe form (Requirements / Steps / Outcomes).
- [ ] The frontmatter `description:` is exactly two sentences (per `m1-operational-housekeeping` acceptance criterion: "Skill records under `operations/engineering/skills/` follow gerunding-verb-phrase format with exactly two-sentence descriptions").
- [ ] All cross-references resolve.
- [ ] `governance/skills/_index.md` lists the new skill if that index curates a list (verify; the current `_index.md` is empty so this may be a no-op).

## Progress cells

*(empty — task not yet started)*
