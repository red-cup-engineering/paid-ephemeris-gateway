"""Rewrite a slug value inside a note's frontmatter relation keys.

The caller passes the set of frontmatter keys that hold relations
(``depends-on``, ``see-also``, ``component-of``, …); the kernel does
not ship a default convention. Path-y values normalize before
comparison: ``../foo/old.md`` matches ``old`` and is rewritten to the
literal ``new_slug``. Returns the number of fields modified.
"""
from __future__ import annotations

from pathlib import Path
from typing import Iterable

from pyfars.kernel.operator.edit.rewrite_fm import apply
from pyfars.kernel.projector.parse.frontmatter import parse as parse_fm
from pyfars.kernel.projector.parse.slug import slug_of


def rewrite(path: Path, old_slug: str, new_slug: str, *,
            keys: Iterable[str]) -> int:
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
