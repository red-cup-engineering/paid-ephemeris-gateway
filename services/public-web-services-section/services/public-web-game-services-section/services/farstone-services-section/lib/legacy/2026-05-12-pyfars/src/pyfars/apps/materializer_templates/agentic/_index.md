---
kind: harness
title: "Agentic conventions harness"
type: harness
target-default: "."
target-runtime: "agentic"
manifest: ".pyfars/harness-manifests/agentic.json"
emits:
  - template: "AGENTS.md.j2"
    target-pattern: "AGENTS.md"
    mode: aggregate
    context: ["orientation"]
---


Generates the polity-root's `AGENTS.md` — the multi-vendor agentic-conventions file consumed by Codex, Cursor, Aider, Cline, and other AGENTS.md-aware editors — from substrate state plus the template owned by this harness.

The `agentic` runtime is not a single product; it is the convention.
AGENTS.md emerged in 2025 as the lowest-common-denominator name vendors agreed on for project-level agent instructions.
A polity that wants its conventions visible to every AGENTS.md-consuming editor declares this harness; vendor-specific harnesses (e.g., `claude-code-instructions` for `CLAUDE.md`) carry vendor-shaped variants where they diverge.

## What it writes

| File | Template | Consumer |
|---|---|---|
| `AGENTS.md` | [`templates/AGENTS.md.j2`](templates/AGENTS.md.j2) | Codex / OpenAI ChatGPT, Cursor, Aider, Cline, plus future AGENTS.md-aware tools |

The generated file carries a banner at the top noting it's harness-generated and pointing at the regeneration command.

The manifest is written to `.pyfars/harness-manifests/agentic.json`.

## Substrate context the template sees

Same context shape as the other orientation harnesses (polity / captain / ship / theory roll-up), plus the `fragments(topic)` callable filtered to runtime `agentic` plus cross-runtime (`*`).
See [`orientation-fragment`](../../../objects/orientation-fragment.md).

## Run

```bash
pyfars install-harness agentic
pyfars install-harness agentic --dry-run
pyfars install-harness agentic --uninstall
```

## Editing

Edit substrate orientation-fragment records under `<polity-root>/prose/orientations/<topic>/<slug>.md` to change prose; edit [`templates/AGENTS.md.j2`](templates/AGENTS.md.j2) to change layout.
A fragment with `applies-to-runtimes: ["*"]` appears in both `AGENTS.md` and `CLAUDE.md`; a fragment with `applies-to-runtimes: ["agentic"]` appears only in `AGENTS.md`.
