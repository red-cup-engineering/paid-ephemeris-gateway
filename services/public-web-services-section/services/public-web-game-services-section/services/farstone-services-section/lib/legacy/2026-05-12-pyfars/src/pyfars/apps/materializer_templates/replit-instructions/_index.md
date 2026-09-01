---
kind: harness
title: "Replit instructions harness"
type: harness
target-default: "."
target-runtime: "replit"
manifest: ".pyfars/harness-manifests/replit-instructions.json"
emits:
  - template: "replit.md.j2"
    target-pattern: "replit.md"
    mode: aggregate
    context: ["orientation"]
---


Generates the polity-root's `replit.md` — the project-context file the Replit Agent reads on session start — from substrate state plus the template owned by this harness.

Sister to `replit` (skill shims → `.agents/skills/`) and `replit-config` (`.replit` desired-state).
Each owns one Replit-shaped projection target; this one owns the orientation file at the polity-root.

## What it writes

| File | Template | Consumer |
|---|---|---|
| `replit.md` | [`templates/replit.md.j2`](templates/replit.md.j2) | Replit Agent |

The generated file carries a banner at the top noting it's harness-generated and pointing at the regeneration command.

The manifest is written to `.pyfars/harness-manifests/replit-instructions.json`.

## Substrate context the template sees

Same context shape as the other orientation harnesses, plus the `fragments(topic)` callable filtered to runtime `replit` plus cross-runtime (`*`).
See [`orientation-fragment`](../../../objects/orientation-fragment.md).

## Run

```bash
pyfars install-harness replit-instructions
pyfars install-harness replit-instructions --dry-run
pyfars install-harness replit-instructions --uninstall
```

## Editing

Edit substrate orientation-fragment records under `<polity-root>/prose/orientations/<topic>/<slug>.md` to change prose; edit [`templates/replit.md.j2`](templates/replit.md.j2) to change layout.
