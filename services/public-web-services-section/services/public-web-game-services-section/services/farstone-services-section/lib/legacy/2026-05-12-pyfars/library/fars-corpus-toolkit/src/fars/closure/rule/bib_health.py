"""Brace-imbalance and duplicate cite-key checks on a BibTeX file.

Returns no diagnostics when the file doesn't exist — the caller decides
whether absence matters in their context.
"""
from __future__ import annotations

from pathlib import Path
from typing import Iterator

from fars.substrate.parse.bibtex import parse as parse_bibtex
from fars.substrate.types.diagnostic import Diagnostic


def check(bib_path: Path) -> Iterator[Diagnostic]:
    if not bib_path.is_file():
        return
    text = bib_path.read_text(encoding="utf-8", errors="replace")
    if text.count("{") != text.count("}"):
        yield Diagnostic(
            code="bib-error",
            severity="error",
            message=f"brace imbalance: {text.count('{')} open vs {text.count('}')} close",
            path=bib_path,
        )
    seen: set[str] = set()
    dups: set[str] = set()
    for entry in parse_bibtex(text):
        if entry.key in seen:
            dups.add(entry.key)
        seen.add(entry.key)
    if dups:
        yield Diagnostic(
            code="bib-error",
            severity="error",
            message=f"duplicate cite-keys: {sorted(dups)}",
            path=bib_path,
        )
