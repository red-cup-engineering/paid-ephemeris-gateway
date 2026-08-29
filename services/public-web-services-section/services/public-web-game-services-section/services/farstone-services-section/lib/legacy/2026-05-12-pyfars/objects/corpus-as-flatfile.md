---
type: definition
class: corpus-realization
status: draft
realizes: [corpus, record]
depends-on: [corpus, projection, record, resource]
---

# Corpus as flatfile

PyFARS's specific realization of the [corpus](../concepts/corpus.md): a directory tree of YAML-frontmatter Markdown files on a POSIX filesystem, with stable lower-kebab-case slug filenames, walkable by ordinary filesystem operations, indexed at runtime by a slug-to-path map.

The flatfile realization is the choice that defines PyFARS as a *flatfile* agentic resource system rather than (e.g.) a database-backed one.
Other realizations of FARS could choose different transports (SQLite-backed, S3-backed, IPFS-backed); PyFARS commits to flatfile.

## Data

A corpus-as-flatfile is a tuple

$$\mathrm{Corpus}_F \;=\; (\mathrm{Root},\; \mathrm{Tree},\; \mathrm{Notes},\; \mathrm{SlugIndex},\; \mathrm{Conventions})$$

where:

- $\mathrm{Root}$ is a filesystem path (the polity-root, e.g., `/home/emsenn/561` for the 561 deployment).
- $\mathrm{Tree}$ is the directory tree under $\mathrm{Root}$, walked recursively, with a configurable ignore-set (`.git`, `.venv`, `node_modules`, etc.).
- $\mathrm{Notes}$ is the set of `.md` files in $\mathrm{Tree}$, each carrying YAML frontmatter (delimited by `---` at top) and a Markdown body.
- $\mathrm{SlugIndex}$ is the (slug → path) map computed by walking $\mathrm{Tree}$ and reading each note's filename.
  Slugs are required to be unique within a single corpus.
- $\mathrm{Conventions}$ is the in-corpus convention specification: what frontmatter fields each `type:` carries, what relations are valid, what naming rules apply.
  Conventions live in the corpus itself (typically as `_index.md` files in directories).

## Notation

A note in a corpus-as-flatfile is denoted by its slug: `task-15`, `predication-cell`, `pyfars-as-polity-substrate`.
The path on disk is metadata about *where* the note lives (which directory) but not *what* the note is about (which is its slug).
The slug is the substrate identity.

A relation between notes is a frontmatter list: `depends-on: [predication-cell, projection]`.
Each entry is a slug.
The frontmatter list projects a system cell per entry.

## What this realization commits to

1. **Filesystem transparency** — the corpus is readable by `cat`, `grep`, `find`, `git`, etc. without PyFARS-the-package being involved.
  PyFARS adds tooling, but the corpus stands as a corpus on its own.
  An agent or a human can read and edit notes by ordinary file editing.
2. **Git-friendliness** — the corpus is meant to live in a Git repository.
  Slugs are stable so git tracks notes by path; relocations (`pyfars move`) use `git mv` to preserve history.
  Conflicts can be resolved with ordinary merge tooling.
3. **Frontmatter as the relation surface** — the predication-graph is derived from frontmatter relations alone.
  The body of a note is not parsed for relations; cross-references in body text are *navigation*, not load-bearing graph edges.
4. **Slug as substrate identity** — moving a note's path does not change its identity.
  Renaming its slug *does* change its identity, and is itself a system transition (witnessed via `rename-slug`).

## What this realization gives up vs. alternatives

A database-backed FARS realization would have: - Faster queries (indexed lookups vs. filesystem walk + grep). - Transactional integrity (no half-edited notes). - Concurrent-edit handling (DB-level locking).

PyFARS-as-flatfile gives up these in exchange for: - Filesystem transparency and offline-readability. - Git as the version-control story. - Simplicity — no server required to read the corpus. - Lossless interop with text-only tools.

These tradeoffs are *contingent*; a different polity could choose differently.
PyFARS commits to flatfile because the priority is human-readability and substrate-purity is enforced by witness discipline, not by database-level guarantees.

## Implementation pointers

- `pyfars.substrate` — the package module that loads and indexes a corpus-as-flatfile.
- `pyfars.api.workspace(root)` — returns the loaded `Substrate` object for a given root.
- `pyfars.convention` — the convention engine that validates frontmatter against in-corpus rules.

## Relation to upstream FARS theory

[Flatfile-agentic-resource-system theory](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/) specifies *what* a FARS commits to (flat data atoms, content-as-truth, agent-orchestration discipline).
PyFARS-as-flatfile is the specific realization: data atoms are markdown notes, the filesystem is the transport, frontmatter projects relations, etc. The relationship to upstream is conformance: the flatfile realization conforms to FARS's spec, and the proof of conformance routes through how each FARS commitment is satisfied by the flatfile choices.

## What this object does not specify

- The exact ignore-set (which paths PyFARS skips when walking the tree).
- The exact YAML frontmatter parser (currently Python's `yaml` library; alternatives — `ruamel.yaml`, custom — are admissible).
- The handling of binary files in the tree (PDFs in `references/sources/`, images, etc.).
  They live in the tree but are not parsed as notes.
