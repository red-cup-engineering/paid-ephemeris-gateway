---
name: "Authoring an orientation fragment"
description: "Creates an orientation-fragment record under prose/orientations/<topic>/ that the per-runtime orientation harnesses render into the polity's root-level orientation files. Use whenever adding a new piece of session-start guidance whose substrate ground (a skill, decision, norm, or concept) is already authored."
---


## Requirements

- The substrate source the fragment will derive from already exists — a `governance/skills/<gerund>.md` skill record, a `governance/decisions/*.md` decision, a `governance/norms/*.md` norm, or an upstream concept/object/morphism path under the theories tree.
  Without an extant source, the fragment has nothing to ground in; author the source first or skip the fragment.
- The polity-root carries `prose/orientations/` (or it is acceptable to create the directory along with the topic subdirectory on first authoring).
- The topic the fragment belongs to is in the orientation harness templates' loop set — `reading`, `writing`, `editing`, `committing`, `audit-output`, `running-engine`, `what-not-to-do`, plus any topics the templates have since added.
  Adding a new topic requires a coordinated template change; this skill does not cover that.

## Steps

1. **Identify the source.** Pick the substrate record the fragment will cite in `derives-from:`.
  Read it.
  The fragment's prose must be present in (or directly summarizing) the source — if you find yourself writing prose the source does not assert, the fragment is *invention*, not derivation; either revise the source first or drop the fragment.
2. **Identify the topic.** Place the fragment under whichever section of the orientation file it should appear in.
  Topics are the section headings the templates render: `reading`, `writing`, `editing`, `committing`, `audit-output`, `running-engine`, `what-not-to-do`.
  Don't conflate — a fragment about *how to commit a change* belongs in `committing`, not `writing`, even if the change involves writing.
3. **Identify the runtime set.** Default `applies-to-runtimes: ["*"]` for cross-runtime advice.
  Specialize only when the prose names a runtime-specific tool or convention (e.g., `["claude-code"]` for advice that mentions Claude Code's hook protocol; `["agentic"]` for advice specific to AGENTS.md-consuming editors).
  When in doubt, default to `["*"]`; over-specialization fragments the orientation surface unnecessarily.
4. **Pick the slug.** Lowercase, hyphenated, descriptive of the fragment's content rather than its source.
  `cite-task-slugs-in-commit-messages` is good; `committing-a-change-with-git-fragment-1` is not.
5. **Author the frontmatter** at `prose/orientations/<topic>/<slug>.md`:
   - `type: orientation-fragment`
   - `slug: <slug>`
   - `topic: <topic>`
   - `applies-to-runtimes: [<runtime>, ...]
     `
   - `derives-from: [<path-to-source-record>, ...]
     ` — relative path; one entry minimum.
   - `ordering: <int>` — default 100; lower for fragments that should render first within the topic; higher for footnote-style fragments.
   - `status: draft` until the fragment is reviewed; `settled` once the captain (or designated reviewer) confirms the prose matches the source.
6. **Author the body.** A single readable paragraph (2–6 sentences) or a short bulleted list (3–7 items).
  Imperative voice.
  Markdown allowed but kept light — no headings inside the body (the template provides the topic heading).
  Relative-path links resolve against the rendered orientation file's location, which is the polity-root; write `[committing-a-change-with-git](governance/skills/committing-a-change-with-git/)`, not `[…](../skills/…)`.
7. **Cross-check that the prose is in the source.** Re-read the source record.
  Every assertion in the fragment should be findable in the source's body or frontmatter.
  If not, the fragment is exceeding its source; revise the fragment to stay within the source's scope, or revise the source first.
8. **Verify nothing else cites this slug.** Two fragments with the same slug under different topics are fine (different file paths).
  Two fragments with the same slug *and* topic collide — pick a different slug.

## Outcomes

- A new file at `<polity-root>/prose/orientations/<topic>/<slug>.md` with `type: orientation-fragment`.
- The next install of the relevant orientation harness (`pyfars install-harness claude-code-instructions`, etc.) picks up the fragment automatically — no template edits needed.
- The rendered orientation file gains a paragraph (or list) at the position determined by the fragment's `ordering:` and slug.
- The `derives-from:` cell is read by audit tooling so a paragraph in the rendered `CLAUDE.md` traces to its source skill/decision/norm/concept.

## Discipline notes

- **Substrate-purity ([decision](../decisions/substrate-purity.md)).** The fragment is what makes the substrate-pure orientation surface possible.
  A template carrying its own discipline prose violates substrate-purity by becoming a second authoring source.
  The fragment routes the prose through substrate where it can be audited.
- **Curatorial, not extracted.** The fragment is hand-written to be agent-readable in its target file, not auto-extracted from the source.
  The source is more general; the fragment is the source's *agent-orientation projection*.
  When the source changes substantially, the fragment is revised by hand.
- **One paragraph per fragment.** Two-paragraph fragments fragment poorly — readers lose track of which paragraph belongs to which fragment.
  Author two fragments instead, with `ordering:` controlling their sequence.
- **Per [`link-to-records-not-shortcodes`](../duties/link-to-records-not-shortcodes.md)**, the fragment body links to substrate records by markdown link rather than by bare slug or by shortcode.
- **A fragment without `derives-from:` is not a valid fragment.** A fragment that cites nothing is opinion the polity has not committed to substrate.
  Either commit it (author the source record), or do not author the fragment.
