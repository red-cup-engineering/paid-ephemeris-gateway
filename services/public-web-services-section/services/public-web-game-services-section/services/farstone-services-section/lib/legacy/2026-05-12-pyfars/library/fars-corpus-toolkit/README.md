# fars

Tools for working with this repository's frontmatter-markdown corpus.

The whole repo is one corpus.
Every CLI takes a path (default CWD) and walks it.
There's no `fars.toml` to discover, no privileged "program" directory — you point at any subtree and the same code runs.

## First five minutes

If you're new (agent or human), the canonical orientation flow:

```bash
# Where am I? What's the shape of this corpus?
$ fars stats
$ fars list --kind theorem | head

# What does this slug mean, and what depends on it?
$ fars show bilattice
$ fars impact bilattice

# I want to work on something — what's the rough background?
$ fars ramp bilattice                      # reading list
$ fars context bilattice --depth 2          # one bounded markdown blob

# I want to add a new note — where should it go and what shape?
$ fars where theorem widget                 # picks the canonical dir
$ fars new theorem widget --depends-on alpha,beta

# I edited a thing — did I break anything?
$ fars check path/to/note.md                # one file, sub-second
$ fars validate                             # whole tree

# Exploration / cleanup
$ fars search "bilattice algebra" --bm25    # ranked search
$ fars query nominate                       # cleanup leverage targets
$ fars lint --fix                           # apply auto-fixers

# Refactoring (always dry-run by default)
$ fars move concepts/widget.md objects/widget.md   # dry-run
$ fars move concepts/widget.md objects/widget.md --apply
$ fars rename-fm-key date_created date-created --apply

# Don't trust your refactor? Snapshot before, undo after.
$ fars snapshot --label before-bulk-edit
$ fars undo before-bulk-edit

# Calling from Python (no argparse)
>>> from corpus import api
>>> diags = api.validate(".")
>>> rows = api.search(".", "bilattice", bm25=True, limit=5)

# Machine-readable verb catalog (for MCP / IDE integrations)
$ fars list-verbs --json
```

## Quick reference

```
$ python -m corpus
verbs: audit, check, cite, commit, compose, context, diff, fm, fm-keys,
       from-template, help, impact, index, install-hooks, lint, list,
       mcp, move, new, plan, query, ramp, rename-fm-key, rewrite-slug,
       search, show, snapshot, stats, undo, validate, watch, where
```

| verb | one-liner |
|---|---|
| `audit` | structural-risk analysis (load-bearing slugs, body-vs-deps mismatches) |
| `check` | fast single-file validate |
| `cite` | generate references.bib from inline `references:` blocks |
| `commit` | stage corpus .md changes and commit (auto-message by default) |
| `compose` | render the subtree as a single markdown monograph |
| `context` | bounded-budget BFS subgraph from a slug for LLM context |
| `diff` | run check rules on every .md changed since a git ref |
| `fm` | read or mutate a note's frontmatter without YAML editing |
| `fm-keys` | every frontmatter key, ranked by frequency (drift detector) |
| `from-template` | clone an existing note's fm shape under a new slug |
| `help` | usage + worked example for one verb |
| `impact` | transitive descendants of a slug, ranked by status |
| `index` | manage the optional sqlite load cache |
| `install-hooks` | drop a pre-commit hook running `fars diff` |
| `lint` | list or auto-fix common corpus problems |
| `list` | enumerate notes by kind / domain / path substring |
| `list-verbs` | machine-readable catalog (verb, description, example) |
| `mcp` | start an MCP server exposing every verb as a tool |
| `move` | rename or relocate a note, rewriting every inbound reference |
| `new` | scaffold a new note with kind-correct frontmatter and rubric body |
| `plan` | research-demand views (question readiness, frontier, gaps) |
| `query` | 18 read-only graph + EAVT subcommands |
| `ramp` | topo-sorted reading list of a slug's transitive ancestors |
| `rename-fm-key` | bulk-rename a frontmatter key across the corpus |
| `rewrite-slug` | rename a slug everywhere; file stays in its directory |
| `search` | ranked text + frontmatter search (substring, regex, or BM25) |
| `show` | pretty-print a note + its in/out edges |
| `snapshot` | save corpus state via git stash (or filesystem copy) |
| `stats` | one-shot corpus health overview |
| `undo` | restore from a snapshot |
| `validate` | run every default rule and emit a diagnostic report |
| `watch` | re-run a verb on file changes |
| `where` | suggest the canonical directory for a new note of a given kind |

`fars help <verb>` for a one-paragraph description and worked example per verb.

## Spec-driven verbs

Verbs that have migrated declare a single `SPEC: VerbSpec` constant that drives every surface — argparse, the typed `run()` Python entry, the MCP tool schema, the help text, and `fars list-verbs --json`.
This eliminates the previous duplication where each verb's argument shape lived in argparse, in `api.py`, in `cli/mcp.py` (string-parsed), and in `cli/help.py` independently.

