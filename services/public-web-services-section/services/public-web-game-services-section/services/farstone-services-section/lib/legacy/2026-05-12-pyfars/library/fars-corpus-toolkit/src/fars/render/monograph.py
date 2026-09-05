"""Compose a corpus into a single markdown monograph.

Two modes, auto-selected:

  - **Narrative mode** when at least one note has ``kind: narrative`` and
    a ``chapters:`` declaration. Walks parts → chapters → blocks per
    the existing research-program convention.
  - **Flat mode** otherwise. Topo-sorts every note by ``depends-on`` and
    emits each as a block. Suitable for any subtree without explicit
    narrative structure (the algebra-monograph case).

A YAML preamble carries title/subtitle/bibliography metadata for pandoc.
"""
from __future__ import annotations

from typing import Iterable

from fars.operator.traversal.topo_sort import sort as topo_sort
from fars.substrate.index.by_slug import build as build_by_slug
from fars.substrate.index.depends_on import build as build_depends_on
from fars.substrate.index.edges import build as build_edges
from fars.render.monograph_appendix_further_reading import render as render_further_reading
from fars.render.monograph_appendix_questions import render as render_questions
from fars.render.monograph_block import render as render_block
from fars.render.monograph_chapter import render as render_chapter
from fars.render.monograph_part import render as render_part
from fars.render.monograph_preface import render as render_preface
from fars.substrate.flatfile import Flatfile


def _yaml_preamble(title: str | None, subtitle: str | None,
                   bib_relpath: str | None) -> list[str]:
    out = ["---"]
    if title:
        out.append(f"title: {title}")
    if subtitle:
        out.append(f"subtitle: {subtitle}")
    if bib_relpath:
        out += [
            f"bibliography: {bib_relpath}",
            "link-citations: true",
            "reference-section-title: References",
            "reference-section-level: 3",
        ]
    out += ["---", ""]
    return out


def _has_narrative_structure(notes: Iterable[Flatfile]) -> bool:
    return any(n.kind == "narrative" and n.fm.get("chapters") for n in notes)


def render(notes: list[Flatfile], *,
           title: str | None = None,
           subtitle: str | None = None,
           bib_relpath: str | None = None,
           ) -> str:
    by_slug = build_by_slug(notes)
    all_slugs: set[str] = set(by_slug.keys())

    parts = _yaml_preamble(title, subtitle, bib_relpath)

    if _has_narrative_structure(notes):
        parts.extend(_render_narrative(notes, by_slug, all_slugs))
    else:
        parts.extend(_render_flat(notes, all_slugs))

    appendix_q = render_questions(notes, all_slugs)
    appendix_fr = render_further_reading(notes, all_slugs)
    if appendix_q or appendix_fr:
        parts.append("## Supplements {#supplements}")
        parts.append("")
    if appendix_q:
        parts.append(appendix_q)
        parts.append("")
    if appendix_fr:
        parts.append(appendix_fr)
        parts.append("")

    return "\n".join(parts)


def _render_flat(notes: list[Flatfile], all_slugs: set[str]) -> list[str]:
    """Topo-sorted flat monograph: every non-question, non-reference note as a block."""
    edges = build_edges(notes, sources=("fm",))
    deps = build_depends_on(edges)
    by_slug = {n.slug: n for n in notes}
    eligible = [n.slug for n in notes
                if n.kind not in ("question", "reference")
                and n.path.name != "_index.md"]
    order = topo_sort(eligible, deps)
    out: list[str] = []
    for slug in order:
        if slug in by_slug:
            out.append(render_block(by_slug[slug], all_slugs))
            out.append("")
    return out


def _render_narrative(notes: list[Flatfile],
                      by_slug: dict[str, list[Flatfile]],
                      all_slugs: set[str]) -> list[str]:
    """Walk parts → chapters → blocks for the research-program shape."""
    notes_by_slug = {n.slug: n for n in notes}

    parts_narratives: list[Flatfile] = []
    chapter_slugs: set[str] = set()
    for n in notes:
        if n.kind == "narrative" and n.fm.get("chapters"):
            parts_narratives.append(n)
            for ch in n.fm.get("chapters") or []:
                if isinstance(ch, str):
                    chapter_slugs.add(ch)

    import re
    _PART_RE = re.compile(r"part-(\d+)")

    def _part_num(s: str) -> int:
        m = _PART_RE.search(s)
        return int(m.group(1)) if m else 999

    parts_narratives.sort(key=lambda n: _part_num(n.slug))

    used_slugs: set[str] = set()
    for pn in parts_narratives:
        used_slugs.add(pn.slug)
        for ch in pn.fm.get("chapters") or []:
            used_slugs.add(ch)

    out: list[str] = []
    for n in notes:
        if n.kind == "narrative" and not n.fm.get("chapters") and n.slug not in chapter_slugs:
            out.append(render_preface(n, all_slugs))
            out.append("")
            used_slugs.add(n.slug)

    for pn in parts_narratives:
        out.append(render_part(pn, all_slugs))
        out.append("")
        for ch_slug in pn.fm.get("chapters") or []:
            ch = notes_by_slug.get(ch_slug)
            if ch is None:
                continue
            out.append(render_chapter(ch, all_slugs))
            out.append("")

    for n in notes:
        if n.slug in used_slugs:
            continue
        if n.kind in ("question", "reference"):
            continue
        if n.path.name == "_index.md":
            continue
        out.append(render_block(n, all_slugs))
        out.append("")
    return out
