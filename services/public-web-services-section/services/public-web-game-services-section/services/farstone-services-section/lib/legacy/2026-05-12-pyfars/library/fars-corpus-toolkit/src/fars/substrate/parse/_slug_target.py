"""Normalize a target string to a bare slug.

Strips ``#anchor``, ``?query``, ``.md`` suffix, and any directory prefix.
Used for both markdown link targets and frontmatter relation values
(some notes write the latter as path-y references like ``../foo/bar.md``
rather than bare slugs).

Pass ``require_md=True`` when the caller only cares about ``.md`` targets
(body markdown links); the function returns None for non-``.md`` targets
in that mode.
"""
from __future__ import annotations


def slug_of(target: str, *, require_md: bool = False) -> str | None:
    s = target.split("#", 1)[0].split("?", 1)[0].strip()
    if not s:
        return None
    has_md = s.endswith(".md")
    if require_md and not has_md:
        return None
    if has_md:
        s = s[:-3]
    s = s.rsplit("/", 1)[-1]
    return s or None
