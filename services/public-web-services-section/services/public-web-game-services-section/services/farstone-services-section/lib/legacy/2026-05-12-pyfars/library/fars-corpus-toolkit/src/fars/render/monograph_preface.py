"""Render an unpositioned overview narrative as an H2-rooted preface section."""
from __future__ import annotations

from typing import Container

from fars.render._demote_headings import demote
from fars.render._link_rewrite import rewrite
from fars.render._strip_lean import strip
from fars.render._title import title_and_body
from fars.substrate.flatfile import Flatfile


def render(narr: Flatfile, all_slugs: Container[str]) -> str:
    title, body = title_and_body(narr)
    body = strip(body)
    body = demote(body, 1)
    body = rewrite(body, all_slugs)
    return f"## {title} {{#{narr.slug}}}\n\n{body}\n"
