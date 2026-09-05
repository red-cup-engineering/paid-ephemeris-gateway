"""Rewrite a slug value inside a note's frontmatter relation keys.

Walks every relation key (``depends-on``, ``see-also``, ``component-of``,
…) and replaces matches of ``old_slug`` with ``new_slug``. Path-y
values normalize before comparison: ``../foo/old.md`` matches
``old`` and is rewritten to the literal ``new_slug`` (the path-y
spelling is collapsed; downstream tools normalize anyway).

Returns the number of fields modified.
"""
from __future__ import annotations

from typing import Iterable

from fars.operator.edit.rewrite_fm import apply
from fars.substrate.parse._slug_target import slug_of
from fars.substrate.parse.fm_relations import RELATION_KEYS
from fars.substrate.parse.frontmatter import parse as parse_fm
from pathlib import Path


def rewrite(path: Path, old_slug: str, new_slug: str, *,
            keys: Iterable[str] = RELATION_KEYS) -> int:
    text = path.read_text(encoding="utf-8")
    fm, _ = parse_fm(text)
    if fm is None:
        return 0
    changes = 0
    new_fm = dict(fm)
    for k in keys:
        v = new_fm.get(k)
        if isinstance(v, list):
            new_list = []
            modified = False
            for item in v:
                if isinstance(item, str) and slug_of(item) == old_slug:
                    new_list.append(new_slug)
                    modified = True
                else:
                    new_list.append(item)
            if modified:
                new_fm[k] = new_list
                changes += 1
        elif isinstance(v, str) and slug_of(v) == old_slug:
            new_fm[k] = new_slug
            changes += 1
    if changes:
        apply(path, new_fm)
    return changes
