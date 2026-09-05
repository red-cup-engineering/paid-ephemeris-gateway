"""Render one ``Reference`` as a BibTeX entry.

Authors and editors emit as ``Last, First`` joined by ``and``.
``venue:`` (legacy) maps to ``journal`` if it looks volume-y, else ``booktitle``.
``arxiv:`` maps to ``eprint`` + ``eprinttype = {arxiv}``.
Unknown fields pass through verbatim.
"""
from __future__ import annotations

import re
from typing import Iterable

from fars.render._author_name import normalize
from fars.convention import INTERNAL_FIELDS as _INTERNAL_FIELDS
from fars.substrate.types.reference import Reference

_DIRECT_FIELDS: frozenset[str] = frozenset({
    "title", "subtitle", "shorttitle",
    "year", "month", "date",
    "journal", "booktitle", "series", "edition", "volume", "number", "pages",
    "publisher", "address", "institution", "organization", "school",
    "howpublished", "note",
    "doi", "isbn", "issn", "url", "urldate",
    "eprint", "eprinttype", "eprintclass", "archiveprefix", "primaryclass",
    "abstract", "keywords",
})

_VENUE_VOLUMEY = re.compile(r"\d")


def _join_names(names: Iterable[str]) -> str:
    return " and ".join(normalize(n) for n in names if n)


def _field(name: str, value: str) -> str:
    return f"  {name} = {{{value}}},\n"


def render(ref: Reference) -> str:
    out: list[str] = [f"@{ref.type}{{{ref.key},\n"]
    fields = ref.fields

    authors = fields.get("authors") or []
    if isinstance(authors, str):
        authors = [authors]
    if authors:
        out.append(_field("author", _join_names(authors)))

    editors = fields.get("editors") or []
    if isinstance(editors, str):
        editors = [editors]
    if editors:
        out.append(_field("editor", _join_names(editors)))

    handled = {"authors", "editors", "translators"}

    if "venue" in fields and "journal" not in fields and "booktitle" not in fields:
        v = str(fields["venue"])
        target = "journal" if _VENUE_VOLUMEY.search(v) else "booktitle"
        out.append(_field(target, v))
        handled.add("venue")

    arxiv_id = fields.get("arxiv")
    if arxiv_id and "eprint" not in fields:
        out.append(_field("eprint", str(arxiv_id).strip()))
        out.append(_field("eprinttype", "arxiv"))
        handled.add("arxiv")

    for f in _DIRECT_FIELDS:
        if f in handled:
            continue
        v = fields.get(f)
        if v is None:
            continue
        s = str(v).strip()
        if not s:
            continue
        out.append(_field(f, s))
        handled.add(f)

    translators = fields.get("translators")
    if translators:
        names = _join_names(translators if isinstance(translators, list) else [translators])
        existing = next((line for line in out if line.startswith("  note = ")), None)
        if existing:
            new_note = existing.rstrip("},\n") + f"; trans. {names}}},\n"
            out[out.index(existing)] = new_note
        else:
            out.append(_field("note", f"trans. {names}"))
        handled.add("translators")

    for f, v in fields.items():
        if f in handled or f in _DIRECT_FIELDS or f in _INTERNAL_FIELDS:
            continue
        if v is None or isinstance(v, bool):
            continue
        s = str(v).strip()
        if not s:
            continue
        out.append(_field(f, s))

    if out[-1].endswith(",\n"):
        out[-1] = out[-1][:-2] + "\n"
    out.append("}\n")
    return "".join(out)
