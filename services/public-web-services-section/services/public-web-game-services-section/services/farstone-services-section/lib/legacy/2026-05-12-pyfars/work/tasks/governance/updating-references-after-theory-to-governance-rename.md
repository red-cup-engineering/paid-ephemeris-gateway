---
title: "Update references after theory/ → governance/ rename"
type: task
kind: link-update
area: governance
status: open
subject: "tools/platform/pyfars/governance/ (formerly tools/platform/pyfars/theory/)"
---


Forwarding-task per the [polity migration convention](../../../../../governance/conventions.md#migration-convention-forwarding-task-pattern).
The pyfars `theory/` directory has been renamed in full to `governance/` to match the canonical schema in [`specifications/directories.md`](../../../governance/specifications/directories.md).
Inbound references to the old paths still resolve to nothing; this task tracks the work of rewriting them.

## What moved

| Old path | New path |
|---|---|
| `tools/platform/pyfars/theory/` | `tools/platform/pyfars/governance/` |
| `theory/_index.md` | `governance/_index.md` (merged content) |
| `theory/charter.md` | `governance/charter.md` |
| `theory/conventions.md` | `governance/conventions.md` |
| `theory/enterprise.md` | `governance/enterprise.md` |
| `theory/decisions/` | `governance/decisions/` |
| `theory/duties/` | `governance/duties/` |
| `theory/offices/` | `governance/offices/` |
| `theory/powers/` | `governance/powers/` |
| `theory/skills/` | `governance/skills/` |
| `theory/ideas/` | `governance/ideas/` |
| `theory/questions/` | `governance/questions/` |

The `<old>/<file>.md` to `<new>/<file>.md` mapping is one-to-one; nothing was renamed beyond the parent directory.

## Instructions

For an agent picking up this task:

1. **Find inbound references.** Search the full lineage for the string `theory/` where it could refer to the old pyfars `theory/` location:

    ```
    rg -nF 'pyfars/theory/' .
    rg -nF '/theory/charter' .
    rg -nF '/theory/conventions' .
    rg -nF '/theory/enterprise' .
    rg -nF '/theory/decisions/' .
    rg -nF '/theory/duties/' .
    rg -nF '/theory/offices/' .
    rg -nF '/theory/powers/' .
    rg -nF '/theory/skills/' .
    rg -nF '/theory/ideas/' .
    rg -nF '/theory/questions/' .
    ```

Be careful: the polity also has `theories/` (plural, math-side knowledge corpus).
Don't rewrite `theories/.../predication-categories/` references; those are correct.

2. **Filter out matches that aren't actually inbound to the renamed directory.** Match by parent path: only references that mean "PyFARS's own theory/ subdirectory" should be rewritten.

3. **Rewrite each match.** Substitute `theory/` → `governance/` in the matched references.
  Preserve file-relative links (`../theory/foo.md` → `../governance/foo.md`); preserve full paths (`tools/platform/pyfars/theory/foo.md` → `tools/platform/pyfars/governance/foo.md`).

4. **Watch for body content beyond markdown links.** Office records describe their write-jurisdiction with strings like `theory/offices/` or `does NOT write to theory/`.
  Those strings need updating too.

5. **Validate.** Run `pyfars validate` (when available) or grep for any remaining `pyfars/theory/` references and confirm none remain.

6. **Break this task into subtasks if the volume is high.** A future agent may find ~50 references and prefer to chunk by reference-source-directory; that's fine.

## Scope

Inbound references can live in:

- pyfars itself: in office records, duty records, power records, skill records, decision records, in the README, in src/ comments, in test fixtures.
- The wider 561 polity: `CLAUDE.md`, `AGENTS.md`, `README.md` (root), records under `operations/` (during their own routing migration), records under `theories/` (mathematical theory references back into the substrate), records under other tools (e.g., `tools/math/pypredcalc/`).
- harness manifests in `.pyfars/harness-manifests/` if any reference theory/ paths (these are gitignored and regenerate, but worth a sanity-check).

## Outcomes

When this task closes:

- `rg -nF 'pyfars/theory/' .
  ` returns no live references.
- `pyfars validate` (if walker exists by then) flags no broken governance/ links from the rename.
- This task's status moves to `done`.
