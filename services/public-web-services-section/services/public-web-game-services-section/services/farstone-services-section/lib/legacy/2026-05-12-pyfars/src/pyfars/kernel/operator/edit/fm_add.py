"""Append an item to a list-valued frontmatter field.

If the key is absent, creates the list. If the key exists but holds a
scalar, promotes it to a list before appending. No-op when the item
is already present (set semantics on the list).
"""
from __future__ import annotations


def add_item(fm: dict, key: str, item) -> dict:
    out = dict(fm)
    cur = out.get(key)
    if cur is None:
        out[key] = [item]
    elif isinstance(cur, list):
        if item not in cur:
            out[key] = [*cur, item]
    else:
        if cur != item:
            out[key] = [cur, item]
    return out
