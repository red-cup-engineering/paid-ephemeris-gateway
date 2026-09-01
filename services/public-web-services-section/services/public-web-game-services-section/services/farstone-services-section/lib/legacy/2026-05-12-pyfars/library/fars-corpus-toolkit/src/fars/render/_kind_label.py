"""Display label for each note kind in the monograph (``Theorem``, ``Definition``, …)."""
from __future__ import annotations

from fars.convention import KIND_LABEL


def label(kind: str) -> str:
    return KIND_LABEL.get(kind, kind.capitalize())
