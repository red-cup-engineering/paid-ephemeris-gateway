"""Canonical title for a note: H1 if present, else ``fm.title``/``fm.name``, else slug.

Returns ``(title, body)`` — body has the H1 stripped if there was one.
"""
from __future__ import annotations

from fars.render._extract_title import extract
from fars.substrate.flatfile import Flatfile


def title_and_body(note: Flatfile) -> tuple[str, str]:
    title, body = extract(note.body)
    if not title:
        title = (
            note.fm.get("title")
            or note.fm.get("name")
            or note.slug
        )
    return str(title), body
