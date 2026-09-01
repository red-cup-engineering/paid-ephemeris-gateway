"""Body markdown links to ``.md`` targets that don't resolve to a known slug.

Each broken link becomes one ``broken-link`` Diagnostic carrying the
source path, line number, and the target slug that didn't match.
"""
from __future__ import annotations

from typing import Container, Iterator

from fars.substrate.parse._slug_target import slug_of
from fars.substrate.parse.markdown_links import parse as parse_links
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile


def check(notes: list[Flatfile], known_slugs: Container[str]) -> Iterator[Diagnostic]:
    for n in notes:
        for link in parse_links(n.body):
            if link.kind not in ("relative", "absolute"):
                continue
            tgt = slug_of(link.target_raw, require_md=True)
            if tgt is None or tgt in known_slugs:
                continue
            yield Diagnostic(
                code="broken-link",
                severity="error",
                message=f"references missing slug `{tgt}`",
                path=n.path,
                line=link.line,
                extra={"slug": n.slug, "target": tgt, "target_raw": link.target_raw},
            )
