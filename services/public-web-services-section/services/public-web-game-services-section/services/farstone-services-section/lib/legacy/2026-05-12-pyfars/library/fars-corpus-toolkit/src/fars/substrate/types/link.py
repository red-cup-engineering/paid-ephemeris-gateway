"""A markdown body link: ``[text](target_raw)``.

``kind`` is one of relative, absolute, external, anchor, asset.
``target_resolved`` is filled in by a separate resolver pass when ``kind``
is relative or absolute and the file exists; None means broken or N/A.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

LinkKind = Literal["relative", "absolute", "external", "anchor", "asset"]


@dataclass(frozen=True)
class Link:
    text: str
    target_raw: str
    line: int
    kind: LinkKind
    target_resolved: Path | None = None
