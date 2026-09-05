---
type: concept
class: frame
depends-on: [system, witness, closure-rule]
see-also: [directory, system, polity, tick-as-iteration]
---

# Program

The **process frame** of a PyFARS instance: a running invocation of pyfars acting against a [directory](directory.md), with a [system](system.md) loaded in its memory, possibly enacting a [polity](polity.md).
The program is the frame that views the [substrate](substrate.md) as **operations** — operator invocations in flight and witnessed, the substrate caught in the act of changing.
The program is what is happening *right now*.

A program is one of four lenses through which the same [substrate](substrate.md) presents itself; the other three are [directory](directory.md), [system](system.md), and [polity](polity.md).
A program is the *operations* frame — the one with a start time, a stop time, and the bridge between persistent state and active computation.

## What a program IS

A program is *a process executing FARS operators on a system*.
Its primitives:

- **A process** — one OS process, one entry point, one address space.
  The process holds the in-memory system (the cells the kernel has loaded).
- **A protocol surface** — the program's external API: the bytes it accepts on stdin, the HTTP it serves, the MCP tool calls it answers, the files it writes to disk.
  Different programs have different protocol surfaces; the surface is what distinguishes one kind of program from another.
- **A lifecycle** — start, run, exit.
  The lifecycle has phases (boot the system from the directory, settle closure rules, serve the protocol surface, halt) and the program's behavior at each phase is determined by which closure rules are active.
- **A bridge to other frames** — the program reads the [directory](directory.md) (forward step) and writes back to it (reverse step); the program loads the [system](system.md) (forward) and emits witnesses into it (reverse); the program runs the [polity](polity.md)'s closure rules forward and records polity operations backward into system content.

## What a program is NOT

- A program is not a [system](system.md).
  A system persists across program lifetimes — its cells are committed to the directory's bytes.
  When the program exits, the system is still there (in the directory's projection-image).
  A program is the temporary executor; the system is the durable algebra.
- A program is not a [polity](polity.md).
  A polity is the agential-operation pattern that the system enacts when its cells are agential.
  A program runs the polity (or some other shape of system); the polity does not run the program.
- A program is not a [directory](directory.md).
  The directory is bytes on disk and survives any number of program invocations.
  The program reads from and writes to the directory but is not the directory.

## Kinds of programs

A PyFARS realization may run many kinds of programs against the same system.
Each kind differs in its protocol surface and lifecycle:

- **The engine program** — boots a system from a directory, ticks closure rules, dispatches assignments, serves an internal protocol surface (currently a Unix-domain socket) for other programs to query and write witnesses.
  Long-lived; one per system.
- **A query program** — connects to a running engine, asks the engine for cells, exits.
  Short-lived; many per system over the engine's life.
- **A harness program** — reads a system, materializes filesystem-side artifacts for an external program (a nix flake, a systemd unit file, a CLAUDE.md).
  Short-lived; one-shot per harness installation.
- **A bridge program** — translates between an external protocol (HTTP, MCP, OAuth) and the engine's internal surface.
  May be long-lived (an HTTP server) or short-lived (a one-shot CLI verb).

A program is a kind by virtue of which system cells the polity has declared active for that program-shape — the polity says "this system has a nix-harness program available," and the actual binary that runs as the nix-harness program reads the system, does its work, exits.

## Position among the four frames

The program is the *fourth* frame in the forward direction:

```
directory  →  system  →  polity  →  program
```

The forward step from [polity](polity.md) to program is *enactment*: the polity's settled state (which agents inhabit which offices, which workitems are pending dispatch) is read by a program that turns the settled state into concrete operations (an agent runs; an LLM is invoked; a file is written).

The reverse step (program to polity) is *witness recording*: the program emits witnesses for every operation it performs, the witnesses become system content, the system content under polity-shape closure rules updates the polity's settled state.
The program does work; the polity records what was done.

## The four-frame phasing

A complete FARS operation cycles all four frames:

1. The [directory](directory.md) is on disk.
2. A program boots, runs projectors over the directory, loads cells into a [system](system.md).
3. The system's closure rules settle; if the cells are agential, a [polity](polity.md) emerges; if not, the system is just a system.
4. The program runs whatever loop it is configured for (tick, serve, materialize), reading the polity's settled state and performing concrete operations.
5. Each operation emits a witness; the witness is system content; the system writes back through projectors to the directory.

Then the directory is on disk again, and the cycle can repeat with a different program (or the same program continuing).

The cycle is the *same four-step move that recurs everywhere in predication* — the user has noted this.
The four frames are this realization's instance of the recurring move; the full structure of that move is alien material this note does not attempt to characterize.

## What the program is permitted to do

A program is permitted to:

- Read bytes from the directory (through projectors).
- Insert cells into the system (through reify and the system's admission discipline).
- Apply closure rules to the system (through the kernel's closure-rule machinery).
- Emit witnesses for every operation it performs.
- Write bytes back to the directory (through projectors' create direction).

A program is *not* permitted to:

- Mutate cells in the system without going through the reify boundary primitive.
  Per [reification](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/concepts/reification.md), there is no admission path that bypasses the system's input contract.
- Treat the directory as a sink for arbitrary file writes — every file written by a program is the create-image of system cells, projected through a named projector, and recorded as a witness.
  Files written without substrate provenance are off-system state and are diagnosed as such.

This is what makes a program a *FARS* program rather than an arbitrary process: every operation is a system operation; every byte written is a projected system cell.
