---
title: "PyFARS explanations"
type: index
status: open
---

# PyFARS — explanations

Design discussions answering *why is it this way?* Explanations are not procedures and not reference.
They give the reader the mental model that lets them reason about edge cases on their own.

## Available explanations

- [`the-install-pipeline.md`](the-install-pipeline.md) — why `make` defers to Nix, why the pyfars input points at the in-tree submodule, why projected harness outputs are gitignored, why install and bootstrap are separate, where the source-of-truth lines fall.

## Planned

- *Substrate-as-truth, markdown-as-projection* — once the JSONL EAVT log architecture is wired, explain why events are the source of truth and markdown files are derived views, with worked examples of how a witness becomes a projection.
- *Free-tier-first dispatch* — why the dispatcher's tie-break ranks Cerebras > Groq > NVIDIA NIM > HF Router > Mistral, and why local Claude unix-tools rank below all of them.
- *The harness model* — what a harness is, why projection is one-way, what makes a good harness layout (`<runtime>/<projected files>`), and how harnesses compose.
