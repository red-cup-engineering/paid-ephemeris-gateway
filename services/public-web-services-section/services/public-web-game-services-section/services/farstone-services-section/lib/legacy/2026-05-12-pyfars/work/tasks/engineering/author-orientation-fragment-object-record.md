---
title: "Author the orientation-fragment object record"
type: task
area: engineering
status: open
horizon: captured
milestone: m1-operational-housekeeping
goal: orientation-files-derive-from-substrate
depends-on: []
requires-capabilities: [substrate-authoring, frontmatter-design]
theory-basis: [substrate-purity, projection-not-authoring]
---


## Description

The [`orientation-files-derive-from-substrate`](../../goals/orientation-files-derive-from-substrate.md) goal calls for an `orientation-fragment` object whose instances govern the prose an agent reads on session start.
Author `tools/platform/pyfars/objects/orientation-fragment.md` declaring the object record's frontmatter shape and on-disk discipline.

Schema:

```yaml
---
type: orientation-fragment
slug: <kebab-case-name>
topic: <reading|writing|editing|committing|audit-output|running-engine|what-not-to-do|...>
applies-to-runtimes: [claude-code, agentic, replit, repository, "*"]
derives-from: [<governance/skill-or-decision-or-norm path>]
ordering: <integer; lower = earlier in the rendered section>
status: draft
---
```

The frontmatter cells project to:

- `(slug, type, "orientation-fragment")` — record-kind cell
- `(slug, topic, <topic>)` — section the fragment belongs to
- `(slug, applies-to-runtime, <runtime>)` — one cell per runtime listed; `"*"` means cross-runtime
- `(slug, derives-from, <path>)` — one cell per source record cited
- `(slug, ordering, <int>)` — sort key for fragments within a topic

Body sections (mirror sibling object records like `objects/skill-record.md`):

1. **What it carries.** The fragment's `prose:` body — the actual text rendered into orientation files.
  Markdown-formatted; relative-paths in links MUST resolve against the *rendered file's location* (typically the polity-root), not the fragment's authoring location.
2. **Where it lives on disk.** `<polity-root>/prose/orientations/<topic>/<slug>.md`.
  Fragments are substrate cells, not pyfars-package content — different polities can declare different fragments, just as they declare different polity records or charter content.
3. **Relation to source records.** Every fragment cites at least one `derives-from:` source.
  The fragment is a *projection* of its source records into agent-orientation shape; the source records remain the authoring truth.
  When a source record changes substantially, the fragment is revised to match — the chain is kept by hand, not auto-derived (the projection is *human curatorial*, not mechanical extraction).
4. **What this object commits to.** Single-source-per-paragraph (every paragraph in the rendered orientation file traces to one fragment); audit-trail (every fragment cites at least one source record); per-runtime visibility (`applies-to-runtimes` controls which orientation file the fragment appears in, allowing the agentic-multivendor convention to share most prose with claude-code while specializing where the runtimes diverge).
5. **What this object does NOT commit to.** Auto-extraction from source records — fragments are written by hand to be agent-readable in their target file, not extracted from the source's full prose.
  The source record is more general than the fragment; the fragment is the source's *agent-orientation projection*, not a copy.

## Acceptance

- [ ] `tools/platform/pyfars/objects/orientation-fragment.md` exists with the frontmatter shape above and the five body sections.
- [ ] The object record cites [`harness`](../../../concepts/harness.md) and [`substrate-purity`](../../../governance/decisions/substrate-purity.md) as theory basis.
- [ ] At least one of the new orientation harness `_index.md` files (under `claude-code-instructions/`, `agentic/`, `repository/`, `replit-instructions/`) cites this object record.

## Progress cells

*(empty — task not yet started)*
