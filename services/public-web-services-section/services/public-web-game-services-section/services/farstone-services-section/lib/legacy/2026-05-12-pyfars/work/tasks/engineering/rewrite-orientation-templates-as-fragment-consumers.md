---
title: "Rewrite orientation templates as fragment consumers"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: orientation-files-derive-from-substrate
depends-on: [implement-orientation-fragments-resolver, harvest-orientation-fragments-from-existing-substrate, split-repo-instructions-into-per-runtime-harnesses]
requires-capabilities: [jinja2-template-authoring]
theory-basis: [projection-not-authoring]
---


## Description

After the harnesses are split, the resolver exists, and fragments are authored, rewrite each per-runtime template to consume fragments instead of carrying hardcoded discipline prose.

For each of `claude-code-instructions/templates/CLAUDE.md.j2`, `agentic/templates/AGENTS.md.j2`, `replit-instructions/templates/replit.md.j2`, `repository/templates/README.md.j2`:

1. Keep template-owned: the harness-generated banner; section ordering (which topics appear in which order); section headings (`## Reading`, `## Writing`, `## Committing`, etc.); the captain handoff (`## Captain` section, derived from the captain context); cross-references to other orientation files; runtime-specific layout and tone choices (CLAUDE.md and AGENTS.md may share content but differ in tone — that's template-owned).
2. Replace hardcoded prose with fragment loops:

```jinja
## Reading

{% for f in fragments("reading") %}
{{ f.prose }}
{% if not loop.last %}

{% endif %}
{% endfor %}
```

3. For substrate-derived facts the templates already use (`polity.title`, `captain.title`, `predicated_computing_subtheories`, etc.), keep them — those are already derivation-shaped.
4. The `.gitignore.j2` template under `repository/templates/` is a near-special-case: there's no fragment-shaped prose for `.gitignore` because the lines aren't paragraphs.
  Author it as a flat list of patterns sourced either from a single `prose/orientations/gitignore-patterns/` set of fragments (one fragment per logical pattern group) or, more pragmatically, from a single substrate-side `.gitignore` curation file at `561/governance/conventions/gitignore.md` cited by the template.
  Pick whichever is simpler in the implementation pass.

When a topic has no fragments (the resolver returns `[]`), the template should either skip the section entirely or emit a visible `*(no fragments authored for this topic)*` marker.
Skipping is cleaner; the marker is preferable while the substrate is still being filled in.
Default to the marker for the first pass so gaps are visible.

After rewrite, the templates should be substantially shorter than today.
The current `CLAUDE.md.j2` is ~106 lines; the rewritten one should be in the 30–50-line range — banner, layout, captain, cross-refs, and the topic loops.
The volume is moved into substrate fragments, not lost.

## Acceptance

- [ ] No template under `claude-code-instructions/templates/`, `agentic/templates/`, `replit-instructions/templates/`, `repository/templates/` carries hardcoded discipline prose for any of the named topics.
- [ ] Each template uses `{% for f in fragments(topic) %}` loops for content sections.
- [ ] Section ordering is template-owned (not substrate-encoded).
- [ ] Templates render against the 561 polity (with the harvested fragments) producing readable orientation files — visually inspected, not just lint-passed.
- [ ] The `.gitignore.j2` template's prose-source decision is recorded in the `repository/_index.md` so future curators know where to add patterns.

## Progress cells

*(empty — task not yet started)*
