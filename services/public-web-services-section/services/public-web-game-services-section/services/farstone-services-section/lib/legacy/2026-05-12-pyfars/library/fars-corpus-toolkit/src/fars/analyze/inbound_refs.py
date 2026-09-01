"""Find every reference to a target slug across the fars.

Two flavors:

  - **fm**: notes whose frontmatter has the slug as a value of any
    relation key (``depends-on``, ``see-also``, ``component-of``, …).
    Returned as ``(note, relation_key, position)`` where position is
    the index in the list (or None for scalar values).

  - **body**: notes with markdown body links whose target resolves to
    the slug. Returned as ``(note, link)`` where link carries
    ``target_raw`` and ``line``.

Used by ``fars move`` to rewrite every inbound reference when a slug
is renamed or relocated.
"""
from __future__ import annotations

from typing import Iterable

from fars.substrate.parse._slug_target import slug_of
from fars.substrate.parse.fm_relations import RELATION_KEYS
from fars.substrate.parse.markdown_links import parse as parse_links
from fars.substrate.types.link import Link
from fars.substrate.flatfile import Flatfile


def fm_refs(notes: Iterable[Flatfile], target_slug: str, *,
            keys: Iterable[str] = RELATION_KEYS,
            ) -> list[tuple[Flatfile, str, int | None]]:
    out: list[tuple[Flatfile, str, int | None]] = []
    keys = tuple(keys)
    for n in notes:
        for k in keys:
            v = n.fm.get(k)
            if isinstance(v, list):
                for i, item in enumerate(v):
                    if isinstance(item, str) and slug_of(item) == target_slug:
                        out.append((n, k, i))
            elif isinstance(v, str) and slug_of(v) == target_slug:
                out.append((n, k, None))
    return out


def body_refs(notes: Iterable[Flatfile], target_slug: str
              ) -> list[tuple[Flatfile, Link]]:
    out: list[tuple[Flatfile, Link]] = []
    for n in notes:
        for link in parse_links(n.body):
            if link.kind not in ("relative", "absolute"):
                continue
            if slug_of(link.target_raw, require_md=True) == target_slug:
                out.append((n, link))
    return out
