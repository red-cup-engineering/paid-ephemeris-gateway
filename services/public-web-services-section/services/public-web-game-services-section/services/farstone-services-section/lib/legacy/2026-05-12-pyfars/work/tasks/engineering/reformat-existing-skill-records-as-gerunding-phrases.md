---
title: "Reformat existing skill records as gerunding phrases"
type: task
area: engineering
status: open
horizon: doing
milestone: m5-agential-self-generation
goal: new-skill-records-dispatchable-next-tick
depends-on: []
requires-capabilities: [corpus-editing]
theory-basis: [skill-as-gerund]
---


## Description

Walk `governance/skills/` (and any polity-specific `skills/` paths) and reformat each skill record's title and body to follow the gerunding-recipe form per the captain's preference: skill names as verb-gerund-noun phrases ("validating-frontmatter", "committing-a-change-with-git"), bodies structured as gerunding recipes (the operation as a continuous-aspect doing-thing, not a noun).

Per CLAUDE.md guidance and the captain's recent rewrites of `committing-a-change-with-git` and `writing-a-term-or-concept`, this is the conventional form for skills going forward.
Older skill records with noun-form names ("validate-frontmatter", "commit-change") should be renamed and their bodies adjusted to the recipe shape.

The reformatting is mechanical for many records but requires per-skill judgment for the body — a skill named "diagnose-failing-test" rewrites to "diagnosing-a-failing-test" (gerund + article + noun-phrase) and the body restructures from imperative-list to recipe-form (ingredients, steps, expected end-state).

## Acceptance

- [ ] All records under `governance/skills/` use gerunding-phrase titles (verb+`-ing` form).
- [ ] All record bodies follow the gerunding-recipe shape (situation → ingredients → steps → end-state) per the existing rewritten examples.
- [ ] Renames preserve cross-references: any `depends-on:` or body link pointing to an old slug is updated.
- [ ] A `pyfars validate` run after the reformat shows no broken references introduced.

## Progress cells

*(empty — task not yet started)*
