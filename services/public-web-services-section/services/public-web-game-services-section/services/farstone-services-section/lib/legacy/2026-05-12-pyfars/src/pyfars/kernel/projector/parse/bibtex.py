"""Extract entries from a BibTeX file body.

Minimal: every ``@type{key, ...}`` becomes a ``BibEntry`` with empty fields.
Brace-imbalance and duplicate-key detection live in ``rule/bib_health``;
this is the parser, not the validator. ``@comment`` entries are skipped.
"""
from __future__ import annotations

import re

from pyfars.kernel.types.bibentry import BibEntry

_ENTRY_RE = re.compile(r"@(\w+)\s*\{\s*([A-Za-z0-9\-]+)\s*,")


def parse(text: str) -> list[BibEntry]:
    out: list[BibEntry] = []
    for m in _ENTRY_RE.finditer(text):
        entry_type = m.group(1)
        if entry_type.lower() == "comment":
            continue
        out.append(BibEntry(entry_type=entry_type, key=m.group(2)))
    return out
