"""Body links inside *non-informational* sections of a note.

A note's body usually includes informational sections like "Position in",
"Connections to", "Open questions", "Future directions" — links there
are forward pointers or commentary, not load-bearing dependencies. This
function returns only the slugs referenced inside the *substantive*
sections (everything before the first informational heading, plus any
non-informational H2 sections in between).
"""
from __future__ import annotations

import re

from fars.substrate.parse._slug_target import slug_of

_SECTION_RE = re.compile(r"^(#{2,6})\s+(.+?)(?:\s*\{#[^}]+\})?\s*$", re.MULTILINE)
_LINK_RE = re.compile(
    r"\[([^\]]+)\]\((?:\.\./[a-z]+/)?([A-Za-z0-9\-]+)\.md(#[A-Za-z0-9\-]+)?\)"
)

_INFORMATIONAL_HEADING_PATTERNS = [
    r"^position in\b",
    r"^connection(s)? to\b",
    r"^connection(s)? with\b",
    r"^connect(s|ion) to\b",
    r"^comparison with\b",
    r"^comparison to\b",
    r"^reading\b",
    r"^what this gives\b",
    r"^what this proves\b",
    r"^what is established\b",
    r"^what is settled\b",
    r"^what is proved\b",
    r"^what.s actually proved\b",
    r"^what.s open\b",
    r"^what.s still open\b",
    r"^what.s missing\b",
    r"^what.s left\b",
    r"^what is missing\b",
    r"^open question(s)?\b",
    r"^open work\b",
    r"^open(s)? to\b",
    r"^status remarks\b",
    r"^status by regime\b",
    r"^future direction(s)?\b",
    r"^downstream consequence(s)?\b",
    r"^downstream(\s|$)",
    r"^remark(s)?(\s|$)",
    r"^conjecture(s)?(\s|$)",
    r"^open conjecture(s)?\b",
    r"^higher.degree\b",
    r"^higher.cell\b",
    r"^higher dimension(s)?\b",
    r"^cosheaf-side\b",
    r"^cosheaf side\b",
    r"^refined classification\b",
    r"^refinement under\b",
    r"^why\b",
    r"^non.degeneracy criterion\b",
    r"^application(s)?\b",
    r"^specialization to\b",
    r"^specialisation to\b",
    r"^when\b",
    r"^a concrete positive case\b",
    r"^side observation\b",
    r"^cardinality boundary\b",
    r"^the boundary at\b",
    r"^see also\b",
    r"^further reading\b",
]
_INFO_RE = re.compile("|".join(_INFORMATIONAL_HEADING_PATTERNS), re.IGNORECASE)


def _split_into_sections(body: str) -> list[tuple[str, str]]:
    sections: list[tuple[str, str]] = []
    cursor = 0
    last_heading = ""
    for m in _SECTION_RE.finditer(body):
        if len(m.group(1)) != 2:
            continue
        sections.append((last_heading, body[cursor:m.start()]))
        last_heading = m.group(2).strip()
        cursor = m.end()
    sections.append((last_heading, body[cursor:]))
    return sections


def _is_informational(heading: str) -> bool:
    if not heading:
        return False
    return bool(_INFO_RE.match(heading.strip()))


def score(body: str, *, self_slug: str | None = None) -> set[str]:
    out: set[str] = set()
    for heading, content in _split_into_sections(body):
        if _is_informational(heading):
            continue
        for m in _LINK_RE.finditer(content):
            slug = m.group(2)
            if slug != self_slug:
                out.add(slug)
    return out


def all_body_link_slugs(body: str, *, self_slug: str | None = None) -> set[str]:
    """Variant: every body link's slug, ignoring section filters."""
    out: set[str] = set()
    for m in _LINK_RE.finditer(body):
        slug = m.group(2)
        if slug != self_slug:
            out.add(slug)
    return out
