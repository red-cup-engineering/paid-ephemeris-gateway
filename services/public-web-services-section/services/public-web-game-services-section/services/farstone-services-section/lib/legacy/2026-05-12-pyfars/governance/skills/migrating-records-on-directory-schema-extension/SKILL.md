---
name: "Migrating records on directory schema extension"
description: "Migrates existing records from an old substrate location to a new one when the directory schema is extended (e.g., when boundaries/ or endpoints/ are added per M7), preserving record content while updating cross-references. Use when [`governance/specifications/directories.md`](../specifications/directories.md) declares a new directory and existing records under an old location are eligible to move."
---


## Requirements

- The directory schema extension is documented in [`governance/specifications/directories.md`](../specifications/directories.md) with a clear scope (which records move, which stay).
- The old location's records are enumerable; their cross-references can be grep'd for migration impact.
- The captain has confirmed the schema extension; per memory feedback "561 — present plans supersede past ad-hoc", an extension proposed in conversation supersedes records using older framing.

## Steps

1. **Read the schema extension** at [`governance/specifications/directories.md`](../specifications/directories.md).
  Capture the new directory name, its theory grounding, and the rule that distinguishes records that migrate from records that stay.

2. **Enumerate candidate records.** For each candidate, verify it falls under the migration scope.
  Don't migrate ambiguous records — author a question record per [`work/questions/`](../../work/questions/) for the captain to resolve.

3. **Per CLAUDE.md "Read each file before moving it out of `triage/`"**, read each migrating record before moving.
  Bulk-moves without reading have repeatedly produced disasters; the same discipline applies to schema migration.

4. **For each record being migrated:**
   - Determine the new path per the schema specification
   - Move the file (preserving content; do not rewrite during the move)
   - Update the file's frontmatter `slug:` cell only if the slug must change (avoid changing slugs unnecessarily — slug changes break every cross-reference)
   - Note any cells that need updating because their semantics changed under the new directory's schema

5. **Update cross-references.** Grep the substrate for references to the old path:
   ```
   grep -r 'old/path/<slug>' work/ governance/ concepts/
   ```
For each match, update the markdown link or frontmatter slug-reference to point to the new path.
Per [`link-to-records-not-shortcodes`](../duties/link-to-records-not-shortcodes.md), markdown links must continue to resolve.

6. **Run [`pyfars validate`](../../README.md)** on the migrated records and on records that referenced them.
  Flag any validation diagnostics introduced by the migration; fix them before the migration is considered complete.

7. **Author a finding** per [`authoring-a-finding-record`](authoring-a-finding-record.md) summarizing: which records migrated, which references updated, which validation diagnostics appeared and were resolved, what remains.

8. **Per "561 — no legacy shims"**: do not preserve records at the old location as legacy shims.
  The migration is full; deleted-from-old, lives-at-new.
  Records pointing to old paths that didn't get updated produce broken links — that's a substrate-violation finding to be resolved by step 5, not papered over.

## Outcomes

Records migrated to the new schema location.
All cross-references updated.
Validation diagnostics resolved.
A finding witnesses the migration.
The substrate's directory schema and the actual record locations match.

## Discipline notes

- **Migration is not refactor.** The migrated record's content stays; only its location changes.
  If during migration a record's content needs updating to match the new schema, that's a *separate* task — file it as a follow-up, don't bundle.
- **Don't migrate from `triage/` to `triage/`.** Per CLAUDE.md, `triage/` segments must be preserved unless a record is being lifted out of triage entirely.
  A schema extension that moves records *within* triage paths must keep the `triage/` segment.
- **Cycle-detect before moving.** If record A in old-location-X references record B in old-location-Y, and the migration moves both, ensure the references resolve under the new locations.
  A cycle of references to old paths after migration indicates the grep step missed something; re-run.
- **Per [`maintain-roadmap-enrichment-discipline`](../duties/maintain-roadmap-enrichment-discipline.md)**, a schema extension that introduces a new record-type may also require new specialized authoring skills (per [`authoring-a-boundary-record`](authoring-a-boundary-record.md), [`authoring-an-llm-endpoint-record`](authoring-an-llm-endpoint-record.md), etc.).
  Author those skills as part of the schema extension's cascade-completion.