Each spec-driven verb file looks like:

```python
SPEC = VerbSpec(
    name="impact",
    description="Transitive descendants of a slug, ranked by status (proved first).",
    example="corpus impact bilattice",
    parameters=(
        Parameter(name="slug", kind="positional", required=True, ...),
        Parameter(name="root", kind="flag", type=Path, default=Path("."), ...),
        Parameter(name="json", kind="store_true", ...),
    ),
)

def run(slug: str, *, root: Path | str = ".") -> dict | None:
    ...   # typed entry — no argparse

def main(argv=None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    ...   # delegates to run(), prints output
```

Run `fars list-verbs` to see which verbs have migrated; the rest keep working through their hand-rolled `main`.
Migration is one file at a time.

## Architecture

The package is layered.
Every leaf is one of:

- one frozen dataclass (`types/`)
- one pure function (everywhere else)
- one CLI entry (`cli/<verb>.py:main`)
- one private helper (`_*` underscore prefix)

Composition happens at call sites.
No leaf module orchestrates.

```
src/corpus/
├── types/    Note, Reference, Edge, Claim, Link, CiteKey, BibEntry,
│             Diagnostic, Suggestion
├── parse/    text → typed: frontmatter, links, citations, bibtex,
│             fm_relations, fm_references, fm_annotation, link_kind,
│             _slug_target, _reference_entry
├── load/     path → typed: note, notes, bib, _path_filter, _singularize
├── index/    collection → derived: by_slug, by_kind, by_dir, by_domain,
│             edges, in_edges, out_edges, depends_on, dependents,
│             claims, references, realizers, _fm_walk
├── graph/    graph queries: ancestors, descendants, descendant_counts,
│             cycles, topo_sort, foundation_distance, resolve_term,
│             chain, _find_domain, _subcollections
├── score/    note → number / bool: inbound, broken_outbound,
│             clean_outbound, body_chars, density, has_description,
│             structure, citation_density, reference_count,
│             rubric_coverage, slop, proven_theorems_about, firmness,
│             load_bearing_links, composite
├── analyze/  multi-output structured analyses: nominate, champion,
│             impact, ramp, where, stats, search, context_walk,
│             open_questions, question_blockers, question_readiness_view,
│             question_clusters, enablement_frontier, demand_clusters,
│             realization_gaps, split_candidates, loose_concepts,
│             load_bearing_pillars, isolated_morphisms,
│             unnamed_ancestor_candidates, predicate_category,
│             crossref_vs_depends_on, inbound_refs
├── rule/     corpus → diagnostics: cycles, broken_links,
│             broken_citations, slug_collision, bib_health, stubs,
│             orphans, status_consistency, proofs, symbols,
│             compose_rules
├── lint/     corpus → suggestions (with optional auto-fix):
│             depends_on_completeness, empty_description,
│             trailing_newline, fm_key_casing, compose_lint
├── edit/     side-effectful: fm_set, fm_add, fm_rm, rewrite_fm,
│             rename_fm_key, rewrite_fm_slug, rewrite_body_link,
│             move_note
├── render/   data → string: bibtex_entry, bibtex_file,
│             diagnostic_line, diagnostics_section, diagnostics_report,
│             monograph_block, monograph_chapter, monograph_part,
│             monograph_preface, monograph_appendix_questions,
│             monograph_appendix_further_reading, monograph,
│             audit_report, plan_report, stats_report, impact_report,
│             ramp_report, context_blob, show_note, note_template,
│             fm_dump, json_dump, _author_name, _demote_headings,
│             _extract_title, _kind_label, _link_rewrite, _strip_lean,
│             _title
└── cli/      argparse + load + compose + render
    ├── _runner.py    make_parser / resolve_root / workspace_from_args
    ├── help.py       _HELP dict (legacy fallback for non-spec-driven verbs)
    ├── 33 top-level verbs as <name>.py (10 spec-driven so far)
    └── query/        18 subcommands as <name>.py + __main__ dispatcher

src/corpus/
├── taxonomy.py    KIND_LABEL, RELATION_KEYS, INTERNAL_FIELDS, ...
├── workspace.py   Workspace dataclass with lazy notes + indexes
├── spec.py        VerbSpec + Parameter + argparse/MCP/help generators
├── api.py         programmatic entry points (validate, search, show, ...)
└── __main__.py    `python -m corpus` dispatcher
```

## Running

The package needs `pyyaml`.
To run from a clone:

```bash
PYTHONPATH=src python -m corpus <verb> [args...]
```

To install editable:

```bash
pip install -e .
corpus <verb> [args...]
```

## Tests

```bash
PYTHONPATH=src python -m pytest tests/ -q
```

148 tests covering: - Foundational layers (parse, load, index, graph, score, edit, lint) - Analytics (BM25 search, sqlite cache, fm-keys, snapshot) - `taxonomy` invariants (kind groups disjoint, badge supersets theorems, …) - `Workspace` lazy-load + caching - `api.*` programmatic entry points (read + edit operations) - CLI smoke tests for every read-only verb against a fixture corpus

