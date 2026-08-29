"""Programmatic API: every verb's main logic, callable from Python.

Each function here mirrors a CLI verb's "do the thing" without going
through argparse — useful for the MCP server, in-process pipelines,
tests, and any external Python code that wants to call into the fars.

Conventions:
  - First arg is always ``root: Path | str`` (the corpus path).
  - Read-only functions return typed data structures (lists, dicts,
    dataclasses, generators) — never markdown strings.
  - Edit functions take the same dry-run / apply flag the CLI takes
    and return a summary dict. They mutate the filesystem.
  - Render functions are not in this API — render layer modules already
    do the data → string transform; callers compose explicitly.

This module imports lazily (inside each function body) to keep
``import fars.api`` cheap; the heavy load only kicks in on first call.
"""
from __future__ import annotations

from pathlib import Path

from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile
from fars.substrate.store import Substrate


def workspace(root: Path | str) -> Substrate:
    """Build a ``Substrate`` for ``root`` — the entry point for any
    in-process pipeline that needs the same load + index machinery
    the CLIs use."""
    return Substrate(root=Path(root).resolve())


def validate(root: Path | str, *, bib_path: Path | None = None,
             min_body_chars: int = 200) -> list[Diagnostic]:
    """Run every default rule, returning the combined diagnostic list."""
    from fars.closure.rule.compose_rules import run
    ws = workspace(root)
    return list(ws.parse_diagnostics) + run(
        ws.notes, root=ws.root, bib_path=bib_path,
        min_body_chars=min_body_chars,
    )


def search(root: Path | str, pattern: str, *,
           kind: str | None = None,
           domain: str | None = None,
           bm25: bool = False,
           use_regex: bool = False,
           limit: int = 30) -> list[tuple[float, Flatfile] | tuple[float, Flatfile, dict]]:
    """Ranked text + frontmatter search.

    Returns ``[(score, note, hits), ...]`` for substring/regex mode or
    ``[(score, note), ...]`` for BM25 mode.
    """
    ws = workspace(root)
    if bm25:
        from fars.analyze.bm25_search import find as bm25_find
        return bm25_find(ws.notes, pattern,
                         kind=kind, domain=domain, limit=limit)
    from fars.analyze.search import find
    return find(ws.notes, pattern,
                kind=kind, domain=domain,
                use_regex=use_regex, limit=limit)


def show(root: Path | str, target: str
         ) -> list[tuple[Flatfile, list, list]] | None:
    """Resolve ``target`` (slug or path) and return matched notes with
    their inbound and outbound edges. None when nothing matched."""
    ws = workspace(root)
    matches: list[Flatfile] = []
    if "/" in target or "\\" in target or target.endswith(".md"):
        normalized = target.replace("\\", "/")
        for n in ws.notes:
            if str(n.path).replace("\\", "/") == normalized:
                matches.append(n)
                break
    if not matches:
        matches = list(ws.by_slug.get(target.lower(), []) or
                       ws.by_slug.get(target, []))
    if not matches:
        return None
    return [(n, list(ws.in_edges.get(n.slug, [])),
             list(ws.out_edges.get(n.slug, []))) for n in matches]


def list_notes(root: Path | str, *,
               kind: str | None = None,
               domain: str | None = None,
               path_contains: str | None = None) -> list[Flatfile]:
    ws = workspace(root)
    out = []
    for n in sorted(ws.notes, key=lambda x: x.slug):
        if kind and n.kind != kind:
            continue
        if domain and n.dir != domain:
            continue
        if path_contains and path_contains not in str(n.path).replace("\\", "/"):
            continue
        out.append(n)
    return out


def stats(root: Path | str) -> dict:
    from fars.analyze.stats import gather
    ws = workspace(root)
    return gather(ws.notes, root=ws.root)


def impact(root: Path | str, slug: str) -> dict | None:
    from fars.analyze.impact import gather
    ws = workspace(root)
    if slug not in ws.by_slug:
        return None
    return gather(slug, by_slug=ws.by_slug, dependents=ws.dependents)


def ramp(root: Path | str, slug: str) -> list[Flatfile] | None:
    from fars.analyze.ramp import gather
    ws = workspace(root)
    if slug not in ws.by_slug:
        return None
    return gather(slug, by_slug=ws.by_slug, depends_on=ws.depends_on)


def context(root: Path | str, slug: str, *,
            depth: int = 2, budget_chars: int = 8000) -> list[Flatfile]:
    from fars.analyze.context_walk import walk
    ws = workspace(root)
    return walk(slug, by_slug=ws.by_slug, depends_on=ws.depends_on,
                depth=depth, budget_chars=budget_chars)


def fm_keys(root: Path | str
            ) -> list[tuple[str, int, list[str], list[str]]]:
    from fars.analyze.fm_keys import gather
    ws = workspace(root)
    return gather(ws.notes)


def lint(root: Path | str):
    from fars.closure.lint.compose_lint import run
    ws = workspace(root)
    return run(ws.notes, root=ws.root)


