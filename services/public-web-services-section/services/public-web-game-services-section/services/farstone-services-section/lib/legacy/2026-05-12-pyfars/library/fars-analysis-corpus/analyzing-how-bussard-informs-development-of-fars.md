---
title: "Analyzing how Bussard informs development of FARS"
specialization: analysis
subject: bussard
subject-description: "A multiplayer spaceflight programmable world by technomancy (Phil Hagelberg). Fennel/Lua on LOVE2D. 'Emacs in space.'"
date-created: 2026-04-07
source-code: operations/engineering/src/bussard/
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/programmable-interface-architectures.md
informs: [system-architecture-refactor, relational-mud, mash-tui]
sources-read:
  - operations/engineering/src/bussard/readme.md
  - operations/engineering/src/bussard/manual.md
  - operations/engineering/src/bussard/server.fnl
  - operations/engineering/src/bussard/client/init.fnl
  - operations/engineering/src/bussard/client/fs.fnl
  - operations/engineering/src/bussard/client/remote.fnl
  - operations/engineering/src/bussard/client/disk/init.fnl
  - operations/engineering/src/bussard/client/disk/flight.fnl
  - operations/engineering/src/bussard/client/disk/ssh.fnl
  - operations/engineering/src/bussard/client/disk/repl.fnl
  - operations/engineering/src/bussard/os/orb/Readme.md
  - operations/engineering/src/bussard/os/orb/session.lua
  - operations/engineering/src/bussard/os/orb/sandbox.lua
  - operations/engineering/src/bussard/os/orb/shell.lua
  - operations/engineering/src/bussard/os/orb/fs.lua
---

## What Bussard Is

Bussard (by technomancy/Phil Hagelberg) is a multiplayer spaceflight programming game built in Fennel/Lua on LOVE2D.
"Emacs in space."
The player pilots a spacecraft, logs into port computers over SSH, and programs their own ship's onboard computer — a full Emacs-like environment with editor, REPL, filesystem, modes.

## The Architecture: Three Layers

| Layer | Bussard | 561 equivalent |
|---|---|---|
| **Ship** (user-owned) | Polywell editor + Fennel REPL + filesystem + modes | Office environment: action domain, REPL into message(), modes |
| **Station** (shared, sandboxed) | Orb OS per planet, separate thread, restricted sandbox | Department: shared resources, sandboxed by office authorization |
| **Space** (the world) | Star systems with bodies and orbits | The knowledge graph: entities connected by predicate edges |

### The ship computer

`client/init.fnl` sets up the sandbox — a Lua environment (`env`) with carefully selected globals.
`safe-globals` lists exactly what's available: `assert`, `error`, `pcall`, `math`, `string`, `table`, `coroutine`.
On top: `ship` (status + actions), `bodies` (the world), `fs` (the filesystem), `editor` (polywell).
The user can reprogram their ship because configuration is files on the ship's filesystem loaded through `env.require`.

The sandbox IS the boundary.
Not a permission list checked at runtime — the table of available functions IS what exists.
If `love.filesystem` isn't in the table, it doesn't exist for the ship computer.

### Modes

Everything the player interacts with is a buffer in polywell:

| Mode | What it shows | How it works |
|---|---|---|
| `flight` | 2D space view, HUD | Buffer with `:no-text true` and custom `:draw`, keyboard bound to ship.actions |
| `repl` | Fennel REPL | Buffer running `fennel.repl` as coroutine; input → evaluator |
| `edit` | Text editor | Polywell editor; files on `client/disk/` |
| `ssh` | Terminal on station | Buffer whose input goes through channel to separate OS thread |
| `help` | Documentation | Buffer rendering markdown |

All modes share keybinding infrastructure.
Modes inherit from parents: SSH's parent is REPL, REPL's parent is console, console's parent is base.
Each child gets parent keybindings plus its own.
`ctrl-o` (open file) works everywhere because it's on base.

A mode is a table: `{:name "flight", :parent "base", :map {"[" focus-prev, "]" focus-next}, :props {:draw draw.flight, :update fn, :no-text true}}`.
No class hierarchy.
Just data.

### Two computers, two sandboxes

**Ship computer** (`client/`): permissive sandbox.
The player owns their ship.
Can redefine keybindings, write new modes, automate piloting via `ship.updaters`.
Access to ship status, actions, HUD, filesystem, editor.

**Station computers** (`os/orb/`): restrictive sandbox.
Each runs in a separate LOVE thread, completely isolated.
Orb is a faux-Unix with users, passwords, groups, PATH, executables.
`sandbox.lua` wraps file operations with `if_readable(env.
USER, ...)
` / `if_writeable(env.
USER, ...)
`.
Prevents access to `getmetatable` (which would leak the real Lua environment).

Communication between ship and station: `love.thread.newChannel()` — typed message queues.
SSH sends `{op: "stdin", stdin: input}`, receives `{op: "stdout", out: output}`.
RPCs send message + wait on response channel.