Shared `tests/conftest.py` provides the fixture corpus.
Sub-second runtime.

## Extending

### Add a new rule

1. Write `src/corpus/rule/<name>.py` exporting `def check(notes, ...) -> Iterator[Diagnostic]`.
2. Add the import + call in `rule/compose_rules.py`.
3. Add the (code, title) entry to `render/diagnostics_report.py`'s `DEFAULT_SECTION_ORDER` so it appears in validate's report.
4. Write `tests/test_rule_<name>.py`.

### Add a new score

1. Write `src/corpus/score/<name>.py` exporting `def score(note_or_slug, *, …) -> ...
  `.
  One function, no orchestration.
2. Compose it with others via `score/composite.score(*signals, combine=…)` when you want a multi-signal product.

### Add a new analyze

Functions that return structured data (lists, tier dicts, ranked tuples) go in `analyze/`.
They're allowed to call into multiple `index/`, `graph/`, and `score/` modules.
One function per file.

### Add a new linter

1. Write `src/corpus/lint/<name>.py` exporting `def find(notes, *, by_slug, root) -> list[Suggestion]`.
2. Each suggestion may carry an optional `apply` callable for `--fix`.
3. Add the import + call in `lint/compose_lint.py`.

### Add a new verb (spec-driven)

1. Write `src/corpus/cli/<verb>.py`:
   ```python
   from corpus.spec import Parameter, VerbSpec, make_argparse

   SPEC = VerbSpec(
       name="<verb>",
       description="One-line description.",
       example="corpus <verb> ...",
       parameters=(
           Parameter(name="slug", kind="positional", required=True,
                     description="..."),
           Parameter(name="root", kind="flag", type=Path, default=Path("."),
                     short="-r", description="corpus root (default: CWD)"),
           Parameter(name="json", kind="store_true", description="..."),
       ),
   )

   def run(slug: str, *, root: Path | str = ".") -> ...:
       """Typed entry — callable from corpus.api / MCP."""
       ...

   def main(argv=None) -> int:
       args = make_argparse(SPEC).parse_args(argv)
       ...
   ```
2. Add the verb to `VERB_MODULES` in `cli/__main__.py`.
3. (Optional) Expose `run()` from `corpus/api.py`.
4. (Optional) Add a CLI smoke test entry in `tests/test_cli_smoke.py`.

argparse, MCP tool schema, `fars help <verb>`, and `fars list-verbs --json` all read from `SPEC` — no duplication.

For a non-spec-driven verb (legacy pattern):

1. Write `src/corpus/cli/<verb>.py` with `def main(argv) -> int`.
2. Add an entry to `_HELP` in `cli/help.py` (description, example, notes).
3. Add it to `VERB_MODULES` in `cli/__main__.py`.

### Add a query subcommand

1. Write `src/corpus/cli/query/<name>.py` with `def run(ctx: QueryContext, args: list[str]) -> int`.
2. Register it in `SUBCOMMANDS` in `cli/query/__main__.py`.

## Design rules

- **The whole repo is the corpus.** Every CLI takes a path and walks it.
  No discovery of `fars.toml` or `research.toml`.
  Defaults work for any subtree.
- **One function per file.** Add a feature by adding a module, not by growing a function.
  Compose at the call site.
- **Constants live in one place.** `RELATION_KEYS`, `INTERNAL_FIELDS`, `META`, `SCALAR_CONFIG`, `KIND_LABEL`, `SUBCOLLECTIONS` each live in exactly one module.
  Don't duplicate.
- **Edits are dry-run by default.** `move`, `rename-fm-key`, `rewrite-slug`, `lint --fix`, `commit`, `snapshot`/`undo` all require an explicit flag (or `--apply`) to mutate.
- **Diagnostics carry enough context to fix.** Path, line, slug, target.
  JSON output preserves all of it; markdown formatting is a render-time choice.
- **Path filter excludes draft + build content by default.** `triage/`, `archetypes/`, `node_modules/`, `.git/`, vendored markers.
  Override with a custom `path_filter` callable when a tool needs to see drafts (e.g., `query triage-cands`).
- **Caches are opt-in.** `fars index --rebuild` builds the sqlite cache; `read()` is a separate call consumers must invoke.
  The default load path always re-walks the filesystem so freshness is never a surprise.
- **MCP is a soft dependency.** `fars mcp` requires `pip install mcp` but no other verb does.
  Agents that prefer subprocess calls don't pay the dep cost.

## History

The package was greenfield-rebuilt from `operations/engineering/tools/triage/` (deleted), which was a 6-package uv workspace plus a 700-line `corpus-digraph/query.py`.
Each wonky tool there had its own `analysis.py`/`render.py`/CLI and re-derived overlapping graph queries.
The rebuild collapsed it into one library where every primitive (descendant counts, body-link extraction, slug normalization) lives once and is reused.
