---
title: "Author the session record type"
type: task
area: engineering
status: open
horizon: soon
milestone: m4-memory-feedback
goal: sessions-wrap-each-tick
depends-on: []
requires-capabilities: [substrate-authoring, frontmatter-design]
theory-basis: [session-as-entity, recurrent-practice]
---


## Description

Add a `session` record type to the substrate: a template at `governance/templates/session.md`, an entry in [`governance/conventions.md`](../../../governance/conventions.md) declaring the frontmatter shape, and an entry in [`governance/specifications/directories.md`](../../../governance/specifications/directories.md) under `work/` (or wherever sessions live — TBD between `work/sessions/` and a runtime-only location at `<substrate-root>/.pyfars/sessions/`).

The session record's frontmatter:

```yaml
---
title: "Session <session-id>"
type: session
slug: <session-id>            # content-derived, replay-stable
cycle-of: tick
opened-at: <ISO-timestamp>
closed-at: <ISO-timestamp>    # absent until close
dispatch-count: <n>            # populated at close
observation-count: <n>         # populated at close
agents-active: [<agent-slug>]  # which agents took dispatches in this session
---
```

The body is empty at open; consolidated cells get added at close.

## Acceptance

- [ ] `governance/templates/session.md` exists with the canonical frontmatter shape.
- [ ] [`governance/conventions.md`](../../../governance/conventions.md) declares the session record type alongside the work-record hierarchy, with status values (`open`, `closed`).
- [ ] [`governance/specifications/directories.md`](../../../governance/specifications/directories.md) names where sessions live; the canonical answer is `<substrate-root>/.pyfars/sessions/<session-id>/_index.md` (runtime-emitted, gitignored, but substrate-readable).
- [ ] An [observation](../../observations/_index.md) record example showing `(observation, in-session, <session-id>) = T` exists to validate the bridge to the substrate's observation fiber.

## Progress cells

*(empty — task not yet started)*
