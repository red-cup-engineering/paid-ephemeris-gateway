---
type: concept
class: frame
depends-on: [predication-graph-store, four-bilattice, closure-rule, witness]
see-also: [directory, polity, program, flatfile, scope-as-fiber]
---

# System

The **computational frame** of a PyFARS instance: the predication cells, the bilattice values those cells carry, the closure rules acting on them, the witness chain recording their changes, and the projectors translating between cells and bytes.
The system is the frame that views the [substrate](substrate.md) as **data** — structured cells with values, subject to closure.

A system is one of four lenses through which the same [substrate](substrate.md) presents itself; the other three are [directory](directory.md), [polity](polity.md), and [program](program.md).
Each frame is a different view of the same substrate.
The four frames are not four separable things — they are four readings of one thing.

## What a system IS

A system is *the substrate-algebra in action* over a particular set of cells.
Its primitives:

- **Predication cells** — `(subject, predicate, object) → value`, with the value in the four-bilattice $\{\bot, \mathbf{t}, \mathbf{f}, \top\}$.
  The cells are the system's content.
- **Closure rules** — themselves system-resident entities, queryable as cells, applied to fixed point.
  The rules are how the system computes.
- **Witness chain** — the append-only sequence of operator invocations, each content-addressed, replayable.
  The chain is how the system remembers.
- **Projectors** — adjoint pairs `(extract, create)` between bytes and cells, satisfying the counit law `extract(create(cells)) ≈ cells`.
  The projectors are how the system reads and writes.
- **Operators** — insertion, retraction, traversal, relocation, edit.
  The operators are how the system changes itself.

What makes a chunk of state a *system* and not merely a bag of cells is that the cells are *under closure*.
Settling a system to quiescence is its characteristic operation; the closure operator is what the system "does."

## What a system is NOT

- A system is not a [directory](directory.md).
  The directory is the bytes on disk; the system is the cell space that the directory's bytes project to (and from).
  A system can be loaded from many possible directory layouts; a directory can project to many possible systems depending on which projectors and closure rules act on it.
- A system is not a [polity](polity.md).
  A polity is what a system *becomes* when its cells include agents, offices, dispatch records, and the closure rules that make those cells enact agential operations.
  A system without those cells is still a system; it is just not a polity.
- A system is not a [program](program.md).
  A program is one process running; a system persists across program lifetimes — it is, in the substrate sense, eternal until its cells are retracted.

## What identifies one system from another

Two systems are the same when their cell content is the same — per [identity-by-relations](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/concepts/identity-by-relations.md), an entity is identified by which relations it participates in, and the system as a whole is identified by which cells it carries.
Adding cells or revising values produces a new system in the substrate sense; the witness chain records the trajectory between successive systems.

## Position among the four frames

A PyFARS instance is alive when material passes between the frames; it is at rest when settled at one.
The forward direction (read):

```
directory  →  system  →  polity  →  program
```

The reverse direction (write):

```
program  →  polity  →  system  →  directory
```

The system is the *second* frame in either direction.
The kernel exposes the system: code that operates at the kernel layer engages cells, rules, witnesses, projectors — and nothing above.
Walking a [directory](directory.md) into a system is a [program](program.md)'s responsibility (a program that uses projectors to read bytes from disk and insert cells).
Enacting the system's agential cells as a [polity](polity.md) is *also* a program's responsibility (a program that ticks closure rules and dispatches assignments).

## Position relative to predication-substrate theory

A PyFARS system is one realization of a [predication-graph store](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/objects/predication-graph-store.md) at the flatfile substrate (per [flatfile](flatfile.md)).
The system frame is the computational view of that realization: what it does, not where it lives.
The [directory](directory.md) frame is the storage view; the system frame is the algebraic view.

Per [agential-self-generation](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/concepts/agential-self-generation.md), the system's closure rules, projectors, and operator catalog are themselves system-resident — the system describes itself in its own cells.
This is what makes [polity](polity.md) emergence possible: the agential commitments that turn a system into a polity are themselves cells inside the system.
