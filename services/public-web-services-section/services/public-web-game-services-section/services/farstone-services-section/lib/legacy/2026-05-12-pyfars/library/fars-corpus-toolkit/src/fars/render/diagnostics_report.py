"""Render a full diagnostics report grouped by code, in a canonical order.

Codes not in ``section_order`` are still rendered, gathered under
"Other" at the bottom. Pass a custom ``section_order`` to reshape the
report (e.g. to suppress sections you don't care about for a given run).
"""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Iterable

from fars.render.diagnostics_section import render as render_section
from fars.substrate.types.diagnostic import Diagnostic

# Canonical (code, title) pairs. Order = display order.
DEFAULT_SECTION_ORDER: tuple[tuple[str, str], ...] = (
    ("frontmatter-parse",       "Frontmatter parse errors"),
    ("file-read-error",         "File read errors"),
    ("slug-collision",          "Slug collisions"),
    ("bib-error",               "references.bib errors"),
    ("broken-link",             "Broken cross-references"),
    ("broken-citation",         "Broken citations"),
    ("symbol-collision",        "Symbol collisions (frontmatter `symbol:`)"),
    ("cycle",                   "Cycles in depends-on"),
    ("status-inconsistency",    "Status inconsistencies (proved → unproved)"),
    ("missing-status",          "Theorems missing status"),
    ("missing-proof",           "Theorems with status: proved but no proof section"),
    ("wip-theorem",             "WIP theorems (sketch / draft)"),
    ("stub",                    "Stubs (body below threshold)"),
    ("orphan",                  "Orphans (no incoming refs)"),
)


def render(diagnostics: list[Diagnostic], *,
           title: str = "Library status report",
           n_notes: int | None = None,
           root: Path | None = None,
           section_order: Iterable[tuple[str, str]] = DEFAULT_SECTION_ORDER,
           ) -> str:
    grouped: dict[str, list[Diagnostic]] = defaultdict(list)
    for d in diagnostics:
        grouped[d.code].append(d)

    out: list[str] = [f"# {title}", ""]
    if root is not None:
        out.append(f"Root: `{root}`")
    if n_notes is not None:
        out.append(f"Total notes: {n_notes}")
    out.append(f"Total diagnostics: {len(diagnostics)}")
    out.append("")

    section_order = tuple(section_order)
    rendered_codes: set[str] = set()
    for code, sec_title in section_order:
        out.append(render_section(sec_title, grouped.get(code, [])))
        rendered_codes.add(code)

    leftover_codes = [c for c in grouped if c not in rendered_codes]
    if leftover_codes:
        leftover = [d for c in leftover_codes for d in grouped[c]]
        out.append(render_section("Other", leftover))

    return "\n".join(out)
