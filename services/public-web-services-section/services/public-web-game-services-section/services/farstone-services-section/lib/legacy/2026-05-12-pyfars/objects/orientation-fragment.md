---
type: object
status: draft
realizes: [agent-orientation-projection]
depends-on: [harness, projection, substrate-purity]
---

# Orientation fragment

A substrate-authored unit of agent-orientation prose, projected by a per-runtime orientation harness into the runtime's root-level orientation file (`CLAUDE.md`, `AGENTS.md`, `README.md`, `replit.md`).
Each fragment carries one paragraph (or short list) of guidance, scoped to a topic and to one or more runtimes, and cites the system record from which the guidance derives.

The fragment exists so that the prose an agent reads on session start has a system audit trail — a paragraph in `CLAUDE.md` traces to a fragment, the fragment cites a skill/decision/norm/concept, and the polity's authoring source-of-truth remains in the system.
Without fragments, the orientation templates would be the originating source of their own discipline prose, inverting [substrate-purity](../governance/decisions/substrate-purity.md).

## Markdown shape

```markdown
---
type: orientation-fragment
slug: <kebab-case-name>
topic: <reading|writing|editing|committing|audit-output|running-engine|what-not-to-do|...>
applies-to-runtimes: [claude-code, agentic, replit, repository, "*"]
derives-from: [<governance/skill-or-decision-or-concept path>]
ordering: <integer; lower renders earlier within a topic>
status: draft
---

# Fragment body

The body is the actual prose rendered into the orientation file. Markdown-formatted;
imperative voice; names the system operations and morphisms that the source
record names. Relative-path links resolve against the rendered file's location
(typically the polity-root), not the fragment's authoring location.
```

## Cells

A fragment record's frontmatter projects to:

- `(slug, type, "orientation-fragment") = t`
- `(slug, topic, <topic>) = t` — the section the fragment belongs to
- `(slug, applies-to-runtime, <runtime>) = t` — one cell per runtime listed; `"*"` is a wildcard cross-runtime cell
- `(slug, derives-from, <path>) = t` — one cell per source record cited; at least one MUST be present for a non-`draft` fragment
- `(slug, ordering, <int>) = t` — sort key within a topic; defaults to 100 if absent

The body's prose is read at render-time; it is not projected into cells.

## Where it lives on disk

`<polity-root>/prose/orientations/<topic>/<slug>.md`.
Fragments are per-polity content — different polities running PyFARS will declare different fragments — so they live in the polity's system, not in the `pyfars` package.
The package owns the orientation harnesses and templates; the polity owns the fragments those templates render.

