---
name: writing
description: Draft a Koios.News post from a research brief — the article plus its excerpt, meta description, and tweet — in the site's frontmatter shape. Consumes a researching brief; hands off to editing.
---

# Writing a Koios.News post

Take a brief from `working/researching/library/` and turn it into a publishable draft in `content/posts/`.
Write in Nik's voice (see `AGENTS.md`).

## Shape of the article

- **Lede (first paragraph):** state the event plainly and land the **SEO term** in it.
  Then the turn — why this is a fracture, not an incident.
- **Subheaders (`##`):** the SEO term appears in at least one.
  Each section reads the event through the collapse frame; no section treats it as isolated.
- **Length:** ≥ 800 words.
- **Citations:** primary sources by title, author, permalink — linked inline.
  Never paraphrase a source's argument away.
- **Close:** tie the event into the larger compounding pattern.
  A vision, never a prophecy — "might", not "will".

## The three extra outputs (frontmatter, not body)

Every post also carries, in its frontmatter — never as trailing sections in the body:

- `summary` — a ~50-word excerpt, SEO term included.
- `description` — a ~120-character meta description for link previews.
- `koios.tweet` — one share sentence with an emoji, no hashtags, SEO term included.

## Frontmatter shape

```yaml
title: "..."            # the descriptive headline
date: YYYY-MM-DD
draft: true             # editing clears this when the post ships
author: "Nik Koios"
slug: "..."
description: "..."      # ~120 char meta
summary: "..."         # ~50 word excerpt
keywords: ["<seo term>"]
categories: ["Climate Breakdown"]
tags: ["...", "..."]
koios:
  seo_term: "<seo term>"
  tweet: "..."
```

## Scripts

- `scripts/new-post.mjs "<title>" <seo-term>` — scaffold the post file in `content/posts/<slug>.md` with this frontmatter and section stubs, dated today and marked `draft: true`.
