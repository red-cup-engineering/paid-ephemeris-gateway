"""Concepts whose body has many sections AND many declared dependencies —
both signals together suggest the body is doing structurally distinct work.
"""
from __future__ import annotations

import re

from fars.substrate.flatfile import Flatfile

_SECTION_RE = re.compile(r"^##+ \S", re.MULTILINE)


def find(notes: list[Flatfile], *,
         min_sections: int = 4,
         min_deps: int = 4,
         ) -> list[dict]:
    out: list[dict] = []
    for n in notes:
        if n.kind != "concept":
            continue
        sections = _SECTION_RE.findall(n.body)
        deps = n.fm.get("depends-on") or []
        if len(sections) >= min_sections and len(deps) >= min_deps:
            out.append({"slug": n.slug, "n_sections": len(sections), "n_deps": len(deps)})
    out.sort(key=lambda c: (-c["n_sections"], c["slug"]))
    return out
