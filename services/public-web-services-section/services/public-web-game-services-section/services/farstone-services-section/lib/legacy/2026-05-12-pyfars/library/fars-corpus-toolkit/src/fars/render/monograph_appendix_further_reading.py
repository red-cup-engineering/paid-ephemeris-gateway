"""Render the further-reading appendix: reference notes not directly cited.

Cited works appear in the citeproc-generated References section; this
appendix surfaces bibliographic background that situates the program but
isn't pinned to a specific claim.
"""
from __future__ import annotations

from typing import Container

from fars.substrate.parse.citations import parse as parse_citations
from fars.render._demote_headings import demote
from fars.render._extract_title import extract
from fars.render._link_rewrite import rewrite
from fars.render._strip_lean import strip
from fars.substrate.flatfile import Flatfile


def render(notes: list[Flatfile], all_slugs: Container[str]) -> str:
    cited: set[str] = set()
    for n in notes:
        if n.dir == "references":
            continue
        for c in parse_citations(n.body):
            cited.add(c.key)
    refs = sorted(
        (n for n in notes
         if n.dir == "references" and n.slug not in cited),
        key=lambda n: n.slug,
    )
    if not refs:
        return ""
    parts = ["### Further reading {#appendix-further-reading}", ""]
    parts.append(
        "Works in the program's intellectual environment that situate the "
        "machinery but aren't directly cited on any specific claim. Each "
        "entry summarises the work and its relevance.\n"
    )
    for n in refs:
        title, body = extract(n.body)
        body = strip(body)
        body = demote(body, 3)
        body = rewrite(body, all_slugs)
        authors = n.fm.get("authors") or []
        year = n.fm.get("year") or ""
        ref_title = n.fm.get("title") or title or n.slug
        if isinstance(authors, list) and authors:
            author_str = ", ".join(authors)
            display = f"{author_str} ({year}) — *{ref_title}*" if year else f"{author_str} — *{ref_title}*"
        else:
            display = title or n.slug
        parts.append(f"#### {display} {{#{n.slug}}}")
        parts.append("")
        parts.append(body)
        parts.append("")
    return "\n".join(parts)
