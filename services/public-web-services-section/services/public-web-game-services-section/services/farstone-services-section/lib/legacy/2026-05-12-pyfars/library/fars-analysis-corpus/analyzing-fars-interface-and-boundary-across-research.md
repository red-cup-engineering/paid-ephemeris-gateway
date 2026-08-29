---
title: "Analyzing FARS interface and boundary across research"
specialization: analysis
feature: interface-and-boundary
description: "How users and agents connect to the system — the boundary as fiber composition, transport independence, Hohfeldian authorization, modes, TUI/CLI/web/MCP as renderers of the same boundary. Collected from all software research."
date-created: 2026-04-07
informs: [system-architecture-refactor, relational-mud, mash-tui, user-boundary-system]
software-sources:
  - analyzing-how-bussard-informs-development-of-fars
  - analyzing-how-tab-informs-development-of-fars
  - analyzing-how-lpmud-discworld-informs-development-of-fars
  - analyzing-how-cline-informs-development-of-fars
  - analyzing-how-openclaw-informs-development-of-fars
  - analyzing-how-openhands-informs-development-of-fars
---

How should users and agents connect to the system?
What IS the interface?

## The reframing

The TUI is not "an app that shows data."
The TUI is a rendering of a boundary.
When someone runs `561 --as cassia`, they establish a boundary relation.
The fibers of that boundary determine everything: what they see, what commands are available, which channels they hear, what entities they can touch.

The boundary IS a fiber composition.
`respond(cassia-lorne, {action: connect})` returns a composed boundary — the system settles what cassia can see by composing her office fiber, her personnel fiber, and the current room fiber.

## What each software teaches

**Bussard:** Three layers — ship (user-owned programmable environment), station (shared sandboxed), space (the world).
The ship IS a full computer the user can program.
Modes inherit additively.
The sandbox IS a table of what exists.

**LPMud:** Guild determines base abilities.
Character sheet gives individual ones.
Both compose.
Login creates a player object that is placed in a room.
What you can do = guild powers + character abilities.
Room determines what you see.

**Cline:** Plan Mode removes write tools entirely.
The mode constrains tool availability.
Not advisory — the tools literally don't exist in that mode.

**OpenClaw:** Multi-channel (WhatsApp, Matrix, etc.) through channel adapters.
Each translates external format to internal.
Same agent, different transports.

**OpenHands:** Per-session Docker isolation.
Authentication at session start.
Own filesystem per session.

**TAB:** The engine is just another thing.
Behaviors dispatch through the entity, not through the interface layer.

## The consensus principles

### 1.
The boundary is transport-independent TUI, CLI, web, MCP, SSH — all are renderings of the same boundary.
The boundary composes the fibers; the transport renders them.
Build the boundary model, not the TUI.

### 2.
Authorization is Hohfeldian positions on the boundary entity For a read-only guest: power to `look` and `help`.
No duties.
Privilege to browse public domains.
Immunity from identification requirements.

For cassia-as-diviner: power to read library and publish readings.
Duty to attribute sources.
Privilege to choose interpretive focus.
Immunity from engineering work.

These positions live on the office (guild defaults) AND the personnel entity (individual overrides).
Both compose — same as LPMud guild + character.

### 3.
The boundary is live, not static If cassia gains a privilege mid-session, her boundary updates.
In MUDs, gaining a guild rank immediately updates available commands.
The boundary is requeried on events, not loaded once at session start.

### 4.
Location is a predicate on the boundary The boundary has a `location` predicate — the entity being looked at.
`go` changes location.
`look` reads the fiber at the current location.
Multi-user = multiple boundaries with different location predicates, each seeing their own composed view.

### 5.
Modes constrain the boundary further Within a boundary, modes restrict what's available (Cline's Plan/Act, Bussard's flight/repl/ssh).
A mode is a further restriction on the boundary — a subset of the office's full capabilities activated for a specific context.

## Open design questions (from TUI analysis)

1. Is boundary composition a FARS message?
  Does `respond(person, {action: connect})` return the composed boundary?
2. Do Hohfeldian positions compose algebraically?
  Can office + personnel = effective boundary via ⊙?
3. Should the boundary change during a session, or only at session start?
4. Is "room" the right spatial metaphor when most content is private by default?
5. Does the boundary model generalize to both human and agent connections?

## See also

- [Bussard analysis](./analyzing-how-bussard-informs-development-of-fars.md) — three-layer architecture detail
- [User boundary system plan](../plans/user-boundary-system.md) — the implementation plan
- [Agent session interfacer plan](../plans/agent-session-interfacer.md) — the agent-side equivalent
