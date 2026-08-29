"""Render one content note as an H4 block: ``#### Theorem: Title``.

Theorems with non-proved status pick up a ``[STATUS]`` badge. Narrative
notes don't get a kind prefix.
"""
from __future__ import annotations

from typing import Container

from fars.render._demote_headings import demote
from fars.render._kind_label import label
from fars.render._link_rewrite import rewrite
from fars.render._strip_lean import strip
from fars.render._title import title_and_body
from fars.convention import BADGE_KINDS
from fars.substrate.flatfile import Flatfile


def render(note: Flatfile, all_slugs: Container[str]) -> str:
    title, body = title_and_body(note)
    body = strip(body)
    body = demote(body, 3)
    body = rewrite(body, all_slugs)

    if note.kind == "narrative":
        heading = f"#### {title} {{#{note.slug}}}"
    else:
        kind = label(note.kind)
        badge = ""
        status = note.fm.get("status")
        if note.kind in BADGE_KINDS and status and status != "proved":
            badge = f" [{status.upper()}]"
        heading = f"#### {kind}{badge}: {title} {{#{note.slug}}}"
    return f"{heading}\n\n{body}\n"
