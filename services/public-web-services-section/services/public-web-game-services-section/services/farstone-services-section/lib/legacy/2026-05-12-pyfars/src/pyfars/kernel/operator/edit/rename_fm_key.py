"""Rename a frontmatter key in a single note's fm dict.

Preserves declaration order: ``new_key`` lands at the position the old
key occupied. If both ``old_key`` and ``new_key`` already exist, the
new key's value wins (``old_key`` is removed without overwriting).
Returns the new dict; caller decides whether to write it back.
"""
from __future__ import annotations


def rename(fm: dict, old_key: str, new_key: str) -> dict:
    if old_key not in fm:
        return fm
    if old_key == new_key:
        return fm
    out: dict = {}
    for k, v in fm.items():
        if k == old_key:
            if new_key not in out and new_key not in fm:
                out[new_key] = v
            elif new_key in fm and k != new_key:
                continue
        else:
            out[k] = v
    if new_key in fm:
        out.setdefault(new_key, fm[new_key])
    return out
