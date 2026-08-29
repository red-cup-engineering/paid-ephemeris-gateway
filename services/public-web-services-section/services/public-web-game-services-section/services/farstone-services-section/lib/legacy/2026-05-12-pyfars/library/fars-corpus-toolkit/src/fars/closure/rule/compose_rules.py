"""Run every default rule that has data to check on the given notes.

Builds the indexes each rule needs internally and concatenates their
diagnostics. For finer control (different index parameters, custom rule
sets, single-rule runs), call individual rules directly — this is just
the convenience composition for "run all standard checks."

``bib_path`` defaults to ``<root>/references.bib`` when ``root`` is given
and the file exists; pass it explicitly to override or set to ``None``
to skip the citation/bib rules entirely.
"""
from __future__ import annotations

from pathlib import Path

from fars.substrate.index.by_slug import build as build_by_slug
from fars.substrate.index.depends_on import build as build_depends_on
from fars.substrate.index.edges import build as build_edges
from fars.substrate.load.bib import load as load_bib
from fars.closure.rule.bib_health import check as check_bib
from fars.closure.rule.broken_citations import check as check_broken_citations
from fars.closure.rule.broken_links import check as check_broken_links
from fars.closure.rule.capability_coverage import check as check_capability_coverage
from fars.closure.rule.charter_binding import check as check_charter_binding
from fars.closure.rule.cycles import check as check_cycles
from fars.closure.rule.orphans import check as check_orphans
from fars.closure.rule.proofs import check as check_proofs
from fars.closure.rule.slug_collision import check as check_slug_collision
from fars.closure.rule.status_consistency import check as check_status
from fars.closure.rule.stubs import check as check_stubs
from fars.closure.rule.symbols import check as check_symbols
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile


def run(notes: list[Flatfile], *,
        root: Path | None = None,
        bib_path: Path | None = None,
        min_body_chars: int = 200,
        ) -> list[Diagnostic]:
    by_slug = build_by_slug(notes)
    edges = build_edges(notes)
    deps = build_depends_on(edges)

    if bib_path is None and root is not None:
        candidate = root / "references.bib"
        bib_path = candidate if candidate.is_file() else None
    bib_keys = {b.key for b in load_bib(bib_path)} if bib_path else set()

    diagnostics: list[Diagnostic] = []
    diagnostics.extend(check_cycles(deps, by_slug))
    diagnostics.extend(check_broken_links(notes, by_slug))
    diagnostics.extend(check_slug_collision(by_slug))
    diagnostics.extend(check_stubs(notes, min_chars=min_body_chars))
    diagnostics.extend(check_orphans(notes))
    diagnostics.extend(check_status(notes, by_slug))
    diagnostics.extend(check_proofs(notes))
    diagnostics.extend(check_symbols(notes))
    diagnostics.extend(check_capability_coverage(notes))
    diagnostics.extend(check_charter_binding(notes))
    if bib_path is not None:
        diagnostics.extend(check_broken_citations(notes, bib_keys))
        diagnostics.extend(check_bib(bib_path))
    return diagnostics
