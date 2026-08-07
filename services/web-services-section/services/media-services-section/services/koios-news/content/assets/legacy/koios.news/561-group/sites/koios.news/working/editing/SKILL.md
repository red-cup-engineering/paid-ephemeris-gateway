---
name: editing
description: Audit a draft before it ships — voice, SEO-term placement, citations, length, and the no-prophecy rule. Mostly mechanical checks via lint-post; the judgment calls are voice and citations.
---

# Editing a Koios.News post

Nothing ships until it passes here.
Two layers: the mechanical checks (run the linter) and the judgment checks (you, reading as Nik).

## Mechanical — run the linter

`scripts/lint-post.mjs content/posts/<slug>.md` checks:

- body length ≥ 800 words;
- the SEO term (`koios.seo_term`) appears in the **first paragraph**;
- the SEO term appears in **at least one `##` subheader**;
- `summary` (~50 words), `description` (~120 chars), and `koios.tweet` are all present and non-empty;
- reports the `draft` state.

It exits non-zero if a hard check fails.
Fix and re-run until clean.

## Judgment — read it as Nik

- **Voice.** Confident-but-comfortable, content-farm register, concise.
  No hedging filler, no academic throat-clearing.
  One or two examples, not a pile.
- **Citations.** Every claim that needs a source has one, by title/author/ permalink, linked inline.
  No source's argument paraphrased away.
- **No prophecy.** Scan for "will happen" / certainty about the future.
  A vision is "might", not "will".
  Rewrite anything that predicts.
- **Not isolated.** Every section connects the event to the larger compounding phenomenon.
  Cut any paragraph that treats it as a one-off.

## Scripts

- `scripts/lint-post.mjs <post.md>` — the mechanical checks above.
