"""Suggest adding `depends-on` entries for body links that resolve to known slugs.

If a note's body links to a known corpus slug but that slug isn't in the
note's ``depends-on``, propose adding it. Auto-fixable: the apply
callable extends ``depends-on`` with the missing slug.
"""
from __future__ import annotations

from pathlib import Path
from typing import Mapping

from fars.operator.edit.fm_add import add_item
from fars.operator.edit.rewrite_fm import apply as rewrite_fm
from fars.substrate.parse._slug_target import slug_of
from fars.substrate.parse.markdown_links import parse as parse_links
from fars.substrate.flatfile import Flatfile
from fars.substrate.types.suggestion import Suggestion


def find(notes: list[Flatfile], *,
         by_slug: Mapping[str, list[Flatfile]],
         root: Path) -> list[Suggestion]:
    out: list[Suggestion] = []
    for n in notes:
        deps = set(n.fm.get("depends-on") or [])
        cited: set[str] = set()
        for link in parse_links(n.body):
            if link.kind not in ("relative", "absolute"):
                continue
            slug = slug_of(link.target_raw, require_md=True)
            if slug is None or slug not in by_slug or slug == n.slug:
                continue
            cited.add(slug)
        missing = sorted(cited - deps)
        if not missing:
            continue
        full_path = root / n.path
        for slug in missing:
            out.append(_suggestion(n, slug, full_path))
    return out


def _suggestion(note: Flatfile, missing_slug: str, full_path: Path) -> Suggestion:
    def fix() -> bool:
        from fars.substrate.parse.frontmatter import parse as parse_fm
        text = full_path.read_text(encoding="utf-8")
        fm, _ = parse_fm(text)
        new_fm = add_item(fm or {}, "depends-on", missing_slug)
        rewrite_fm(full_path, new_fm)
        return True

    return Suggestion(
        code="depends-on-missing-body-cite",
        severity="warning",
        message=f"body cites `{missing_slug}` but it's not in `depends-on`",
        path=note.path,
        apply=fix,
        extra={"slug": note.slug, "missing": missing_slug},
    )