def audit(root: Path | str) -> dict:
    from fars.analyze.crossref_vs_depends_on import analyze
    from fars.operator.traversal.descendant_counts import counts
    from fars.operator.traversal.foundation_distance import distance
    ws = workspace(root)
    slugs = [n.slug for n in ws.notes]
    return {
        "n_notes": len(ws.notes),
        "crossref": analyze(ws.notes, depends_on=ws.depends_on,
                            dependents=ws.dependents,
                            section_filter=True, drop_descendants=True,
                            drop_siblings=True),
        "crossref_aggressive": analyze(ws.notes, depends_on=ws.depends_on,
                                       dependents=ws.dependents,
                                       section_filter=False,
                                       drop_descendants=False,
                                       drop_siblings=False),
        "descendant_counts": counts(slugs, ws.dependents),
        "foundation_distance": distance(slugs, ws.depends_on, ws.dependents),
    }


def plan(root: Path | str) -> dict:
    from fars.analyze.demand_clusters import find as find_dc
    from fars.analyze.enablement_frontier import find as find_ef
    from fars.analyze.isolated_morphisms import find as find_im
    from fars.analyze.load_bearing_pillars import find as find_lp
    from fars.analyze.loose_concepts import find as find_lc
    from fars.analyze.question_clusters import find as find_qc
    from fars.analyze.question_readiness_view import view
    from fars.analyze.realization_gaps import find as find_rg
    from fars.analyze.split_candidates import find as find_sc
    from fars.analyze.unnamed_ancestor_candidates import find as find_uac

    ws = workspace(root)
    primitives, loose = find_lc(ws.notes, by_slug=ws.by_slug,
                                in_edges=ws.in_edges)
    return {
        "n_notes": len(ws.notes),
        "readiness": view(ws.notes, by_slug=ws.by_slug, in_edges=ws.in_edges),
        "question_clusters": find_qc(ws.notes, by_slug=ws.by_slug,
                                     in_edges=ws.in_edges),
        "enablement_frontier": find_ef(ws.notes, by_slug=ws.by_slug,
                                       in_edges=ws.in_edges),
        "demand_clusters": find_dc(ws.notes, by_slug=ws.by_slug,
                                   in_edges=ws.in_edges),
        "realization_gaps": find_rg(ws.notes),
        "split_candidates": find_sc(ws.notes),
        "ancestors_view": find_uac(ws.notes),
        "primitives": primitives,
        "loose_concepts": loose,
        "load_bearing_pillars": find_lp(ws.notes, by_slug=ws.by_slug,
                                        in_edges=ws.in_edges),
        "isolated_morphisms": find_im(ws.notes, by_slug=ws.by_slug,
                                      in_edges=ws.in_edges),
    }


# --- edit operations -------------------------------------------------------

def move(root: Path | str, old: str, new_path: Path | str, *,
         apply: bool = False) -> dict | None:
    """Rename or relocate a note. ``old`` is slug or relative path;
    ``new_path`` is the target (relative to root or absolute)."""
    from fars.operator.edit.move_note import move as do_move
    from fars.substrate.index.by_slug import build as build_by_slug
    from fars.substrate.load.notes import load as load_notes_fn
    root = Path(root).resolve()
    notes, _ = load_notes_fn(root)
    by_slug = build_by_slug(notes)

    note = None
    if "/" in old or "\\" in old or old.endswith(".md"):
        normalized = old.replace("\\", "/")
        for n in notes:
            if str(n.path).replace("\\", "/") == normalized:
                note = n
                break
    if note is None:
        matches = by_slug.get(old.lower(), []) or by_slug.get(old, [])
        if len(matches) == 1:
            note = matches[0]
    if note is None:
        return None

    target = Path(new_path)
    if not target.is_absolute():
        target = root / target
    target = target.resolve()
    if target.is_dir():
        target = target / (root / note.path).name
    return do_move(note, target, root=root, all_notes=notes, dry_run=not apply)


def rename_fm_key(root: Path | str, old: str, new: str, *,
                  apply: bool = False) -> int:
    """Rename a frontmatter key across the fars. Returns the number
    of files written when ``apply=True``, else the count that would be."""
    from fars.operator.edit.rename_fm_key import rename
    from fars.operator.edit.rewrite_fm import apply as rewrite
    ws = workspace(root)
    affected = [n for n in ws.notes if old in n.fm]
    if not apply:
        return len(affected)
    written = 0
    for n in affected:
        new_fm = rename(n.fm, old, new)
        if new_fm is not n.fm:
            rewrite(ws.root / n.path, new_fm)
            written += 1
    return written


def snapshot(root: Path | str, *, label: str | None = None,
             use_git: bool = True) -> dict:
    from fars.operator.edit.snapshot import save
    return save(Path(root).resolve(), label=label, use_git=use_git)


def undo(root: Path | str, label: str, *, use_git: bool = True) -> dict:
    from fars.operator.edit.snapshot import restore
    return restore(Path(root).resolve(), label, use_git=use_git)
