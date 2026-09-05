---
type: concept
class: frame
depends-on: [flatfile, source-of-truth]
see-also: [system, polity, program, flatfile, frontmatter-as-presentation]
---

# Directory

The **filesystem frame** of a PyFARS instance: the bytes on disk, organized as a tree of files and subdirectories, with paths as addresses and file content as projected system cells.
The directory is the frame that views the [substrate](substrate.md) as **bytes** — what is materially on disk.
The directory is what is *durable*: the persistent surface that survives every program invocation.

A directory is one of four lenses through which the same [substrate](substrate.md) presents itself; the other three are [system](system.md), [polity](polity.md), and [program](program.md).
The directory frame is the *bytes* view; the system frame is the *data* view; the polity frame is the *information* view; the program frame is the *operations* view.
The four are not four separable things — they are four readings of one thing.

## What a directory IS

A directory, in the FARS sense, is *a chunk of filesystem chosen to hold the projection-image of a substrate*.
Its primitives:

- **A root path** — the filesystem position the PyFARS realization treats as the system's surface.
  The root is the address of the directory in the operating system's namespace.
- **A tree of files** — under the root, files (each one the projection of one or more system cells) and subdirectories (each one a sub-region of the system's path-derived predication).
- **A path-as-address convention** — the path of a file is its system-side address (per [flatfile](flatfile.md)).
  Two files at distinct paths are distinct entities even if their content is byte-identical.
- **Format-projected content** — each file's bytes are the create-image of system cells under some projector.
  Markdown frontmatter is one projector image; YAML is another; JSON is another; Python source is another.
  The realization's compound projector dispatches by file shape.

## What a directory is NOT

- A directory is not a [system](system.md).
  The directory is bytes; the system is the cell algebra those bytes project to.
  A directory exists on disk regardless of whether any program has loaded it into a system.
  A system exists in memory regardless of whether it has been projected back to a directory.
- A directory is not a [polity](polity.md).
  The directory contains the bytes that, when projected to cells and settled under agential closure rules, *yield* a polity.
  The directory is not itself agential.
- A directory is not a [program](program.md).
  The directory is persistent; programs come and go.
  The same directory can be loaded by many different programs over its lifetime.

## What makes a directory a FARS directory

A directory is a FARS directory when its files are *projection-image bytes* — when each file's content was emitted by some projector's create direction from cells, and is round-trippable through the projector's extract direction back to the same cells.
A directory whose files are arbitrary bytes (not projection images) is a directory in the operating-system sense but not in the FARS sense.

A PyFARS realization may carry the round-trip discipline strictly (every byte is projected) or loosely (some files are projected; others are off-substrate operational state).
The strict reading is the limit toward which the realization aims; the loose reading is what most realizations achieve in practice.
Off-system state under the directory root is diagnosable.

## What a directory contains

A conforming FARS directory carries, at minimum:

- A **root manifest** — a sentinel file at the root (by convention `_index.md`) carrying the FARS identification cells (the PyFARS realization's signature, the system's slug, the polity's charter pointer if the system is polity-shaped).
- **Subject files** — one file per entity the substrate contains, at the path that is the entity's address.
- **Subdirectory groupings** — directories whose path components are themselves system predicates (`governance/offices/<slug>.md` carries the path-derived predication `type: office`, `scope: governance`).

A PyFARS realization may add other conventional locations (a `.pyfars/` directory at the root for operational state — sockets, event-log files, harness manifests; an `examples/` subdirectory for substrate-as-example records; etc.).
These are realization conventions, not FARS-spec commitments.

## What is the directory's relationship to source-of-truth

Per [source-of-truth](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/concepts/source-of-truth.md), *the filesystem is authoritative*.
Any in-memory cache (the [system](system.md) loaded by a [program](program.md), a sqlite index of cells, a content-addressed projection) is reconstructed from the directory and SHALL agree with it.
When a [program](program.md) emits system operations, the operations land first as witnesses in the system and then are projected through to directory bytes; the directory has the final say on what the substrate is.
This realizes the engineering content of "a human edit is a substrate edit" — a text editor opening a file in the directory and writing new bytes IS a system operation, just one whose admission did not go through a program's reify primitive.

## Position among the four frames

The directory is the *first* frame in the forward direction:

```
directory  →  system  →  polity  →  program
```

The forward step from directory to [system](system.md) is *projection*: a [program](program.md) walks the directory, dispatches each file to its projector, and inserts the resulting cells into a fresh system.
This is what `kernel.
System(root)` currently does — though per the PyFARS commitment that loading is itself a program's responsibility, the kernel should not hold this code; a flatfile-program should.

The reverse step (system to directory) is *materialization*: cells in the system are projected back to bytes through projectors' create direction; the bytes are written to the directory's filesystem positions; the writes are witnessed; the directory now agrees with the system at the cells that were projected.

The directory is the frame the operating system sees and the frame humans engage through ordinary tools (text editors, `ls`, `grep`).
The other three frames live inside PyFARS realizations.
The directory is the boundary where FARS meets the rest of computing.
