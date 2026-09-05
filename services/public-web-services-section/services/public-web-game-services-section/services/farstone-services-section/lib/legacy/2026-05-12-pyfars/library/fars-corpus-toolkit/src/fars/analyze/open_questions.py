"""Question-kind notes whose status is unset, ``open``, or ``partial``."""
from __future__ import annotations

from fars.substrate.flatfile import Flatfile


def find(notes: list[Flatfile]) -> list[Flatfile]:
    return [n for n in notes
            if n.kind == "question"
            and n.fm.get("status") in (None, "open", "partial")]
