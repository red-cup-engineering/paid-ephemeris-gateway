"""Notes that no other note references and that don't position anything.

Excluded by default:
  - Notes in a ``references/`` directory (standalone bibliographic entries).
  - Narratives that declare ``introduces``/``recaps``/``discusses``/``chapters``.
  - Questions that declare ``explores:``.

The result of these exclusions is that "orphan" means a content note with
no readers and no neighbors — a pure island.
"""
from __future__ import annotations

from typing import Iterable, Iterator, Mapping

from fars.substrate.parse.citations import parse as parse_citations
from fars.substrate.parse.fm_relations import RELATION_KEYS
from fars.substrate.parse.markdown_links import parse as parse_links
from fars.substrate.parse._slug_target import slug_of
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile


def check(notes: list[Flatfile], *,
          relation_keys: Iterable[str] = RELATION_KEYS,
          excluded_dirs: Iterable[str] = ("references",),
          ) -> Iterator[Diagnostic]:
    referenced: set[str] = set()
    for n in notes:
        for k in relation_keys:
            v = n.fm.get(k)
            if isinstance(v, list):
                referenced.update(slug_of(s) for s in v if isinstance(s, str))
            elif isinstance(v, str):
                tgt = slug_of(v)
                if tgt:
                    referenced.add(tgt)
        for link in parse_links(n.body):
            if link.kind in ("relative", "absolute"):
                tgt = slug_of(link.target_raw, require_md=True)
                if tgt:
                    referenced.add(tgt)
        for c in parse_citations(n.body):
            referenced.add(c.key)
    referenced.discard(None)

    excluded_dirs_set = set(excluded_dirs)
    positions_keys = ("introduces", "recaps", "discusses", "chapters")

    for n in notes:
        if n.slug in referenced:
            continue
        if n.dir in excluded_dirs_set:
            continue
        if n.kind == "narrative" and any(n.fm.get(k) for k in positions_keys):
            continue
        if n.kind == "question" and n.fm.get("explores"):
            continue
        yield Diagnostic(
            code="orphan",
            severity="warning",
            message=f"`{n.slug}` — no incoming references",
            path=n.path,
            extra={"slug": n.slug},
        )
