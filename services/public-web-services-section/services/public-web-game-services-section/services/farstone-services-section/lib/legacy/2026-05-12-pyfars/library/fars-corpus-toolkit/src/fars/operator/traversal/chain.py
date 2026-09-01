"""Walk a frontmatter relation key into a chain of notes.

For each step, read ``fm[key]`` as a slug, look it up in ``lookup``, and
recurse. Cycles cut off; missing targets stop the walk. Returns
``[start, parent, grandparent, ...]``.

Default ``key`` is ``component-of`` — the corpus's hierarchical
relation between domain ``_index.md`` files (and many individual
notes). Pass ``key='specializes'`` for the rarer per-note relation,
or any other string-valued frontmatter key that points at a slug.

``lookup`` is typically ``index.by_domain`` (when chaining domain
hierarchy) or ``index.by_slug`` (when chaining note-level relations).
"""
from __future__ import annotations

from typing import Mapping

from fars.substrate.flatfile import Flatfile


def chain(start: Flatfile, lookup: Mapping[str, list[Flatfile]], *,
          key: str = "component-of",
          max_steps: int = 10) -> list[Flatfile]:
    out: list[Flatfile] = [start]
    seen: set[str] = {start.slug}
    cur = start
    for _ in range(max_steps):
        v = cur.fm.get(key)
        if not isinstance(v, str) or not v.strip():
            break
        candidates = lookup.get(v.strip().lower(), ())
        nxt = candidates[0] if candidates else None
        if nxt is None or nxt.slug in seen:
            break
        out.append(nxt)
        seen.add(nxt.slug)
        cur = nxt
    return out
