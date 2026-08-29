"""Resolve a slug to a Flatfile from a source note's vantage.

Resolution rules (in order):

  1. **Colocated** — same parent directory as ``source``.
  2. **Directory ancestors** — for each ancestor of ``source``, look in
     the ancestor itself and its ``terms/`` subdir.
  3. **Specializes-chain** — find ``source``'s domain, walk
     ``specializes:`` upward, look at each step's directory and its
     ``terms/`` subdir.

Returns ``(note, reason)`` — ``note`` is None when nothing matches and
``reason`` indicates which rule (or "unresolved") fired.
"""
from __future__ import annotations

from pathlib import Path
from typing import Mapping

from fars.operator.traversal._find_domain import find_domain
from fars.operator.traversal.chain import chain
from fars.substrate.flatfile import Flatfile


def resolve(source: Flatfile, slug: str, *,
            by_slug: Mapping[str, list[Flatfile]],
            by_domain: Mapping[str, list[Flatfile]],
            ) -> tuple[Flatfile | None, str]:
    slug = slug.lower()
    candidates = by_slug.get(slug, [])
    if not candidates:
        return None, "no-such-slug"

    src_dir = source.path.parent

    # 1. colocated
    for c in candidates:
        if c.path.parent == src_dir and c.path != source.path:
            return c, "colocated"

    # 2. directory ancestors (each ancestor + its terms/)
    cur = src_dir
    while True:
        for c in candidates:
            cp = c.path.parent
            if (cp == cur or cp == cur / "terms") and c.path != source.path:
                return c, f"directory-ancestor({cur})"
        if cur == Path("") or cur == cur.parent:
            break
        cur = cur.parent

    # 3. component-of chain (the corpus convention: domains declare
    #    `component-of: <parent-domain>`; walk that chain looking for
    #    the slug at each step's directory or terms/ subdir).
    domain = find_domain(source, by_domain=by_domain)
    if domain is None:
        return None, "no-domain-found"
    for step in chain(domain, by_domain, key="component-of")[1:]:
        step_dir = step.path.parent
        for c in candidates:
            cp = c.path.parent
            if cp == step_dir or cp == step_dir / "terms":
                return c, f"component-of-chain({step.slug})"

    return None, "unresolved"