A directory with no fragments is fine; the corresponding template section will render empty (or be skipped, depending on the template's choice).
A polity that wants minimal orientation files declares minimal fragments; a polity that wants rich orientation files declares many.

## Read by orientation harnesses

The orientation harnesses (`claude-code-instructions`, `agentic`, `replit-instructions`, `repository`) read fragments at install time via the `_load_orientation_fragments(root, runtime)` resolver in [`pyfars/cli/install_harness.py`](../src/pyfars/cli/install_harness.py).
The resolver walks `prose/orientations/<topic>/`, parses frontmatter, filters by `applies-to-runtimes`, sorts by `(ordering, slug)`, and exposes a `fragments(topic)` callable to the Jinja context.
Each template loops over `fragments(topic)` for content sections.

## Relation to source records

Every fragment cites at least one `derives-from:` source.
Valid sources:

- A `governance/skills/<gerund>.md` skill record — e.g. `governance/skills/committing-a-change-with-git/`.
- A `governance/decisions/*.md` decision record.
- A `governance/norms/*.md` norm record (where the polity has them).
- An upstream concept/object/morphism in the theories tree.

Not valid sources:

- Another fragment — fragments must ground in non-fragment substrate, or the citation chain has no terminus.
- A runbook — too procedural to ground orientation prose; runbooks are about *doing*, fragments are about *orienting*.
- PyFARS CLI help text — that is downstream of the system, not source.

The fragment is a *human-curatorial* projection of its source.
Auto-extraction from a source record's full prose is intentionally out of scope; the fragment is written by hand to be agent-readable in its target file, and may compress, reorder, or rephrase the source's content.
When a source record changes substantially, the fragment is revised by hand to match — the chain is maintained by curators, not by mechanical sync.

## What this object commits to

1. **Single source per paragraph.** Every paragraph in a rendered orientation file traces to exactly one fragment.
  Two fragments that say similar things on the same topic are two separate audit-trail entries, not a single conflated paragraph.
2. **Audit trail.** Every fragment cites at least one substrate source record.
  A fragment that cites nothing is not a valid fragment; either it belongs in a source record (and a fragment derived from that source authored), or it is opinion the polity has not yet committed to the system.
3. **Per-runtime visibility.** `applies-to-runtimes` controls which orientation files the fragment appears in.
  The agentic-multivendor convention shares most prose with claude-code (so fragments default to `["*"]`), but fragments specialize when the prose names a runtime-specific tool, file path, or convention.
4. **Substrate-purity preserved.** The harness writes nothing the substrate hasn't authored.
  A reader auditing the rendered orientation file can reconstruct it from the fragments plus the template's layout choices.

## What this object does NOT commit to

- A specific topic vocabulary.
  The set `{reading, writing, editing, committing, audit-output, running-engine, what-not-to-do}` is the *current* topic set used by the orientation harnesses — it can grow as the templates loop over additional topics.
  The object record does not enumerate topics.
- Auto-extraction from source records.
  Fragments are hand-authored; the relationship to the source is curatorial.
- A fragment's prose being a perfect summary of its source.
  The fragment is the source's *agent-orientation projection* — the slice of the source that belongs in front of an agent on session start.
  The source is more general; the fragment is more focused.
- The relationship between fragments and runtimes-not-yet-named.
  `applies-to-runtimes: ["cursor"]` is fine syntactically; whether any harness consumes `cursor` fragments is up to the per-runtime harness's existence.

## Distinguishing from related objects

- **A skill record** is *what an agent can do* — invocation surface, capability requirements, body of instructions for performing a skill.
  An orientation fragment may *cite* a skill but is *not* a skill — fragments have no `provides-capability:`, no `requires-capabilities:`, no `input-shape`/`output-shape`.
  The fragment is the skill's orientation-projection; the skill is the authoring source.
- **A decision record** captures a choice the polity has made.
  A fragment may cite a decision; the decision remains the source of truth, and the fragment summarizes its operative consequence in the form an agent reading orientation needs.
- **An `_index.md` file** orients a directory.
  Fragments orient an *agent at session start*.
  The two surfaces overlap in spirit but project differently — `_index.md` is read by a navigator who has already arrived at a directory; the fragment is read by an agent who has just opened a session.
- **A README.md** is also a derived projection (the `repository` harness writes it from fragments); the fragment is the substrate input, the README the rendered output.
  Same relationship as the rendered `CLAUDE.md` to its fragments.

## Implementation pointers

The object is realized by:

- The schema in this file's frontmatter (declarative).
- The fragment-record set under `<polity-root>/prose/orientations/` (instances).
- The resolver `_load_orientation_fragments(root, runtime)` in [`pyfars/cli/install_harness.py`](../src/pyfars/cli/install_harness.py) (read).
- The four per-runtime orientation harnesses (`claude-code-instructions`, `agentic`, `replit-instructions`, `repository`) consuming the resolver in their templates (write).
- The [`authoring-an-orientation-fragment`](../governance/skills/authoring-an-orientation-fragment.md) skill (curation discipline).

## Open structural questions

- **Topic vocabulary as substrate.** Currently the topic set is implicit in the templates' loops — adding a new topic requires both authoring fragments under the topic AND extending each template that should render it.
  A more substrate-pure design would have a `topics:` declaration somewhere (a `prose/orientations/_index.md` listing valid topics, or a fragment-index under the harness) so the templates loop over a substrate-declared topic set.
  Deferred until the per-template ordering question makes the absence painful.
- **Layered fragments.** Whether fragments should support inheritance — a `repository` fragment that's also visible in `claude-code-instructions` if no runtime-specific override exists — or whether `applies-to-runtimes: ["*"]` is the only sharing mechanism.
  `["*"]` is simpler; the question is whether more nuance is needed.
