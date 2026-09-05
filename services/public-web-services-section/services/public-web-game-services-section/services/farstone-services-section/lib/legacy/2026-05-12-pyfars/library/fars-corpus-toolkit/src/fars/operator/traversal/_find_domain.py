"""Walk a note's path upward to find its enclosing domain note.

A "domain" is a directory with ``_index.md`` whose name is not a
subcollection (terms/, concepts/, theorems/, ...). Returns ``None`` if
no enclosing domain is found.
"""
from __future__ import annotations

from pathlib import Path
from typing import Mapping

from fars.convention import SUBCOLLECTIONS
from fars.substrate.flatfile import Flatfile


def find_domain(source: Flatfile, *,
                by_domain: Mapping[str, list[Flatfile]],
                ) -> Flatfile | None:
    parts = list(source.path.parts[:-1])  # drop the filename
    while parts:
        dir_name = parts[-1]
        if dir_name not in SUBCOLLECTIONS:
            dir_path = Path(*parts)
            for d in by_domain.get(dir_name, ()):
                if d.path.parent == dir_path:
                    return d
        parts.pop()
    return None
