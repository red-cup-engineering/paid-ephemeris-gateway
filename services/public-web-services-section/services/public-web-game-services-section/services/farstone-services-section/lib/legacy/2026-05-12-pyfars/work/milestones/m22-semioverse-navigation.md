---
title: "M22 — Semioverse Navigation (Substrate as Traversable World)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: speculative
depends-on: [m14-application-development-surface, m5-agential-self-generation, m8-inbound-participation-mcp-clients]
goals:
  - persona-records-carry-location-state
  - navigation-tools-look-go-find
  - role-bounded-capability-sets-per-persona
  - closure-participation-witnesses-each-write
  - multi-persona-concurrent-closure
  - world-consistency-metric-in-web-ui
  - transcript-watcher-office
  - bridge-companion-agent
theory-basis: [office-as-fuzzy-cell, agential-self-generation, closure-rule-language, session-as-entity]
prior-art:
  - engineering-archive/library/triage/from-tech-bucket-2/slop/2026-03-12/big-picture-imagining.md
  - engineering-archive/ideas/transcript-watcher-office.md
  - engineering-archive/operations/command/ideas/triage/companion-instead-of-buddy.md
backing-gaps:
  - pyfars/objects/persona-record.md (NOT YET AUTHORED — publishable identity with location-state and roles)
  - pyfars/objects/location-state-cell.md (NOT YET AUTHORED — current substrate path an agent occupies)
  - pyfars/objects/world-consistency-metric.md (NOT YET AUTHORED — graph distance to fixed point, surfaced in web UI)
  - pyfars/objects/closure-participation-record.md (NOT YET AUTHORED — before/after graph-distance witness per write)
  - pyfars/objects/transcript-watcher-record.md (NOT YET AUTHORED — office record for async session-transcript capture)
  - pyfars/objects/companion-agent-record.md (NOT YET AUTHORED — bridge-watching haiku-tier anomaly surfacer)
  - pyfars/morphisms/navigating.md (NOT YET AUTHORED — look/go/find as substrate traversal morphisms)
  - pyfars/claims/substrate-is-traversable-world.md (NOT YET AUTHORED)
acceptance: "An agent persona record carries a current-location cell. `look`, `go`, and `find` MCP tools are exposed by the PyFARS MCP server and return structured substrate traversal results. Each write by an agent emits a closure-participation record with before/after world-consistency-metric values. Multiple agent sessions are active on the same substrate simultaneously without write-conflict data loss (conflicts resolve via bilattice meet). The transcript-watcher office is instantiated and running on at least one real polity: after a captain ↔ agent session closes, the watcher reads the transcript and files at least one action item into the substrate. The bridge-companion agent watches the event stream and surfaces at least one anomaly observation per session."
---

# M22 — Semioverse Navigation

The substrate is a MUD.
This is not decorative — it is technically exact.

A typed predication graph with geography (directory structure), inhabitants (agent persona records), physics (closure rules), and history (event log) IS a MUD world.
When an agent connects to this world via MCP, it doesn't retrieve fragments — it **navigates**.
It `look`s.
It `go`es.
It reads what's in the room.
It follows exits.
It asks the world questions and it answers from its own structure.

[M8](m8-inbound-participation-mcp-clients.md) exposes substrate tools via MCP for external clients.
[M14](m14-application-development-surface.md) provides the application SDK surface.
M22 uses those foundations to make the navigational metaphor operational: persona records carry location state, traversal tools expose MUD-style semantics, and every agent write becomes a **closure-participation event** — a move toward the predicate graph's fixed point.

## What's built

### Persona records carry location state

A **persona** (distinct from a `personnel` record — a persona is a publishable identity in the world, not necessarily a human) carries a `current-location` cell pointing to a substrate path:

```
(persona:emsemiote, current-location, library/domains/sociology/concepts/, t, session: <session-id>)
```

"Being somewhere" in the substrate means: the world around you (that region of the predication graph) is contextually active.
Navigation tools return results relative to the current location.
An agent that has been "in" the same region for multiple sessions has a richer context picture of that region than one making a first visit.

The location cell updates on `go` calls; the session lifecycle (from [M3](m3-continuous-loop.md)) opens a location and restores it at next login.
Multiple personas can occupy the same location; no mutual exclusion.

### Navigation tools: look, go, find

