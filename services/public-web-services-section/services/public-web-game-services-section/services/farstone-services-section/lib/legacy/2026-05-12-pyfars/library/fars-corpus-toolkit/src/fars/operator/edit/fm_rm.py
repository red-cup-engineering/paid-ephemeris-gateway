"""Remove a frontmatter key (or one item from a list-valued key).

If ``item`` is None, removes the whole key.
If ``item`` is given and the key holds a list, drops that item; when the
list becomes empty, removes the key entirely.
If ``item`` is given but the key is scalar/equal, removes the whole key.
"""
from __future__ import annotations


def remove(fm: dict, key: str, item=None) -> dict:
    out = dict(fm)
    if key not in out:
        return out
    if item is None:
        del out[key]
        return out
    cur = out[key]
    if isinstance(cur, list):
        new = [x for x in cur if x != item]
        if not new:
            del out[key]
        else:
            out[key] = new
    elif cur == item:
        del out[key]
    return out
