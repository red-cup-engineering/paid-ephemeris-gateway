---
type: concept
class: self-contained-resource
status: draft
depends-on: [resource, entity, projection, corpus, predication-cell, markdown-as-projection]
---

# Record

A [resource](resource.md) of the *self-contained markdown with YAML frontmatter* discipline: a single file whose frontmatter declares its kind, slug, relations, and other structural facts, and whose body holds prose, definitions, narratives, or other authored content.
Realizes the corpus-as-flatfile's atomic unit: every markdown note in the corpus is a record.

Records are how PyFARS makes system state human-readable, theory-authorable, and editorially-curatable.
Per [`markdown-as-projection`](../claims/markdown-as-projection.md), a record's content is either a *projection* of the system truth (when its frontmatter projects from log-derived cells) or a *determination* (when its content is author-asserted theory).

## What a record contains

A record is a single markdown file with:

- **YAML frontmatter** (delimited by `---` at the top): structured metadata declaring the record's kind, type, status, relations to other entities, and other framing fields.
- **Body**: free-form markdown — prose, definitions, formulas, code, narrative writing.

The frontmatter projects system cells: the cell `(this-record, depends-on, other-record)` projects as a frontmatter line `depends-on: [other-record]`.
Reading frontmatter is reading substrate (per [governance-as-substrate](governance-as-substrate.md) and the captain's `(slug, key, value) = (s, p, o)` principle).
The body is content not directly cell-mapped; it carries narrative, proofs, definitions.

## Two roles a record plays

Per the [resource](resource.md) split, a record is either:

- **A projection** — the record's content is derived from system state.
  Updating the substrate (through log events) changes what the record *should* contain; re-rendering the record produces an updated artifact.
  Example: a polity-record projecting the polity's currently-recognized populace.
- **A determination** — the record's content is author-asserted; the record IS the source.
  Example: a `theory/concepts/` note authoring a concept; the concept's existence is *because* the record was authored, not because logs produced it.

The two roles are distinguished by the record's *kind*:

- Operational records (tasks, witnesses-as-summary, polity-state, ship-state, etc.) are typically projections.
- Theoretical records (concepts, objects, morphisms, claims, questions, narratives) are typically determinations.
- Governance records (offices, duties, powers, decisions, charter, conventions) are typically determinations — the captain or steward authors them; they're not derived from logs.

A single record may carry both roles in different fields.
A polity's record might have author-determined description (determination) plus log-derived populace count (projection).

## What a record commits to

1. **Slug-as-identity**.
  A record is identified by its filename's slug (lower-kebab-case).
  The filesystem path is metadata about *where* the record lives; the slug is *what* it is.
2. **Frontmatter is substrate**.
  Reading frontmatter reads cells.
  Editing frontmatter (by hand or by verb) modifies cells.
  The relationship is direct.
3. **Body is content**.
  The body is human-readable text.
  Cells about the body's content (e.g., `body-summary:`) are themselves frontmatter.
4. **Single-entity-per-record**.
  One record talks about one primary entity (its slug).
  Cells about other entities live in the appropriate other records.

## What records do not do

- Records do not store transient state.
  Live counters, timestamps that change rapidly, in-flight operation state — these belong in logs (events) or in derived computation, not in records.
- Records do not replace logs.
  A record can summarize log content (a witnessed daily-roll, an audit summary), but the canonical substrate truth is in the logs.
  Records are the human-readable surface; logs are the canonical state.
- Records do not enforce uniqueness across the corpus by content.
  Two records with similar bodies are fine; uniqueness is by slug.

## Distinguishing from related concepts

- **Record vs. log**.
  Logs are append-only event sequences; records are self-contained authored or projected content.
- **Record vs. note**.
  Note is the casual term for a record.
  The two are interchangeable in practice; "record" is the formal term in this taxonomy.
- **Record vs. resource**.
  Record is one resource subtype; resource is the parent concept covering both records and logs.
- **Record vs. corpus**.
  A corpus is the *tree* of records; a record is one file in that tree.

## What this concept does not yet specify

- The complete kind taxonomy of records.
  The realization adds kinds as needed; standardization across the polity's vocabulary is partly settled.
- The handling of records that drift from the system (manual edits without corresponding log events).
  Per substrate-purity, such drift is a finding to surface, not new truth — but the discipline for surfacing and reconciling is partly conventional.
- The migration of cells currently in record frontmatter that should live in logs.
  A polity's transition from "everything-in-records" to "log + record split" is substantial.
