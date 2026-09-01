"""Pull the inline ``references:`` block out of a citing note's frontmatter.

Each entry of ``references:`` is a mapping with at least ``key:`` and
ideally ``type:`` plus the citation fields (title, authors, year, ...).
Returns ``(references, diagnostics)``; malformed entries become Diagnostics
and are skipped.
"""
from __future__ import annotations

from pathlib import Path
from typing import Mapping

from fars.substrate.parse._reference_entry import entry_to_reference
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.types.reference import Reference


def parse(fm: Mapping, *, source_path: str
          ) -> tuple[list[Reference], list[Diagnostic]]:
    inline = fm.get("references")
    if not inline:
        return [], []
    if not isinstance(inline, list):
        return [], [Diagnostic(
            code="references-not-list",
            severity="error",
            message="frontmatter `references:` must be a list of mappings",
            path=Path(source_path),
        )]
    refs: list[Reference] = []
    diags: list[Diagnostic] = []
    for entry in inline:
        if not isinstance(entry, dict):
            diags.append(Diagnostic(
                code="references-entry-not-mapping",
                severity="error",
                message=f"each `references:` entry must be a mapping; got {type(entry).__name__}",
                path=Path(source_path),
            ))
            continue
        ref, errs = entry_to_reference(
            entry, source_path=source_path, declared_inline=True,
        )
        diags.extend(errs)
        if ref is not None:
            refs.append(ref)
    return refs, diags
