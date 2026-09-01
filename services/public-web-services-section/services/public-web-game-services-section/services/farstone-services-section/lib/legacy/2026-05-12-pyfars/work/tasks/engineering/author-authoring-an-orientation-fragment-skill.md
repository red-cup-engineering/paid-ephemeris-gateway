---
title: "Author the authoring-an-orientation-fragment skill"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: orientation-files-derive-from-substrate
depends-on: [author-orientation-fragment-object-record]
requires-capabilities: [substrate-authoring, gerunding-recipe-form]
theory-basis: [substrate-purity]
---


## Description

After [`orientation-fragment`](../../../objects/orientation-fragment.md) the object record exists, the captain (or any agent) needs an authoring discipline for instances.
Author `tools/platform/pyfars/governance/skills/authoring-an-orientation-fragment.md` in gerunding-recipe form per the existing skills under `pyfars/governance/skills/`.

The skill's body covers:

1. **Picking the topic.** The set of valid topics — `reading`, `writing`, `editing`, `committing`, `audit-output`, `running-engine`, `what-not-to-do` — is open but the orientation harnesses query against fixed topics.
  Adding a new topic requires both the fragment and a template change (the template loops over a fixed set of topics for ordering).
2. **Picking the runtime set.** `applies-to-runtimes: ["*"]` is the default for cross-runtime advice (committing discipline, what-not-to-do).
  Specialize to specific runtimes only when the prose names a runtime-specific tool, file path, or convention.
3. **Citing `derives-from`.** Every fragment cites at least one source.
  Valid sources: a `governance/skills/*.md` skill record; a `governance/decisions/*.md` decision; a `governance/norms/*.md` norm if the polity has them; an upstream concept/object/morphism in the theories tree.
  NOT valid: another fragment (would create a citation chain with no ground); a runbook (runbooks are too procedural to ground orientation prose); pyfars CLI help text (that's downstream, not source).
4. **Writing the prose.** Markdown body.
  Imperative voice.
  Names the substrate operations and morphisms the source record names.
  Keep relative-path links; they will be rewritten at render-time to resolve against the rendered file's location.
5. **Setting `ordering:`.** Lower numbers render first within a topic.
  Default: 100.
  Use 50 for "this should appear before most other fragments on this topic"; 200 for "this is a footnote-style addition."
  Don't use ordering to encode topic-level precedence — that belongs in the template's topic ordering, not the fragment's.
6. **Where it goes on disk.** `<polity-root>/prose/orientations/<topic>/<slug>.md` — *not* in `pyfars/governance/skills/` and *not* in any package directory.
  Fragments are per-polity content.

The frontmatter description must be exactly two sentences per the skill-authoring discipline.

## Acceptance

- [ ] `tools/platform/pyfars/governance/skills/authoring-an-orientation-fragment.md` exists, gerunding-recipe form, two-sentence description.
- [ ] The skill cites [`orientation-fragment`](../../../objects/orientation-fragment.md) and [`harness`](../../../concepts/harness.md).
- [ ] The skill's `Outcomes` section names: a fragment file at `<polity-root>/prose/orientations/<topic>/<slug>.md`; the next install of the relevant orientation harness picks it up; the rendered orientation file gains a paragraph with the fragment's prose.

## Progress cells

*(empty — task not yet started)*
