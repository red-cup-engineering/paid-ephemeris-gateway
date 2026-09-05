---
title: "How LPMud/Discworld informs FARS development"
specialization: research
subject: lpmud-discworld
subject-description: "LPMud driver + Discworld mudlib. The architecture that proved a MUD IS a general-purpose system: driver handles I/O and object lifecycle, mudlib provides all domain logic as in-world objects."
source-code: operations/engineering/src/discworld-mudlib/
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/lpmud-architecture-for-agentic-systems.md
date-created: 2026-04-07
informs: [system-architecture-refactor, relational-mud, help-system, operations-loop]

# What LPMud/Discworld is
architecture: "Driver/mudlib split. Driver (FluffOS) handles networking, object lifecycle, LPC compilation. Mudlib (Discworld) provides rooms, objects, NPCs, commands, guilds, help — all as LPC objects that the driver loads and executes. 900+ files in the mudlib."

# Principles extracted for FARS predication
principles:
  - id: driver-mudlib-split
    principle: "The driver knows nothing about the game. The mudlib knows nothing about networking. Clean separation."
    lpmud-source: "FluffOS driver vs Discworld lib/ — driver compiles LPC, mudlib IS LPC"
    fars-application: "FARS (the algebra) knows nothing about agents or harnesses. FOAH/MASH know nothing about the algebra. Clean separation: systems/fars vs systems/foah vs systems/mash."

  - id: help-is-not-separate
    principle: "Discworld has 200+ help files maintained separately from the things they describe. This is the wrong pattern."
    lpmud-source: "lib/doc/helpdir/ — 200+ nroff files that can go stale"
    fars-application: "Help IS message(). The entity's fiber IS the help. Don't maintain separate help files. If the fiber isn't legible as help, enrich the fiber."

  - id: guild-system-is-office-system
    principle: "Guilds define what a player can do: skills, abilities, advancement paths. Joining a guild = investiture."
    lpmud-source: "lib/std/guilds/ — guild objects with skill trees and advancement"
    fars-application: "Offices ARE guilds. Joining an office = investiture. Office capabilities = guild skills. Leveling up = formality progression F0→F3."

  - id: rooms-are-containers-with-exits
    principle: "A room has contents (objects, NPCs, players) and exits (named links to other rooms). Look reads contents. Go follows an exit."
    lpmud-source: "lib/std/room.c — inherits container, adds exits"
    fars-application: "Any entity with contents and predicate edges to other entities IS a room. look = message(entity). go = follow a predicate edge. The graph IS the map."

  - id: everything-inherits-from-object
    principle: "Discworld's object hierarchy: object → container → room, object → living → player/NPC. Standard API at every level."
    lpmud-source: "lib/std/ — object.c, container.c, room.c, living.c"
    fars-application: "Our ontology (thing → container → vessel, thing → object) is the same pattern. Standard predicates at every level. Don't invent per-type APIs."

  - id: commands-are-objects
    principle: "Commands are objects loaded at runtime. Adding a command = creating a file in the right directory. The command object handles parsing and execution."
    lpmud-source: "lib/cmds/ — player/, creator/, lord/ command directories"
    fars-application: "Commands are entities. Adding a command = creating a file with type: action. compose-prose interprets action entities. The entity IS the command."
---

How LPMud and Discworld — the architecture that proved MUDs are general-purpose systems — inform FARS development.
The driver/mudlib split maps directly to FARS/FOAH.
The guild system maps to offices.
Rooms map to containers with predicate exits.
The key anti-lesson: Discworld's separate help system is what NOT to do.

See the [LPMud architecture analysis](../../../../../library/theories/engineering/theories/tech/theories/computing/texts/lpmud-architecture-for-agentic-systems.md) for the full source reading.
See the [MUD as system architecture](../../../../../library/theories/engineering/theories/tech/theories/computing/theories/multi-user-dungeons/the-mud-as-system-architecture.md) for the general theory.