### The tick

Server update (`server.fnl`): `grav.update` + `orbit.update` + `autopilot.update` + `update-players`.
One pass through all entities.
No scheduling framework.
Client update: send ship state, receive positions, yield.
Dead simple.

### Programmability

The player can write code that runs on their ship.
Custom autopilot, automated trading, new HUD instruments, new modes.
Configuration lives in `src.config` on the ship filesystem.
Edit from inside the game, `ctrl-r` to reload, interface changes immediately.
"Every action you can take is just a Lua function call."

## Principles for FARS Predication

### 1. Scope is entity references, not prose

Bussard: the sandbox `env` table contains exactly what's available.
Nothing else exists.

**FARS application:** An office's reads/writes should be entity reference lists — `reads: [status, depends-on, assigned-to]` — not prose descriptions like `action-domain: "Work management — plans, tasks..."
`.
The list IS the sandbox.

### 2. Modes inherit additively

Bussard: SSH inherits REPL inherits console inherits base.
Each adds keybindings.

**FARS application:** When an entity extends another, capability predicates accumulate.
Don't restate parent constraints on children — they inherit through the chain.

### 3. Everything is a value

Bussard: a ship is `{:x :y :heading :mass}`.
A mode is `{:name :parent :map :props}`.
No classes.

**FARS application:** Predicates ARE the entity.
The `type:` predicate is a label, not a mechanism.
An entity IS its frontmatter.

### 4. Communication names its conduit

Bussard: ship-server via socket events.
Ship-station via `love.thread.newChannel()`.
SSH via stdin/stdout channels.
Each message type is named.

**FARS application:** Messages should carry a `channel` field.
Events should name their conduit.
Office-to-office communication should reference named channels.

### 5. The tick is simple iteration

Bussard: iterate bodies, update each, send positions.
One pass.

**FARS application:** The department tick walks contents, checks assigned work, messages.
Don't build a workflow engine — iterate and settle.

### 6. Station boundaries are scope restrictions, not separate systems

Bussard: each station is a thread with a sandbox.
The sandbox wraps IO with permission checks.
The station doesn't know it's isolated — it just can't access what's not in its table.

**FARS application:** Department boundaries are scope restrictions on `respond()`.
Not separate databases or processes — same graph, different read/write access.

## 561 TUI Design Implications

### Three layers, not two

The earlier TUI analysis had system → boundary → renderer.
Bussard shows three layers: ship (user-owned computer), station (shared sandboxed), space (the world).
For us:

- **Ship** = the user's computing environment (personnel directory, REPL into message(), editor, modes)
- **Station** = department resources (knowledge graph, operational records, agent fleet), sandboxed
- **Space** = the navigable graph (library domains, operational areas, other users)

### The ship IS a programmable environment

When cassia runs `561 --as cassia`, she gets: her filesystem (`operations/science/personnel/cassia-lorne/`), her REPL (access to `message()` filtered by boundary), her modes (reading mode, library mode, publish mode), her connection to stations (sandboxed access to operations, engineering).

### Modes are entities

Each mode is a FARS entity: `type: mode, parent: base-mode, available-actions: [...], sandbox-scope: [...]
`.
The Rust TUI reads mode entities and configures widgets.
Mode switching = navigating between mode entities.

### The filesystem IS the graph scoped by boundary

Cassia's `ls /` returns entities she can see, grouped spatially.
`ls` is `message(directory-entity)`.
`cat` is `message(file-entity)`.
`cd` changes the location predicate.
No virtual filesystem — the graph IS the filesystem.

### Multi-user is separate environments connected to shared resources

Not filtered views of one system — multiple ships (user environments) connected to shared stations (department resources).
Each user's environment is theirs.
The system is what they connect to.

## Answered Questions

### Scripting language RES (Relation Expression Syntax) — S-expressions evaluating against fibers.
Long-term: Guile Scheme as composition layer.
Near-term: Node.js calling `message()`.

### Mode system mapping Modes are entities with keybindings and sandbox scope, composed through parent chains.
Polywell-equivalent but declared in YAML.

### Filesystem The knowledge graph scoped by the boundary.
Personnel directory = home.
Library = shared read.
Department = sandboxed access.

### Station composition Via interfacer pattern — `respond(boundary, {action: connect, station: engineering})` augments the sandbox.

### Persistence On disk — personnel files, config, drafts, REPL history.
Session state saved/restored via session-save infrastructure.

## See also

- [Programmable interface architectures](../../../../../library/theories/engineering/theories/tech/theories/computing/texts/programmable-interface-architectures.md) — library grounding
- [TUI boundary analysis](./tui-boundary-surface-analysis.md) — the earlier analysis this corrects
- [Design principles from TAB/Bussard](./operations-department-as-tab-dimension.md) — cross-cutting principles
