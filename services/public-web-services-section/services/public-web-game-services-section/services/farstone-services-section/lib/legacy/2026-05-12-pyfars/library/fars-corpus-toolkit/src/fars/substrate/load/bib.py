"""Read a BibTeX file from disk and parse its entries.

Returns ``[]`` if the file does not exist — callers decide whether absence
is an error in their context.
"""
from __future__ import annotations

from pathlib import Path

from fars.substrate.parse.bibtex import parse as parse_bibtex
from fars.substrate.types.bibentry import BibEntry


def load(path: Path) -> list[BibEntry]:
    if not path.is_file():
        return []
    return parse_bibtex(path.read_text(encoding="utf-8", errors="replace"))
