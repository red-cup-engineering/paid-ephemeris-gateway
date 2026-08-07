---
name: researching
description: Find the day's story — an under-discussed current event that is a window onto collapse — and fix its single SEO term. Run this first; its brief feeds writing.
---

# Researching a Koios.News story

The job is not to cover the biggest headline.
It is to find the event that is **under-discussed relative to how much it reveals** — the small fracture that is a clear window onto the larger emergent phenomenon.

## Process

1. **Scan the last 24 hours to 7 days** of news.
  Only use events you can confirm happened within the last week.
2. **Pick for revelation, not size.** Favour an event that (a) is not being widely discussed, and (b) connects cleanly to the collapse frame — climate breakdown as upstream cause, a compounding feedback rather than an isolated incident.
3. **Find the primary sources.** Get title, author, and permalink for each.
  You will cite these, not paraphrase them away.
4. **Name the synthetic frame** — the one sentence that says what larger system this event is a window onto.
5. **Choose the single SEO term.** One term the whole post will align to; it must read naturally in a first paragraph and in a subheader.
6. **Feasibility-check** any future the event implies: can the world actually support that adaptation at that point?

## Output: a research brief

Write a brief to `library/<YYYY-MM-DD>-<slug>.md` (use the script).
It carries: the event, the confirmed primary sources, why it is under-discussed, the chosen SEO term, and the collapse-connection angle.
The brief is what `working/writing/` consumes.

## Working from a specific source

Sometimes the story starts the other way round: someone hands you ONE source — a
think-tank dispatch, an investigation, a report — and asks whether it belongs in
Koios. The **submission desk** is for that. It does not paraphrase the source
into a post; it appraises beat fit, then *finds more* — pulling related items out
of the beat's own wires (and any sources you already found by hand) — and
synthesizes original, multi-source analysis anchored on the seed, through the
same cultivation cycle every article runs through.

- A source outside every Koios beat is witnessed as out-of-frame and never
  drafted (the same lawful shape as unsupported demand).
- The seed leads; related wire matches and your discoveries are the supporting
  context the analysis draws on. Aim for several real sources cited, not one.
- The draft candidate is a starting point, not the post. A single-source
  LLM rewrite is slop; the editor's job is the original synthesis across the
  gathered sources, with every figure and claim warranted.

```sh
# JSON on stdin (url + title required; summary/text/beat/term optional):
echo '{"url":"…","title":"…","summary":"…","beat":"collapse-conflict"}' \
  | pnpm --filter @emsenn/koios.news run source:submit
```

In code, `submitSource(seed, { mode: "expand", discoveredSources })` from
`@emsenn/koios.news/researching/sourcing`; `gatherRelatedSources(...)` exposes
the "find more" step on its own.

## Scripts

- `scripts/new-brief.mjs "<title>" <seo-term>` — scaffold a dated brief in `library/` with the sections above, ready to fill in.
- `pnpm --filter @emsenn/koios.news run source:submit` — submit one specific source (JSON on stdin) for appraisal and multi-source expansion.