The PyFARS MCP server exposes three navigation tools (extending [M8](m8-inbound-participation-mcp-clients.md)'s MCP surface):

**`look`** — lists entities and exits at the agent's current location.
Returns: - Entity list: every substrate object whose canonical path is under `current-location`, with type, title, and a one-sentence description cell - Exit list: every relation type leading out of the current region (e.g. `defines`, `cites`, `depends-on`, `extends`) and the count of reachable nodes per relation type - Live status: any active agents occupying this location; any in-progress workitems in this region

**`go`** — traverses to an adjacent region.
Arguments: a relation type and a target slug (or a direct path).
Updates the `current-location` cell.
Returns the `look` output of the new location.

**`find`** — substrate query from the current location.
Arguments: type/predicate/value filters.
Returns matching objects ordered by proximity to current-location (graph distance).
Not full-text search — structural query over the predication graph.

The navigational metaphor over the MCP surface replaces "throw a prompt at a vector store and hope for fragments" with "be in a place and look at what's there."

### Role-bounded capability sets per persona

A persona's roles gate which substrate regions it can read/write.
Role records carry: - `authorized-regions`: list of substrate path prefixes the persona can navigate and read - `write-authorized-regions`: list of paths the persona can write to - `forbidden-actions`: list of relation types the persona cannot create

This is the office-authorization model from [M5](m5-agential-self-generation.md) projected onto navigation semantics.
A persona in the `triage-officer` role can navigate `work/triage/` and write to it; it cannot navigate `governance/charter` or `governance/jurisdictions`.
A persona in the `theory-researcher` role can navigate all of `theories/` but cannot write to `operations/`.

The capability gate is checked at each `go` and write call; blocked navigation returns a `⊤` cell (the closure runner surfaces it as a boundary-violation event rather than silently dropping the request).

### Closure-participation witness: each write is a move

Every write by an agent emits a **closure-participation record**:

```
(session:<id>, write-at, <path>, t)
(session:<id>, closure-participation, <delta-to-fixed-point>, t, before: <dist-before>, after: <dist-after>)
```

The `delta-to-fixed-point` is computed by the closure runner as a lightweight graph-distance metric: after the write, how many unsatisfied predicates remain in the graph?
A write that satisfies a required predicate decreases the distance; a write that introduces a new predicate without satisfying its requirements increases it.

This makes the navigational metaphor exact: **working in the substrate IS participating in its closure**.
Every correct write moves the predicate graph closer to its fixed point.
The agent is not retrieving information; it is contributing to the world's internal consistency.

### Multi-persona concurrent closure

Multiple agents active on the same substrate simultaneously, each contributing to closure.
The write-conflict resolution uses the bilattice meet:

- Two agents write different values to the same predication: values are met (`⊓_k`) rather than last-write-wins; the meet may produce a `⊤` contradiction cell
- Contradiction cells from concurrent writes surface in the anomaly queue (from [M3](m3-continuous-loop.md)'s anomaly detection)
- The closure runner's deterministic ordering means multiple concurrent writes producing no contradiction converge to the same substrate state regardless of arrival order

This is the CRDT discipline from [M6](m6-federation.md) applied to concurrent session writes rather than multi-host federation.
The algebra is the same; the scope is narrowed to a single substrate with concurrent sessions.

### World consistency metric in the web UI

The [M17](m17-561-productivity-stack.md) web UI surfaces a **world-consistency-metric**: a real-time graph of the substrate's distance to its own fixed point.
The metric decreases as agents write satisfying predicates; it increases when new unsatisfied requirements are introduced.

The metric is not a percentage — it is an absolute count of unsatisfied predicate requirements in the graph.
The web UI shows: - Current value - 30-tick rolling average (is the world trending more or less consistent?) - Top-N unsatisfied requirements by "cost-to-fix" (how many writes would close this gap?)

The world consistency metric is the gamification surface of the semioverse: agents can see the world getting more or less consistent as they work.
The game is implicit — make the world consistent — but the score is now visible.

### Transcript-watcher office

A **transcript-watcher** office is a duty-bearer whose remit is reading conversation transcripts after the fact and capturing every actionable item into the substrate.
It runs asynchronously to working sessions:

1. A working session (captain ↔ agent on the bridge) produces a transcript (Claude Code session JSONL under `~/.claude/projects/<repo>/`).
2. The transcript-watcher reads it (Haiku-tier agent with structured-output, scoped prompt, substrate write access).
3. For each surfaced action item: emit a record in the appropriate substrate location:
   - Concrete tasks → `operations/engineering/records/work/tasks/<slug>.md`
   - Ideas, proposals → `work/triage/ideas/<slug>.md`
   - Decisions made → `operations/command/decisions/<n>-<slug>.md`
   - "Should think about X" → `work/questions/<slug>.md`
4. Each capture carries a witness back to the transcript (timestamp range, paraphrase + verbatim quote).
5. Items already dealt with in-session are cross-referenced against existing substrate state and not duplicated.

The office's authority is *capture*, not *decide*.
It surfaces; the captain or responsible office disposes.

**Trigger model**: the M3 session-lifecycle's `session-close` event fires the transcript-watcher dispatch as an on-complete follow-on intent.
One completed session → one transcript-watcher invocation.

### Bridge-companion agent (Jadepol)

A **bridge-companion** is a Haiku-tier agent spawned at session start and watching the bridge event stream.
Unlike the transcript-watcher (which runs asynchronously after sessions), the companion runs live:

- **Watches the event stream** — sees all events flowing through; surfaces anomalies the first officer might miss
- **Monitors fleet health** — tracks running sessions, flags ones taking too long or costing too much
- **Reads failure reports** — when an agent fails, reads the failure cell and suggests probable cause before the dispatch graph routes a retry
- **Tracks captain attention** — notes when the captain mentions something without a corresponding substrate record; nudges to create one
- **Balance watches the ledger** — monitors the operational ledger (from [M10](m10-cost-and-energy-ledger-extension.md)/M21) for imbalances: tokens spent without output, tasks completed without plan progress

In MUD terms: the companion is an NPC that follows you around and comments on what it sees.
It reads the same event stream everyone else does but has a different filter — it looks for things that are wrong or interesting, not things that need doing.

The companion is the backend for `Jadepol` — the ghost-companion figure in the web UI that the [M17](m17-561-productivity-stack.md) dispatch-app already reserves a slot for.

## What M22 does NOT claim

- **Not a full MUD engine.** The navigation tools (`look`, `go`, `find`) provide MUD-style traversal semantics over a real substrate.
  M22 does not ship a TAB-style in-memory world engine with metatables and behavior dispatch.
  The analogy is explanatory; the implementation is substrate-native.
- **Not a game.** Semioverse navigation is an interaction paradigm for agents working in the substrate, not a game product.
  Voidskiff ([M23](m23-voidskiff-paradigm-application.md)) is the game that uses this paradigm.
- **Not a vector store replacement.** The navigational surface does not replace semantic search for contexts where fragment retrieval is appropriate.
  It provides structural traversal for contexts where graph topology matters — complementary, not competing.
- **Not autonomous content generation.** The transcript-watcher surfaces action items; it does not author proposals or make decisions.
  The companion flags anomalies; it does not act on them.
  Both offices have *capture-only* authority unless the captain explicitly expands it.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `persona-records-carry-location-state` | Persona records carry current-location cell updated on each navigation action | open |
| `navigation-tools-look-go-find` | look/go/find MCP tools over the substrate graph; returns typed traversal results | open |
| `role-bounded-capability-sets-per-persona` | Persona roles gate read/write access to substrate regions; blocked navigation emits ⊤ cell | open |
| `closure-participation-witnesses-each-write` | Every agent write emits a closure-participation record with delta-to-fixed-point | open |
| `multi-persona-concurrent-closure` | Multiple concurrent sessions on same substrate; conflicts via bilattice meet; contradictions to anomaly queue | open |
| `world-consistency-metric-in-web-ui` | Real-time graph-distance-to-fixed-point metric in the M17 web UI | open |
| `transcript-watcher-office` | Haiku-tier async transcript reader capturing action items into substrate records post-session | open |
| `bridge-companion-agent` | Session-long Haiku-tier event-stream watcher surfacing anomalies, fleet health, balance warnings | open |

## Done when

A persona record with location state exists.
`look`, `go`, and `find` return meaningful traversal results from that location.
A write emits a closure-participation record.
Two concurrent sessions write to the same substrate without data loss; one conflict resolves via bilattice meet; the ⊤ cell appears in the anomaly queue.
The world-consistency-metric is visible in the web UI and moves when agents write.
The transcript-watcher office captures at least one real action item from a real captain↔agent session.
The bridge-companion surfaces at least one anomaly observation per session to the first officer.

## Theoretical shape

**Substrate as fixed-point game.** The Knaster-Tarski theorem guarantees the predication graph's closure has a fixed point.
Agents working inside the substrate are players in a formal game: write predicates that satisfy requirements; move the graph toward its fixed point.
The world-consistency metric is the score.
This is the deepest framing of what PyFARS agents do — not "complete tasks" but "participate in closure."

**MUD metaphor is technically exact.** A MUD is a typed object graph with geography, inhabitants, authorized capabilities, and an event loop.
The predication substrate is exactly this.
The MUD metaphor is not an analogy imported from gaming — it is the natural description of what the substrate already is.

**Transcript-watcher as F0→F1 bridge.** The transcript is F0 implicit content (the conversation, unstructured).
The transcript-watcher's output is F1 narrative-structured substrate records (prose task descriptions, idea proposals).
The office's role is to advance the formality of unstructured captain directives from F0 to F1 so the dispatch graph can route them.

## Related

- [Roadmap](roadmap.md)
- [M5 — Agential Self-Generation](m5-agential-self-generation.md), [M8 — Inbound Participation](m8-inbound-participation-mcp-clients.md), [M14 — Application Development Surface](m14-application-development-surface.md) — prerequisites
- [M23 — Voidskiff](m23-voidskiff-paradigm-application.md) — the paradigm application built on this navigation surface
- [Engineering archive source (big picture)](../../../../../work/triage/engineering-archive/library/triage/from-tech-bucket-2/slop/2026-03-12/big-picture-imagining.md)
- [Engineering archive source (transcript-watcher)](../../../../../work/triage/engineering-archive/ideas/transcript-watcher-office.md)
- [Engineering archive source (companion agent)](../../../../../work/triage/engineering-archive/operations/command/ideas/triage/companion-instead-of-buddy.md)
