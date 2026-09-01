"""Suggest deleting empty ``description:`` frontmatter fields.

A ``description:`` set to ``""``, ``None``, or whitespace-only is noise —
it signals "I tried to write one and gave up." Auto-fixable: drop the key.
"""
from __future__ import annotations

from pathlib import Path

from fars.operator.edit.fm_rm import remove
from fars.operator.edit.rewrite_fm import apply as rewrite_fm
from fars.substrate.flatfile import Flatfile
from fars.substrate.types.suggestion import Suggestion


def find(notes: list[Flatfile], *, root: Path) -> list[Suggestion]:
    out: list[Suggestion] = []
    for n in notes:
        if "description" not in n.fm:
            continue
        v = n.fm["description"]
        if v is None or (isinstance(v, str) and not v.strip()):
            full_path = root / n.path
            out.append(_suggestion(n, full_path))
    return out


def _suggestion(note: Flatfile, full_path: Path) -> Suggestion:
    def fix() -> bool:
        from fars.substrate.parse.frontmatter import parse as parse_fm
        text = full_path.read_text(encoding="utf-8")
        fm, _ = parse_fm(text)
        new_fm = remove(fm or {}, "description")
        rewrite_fm(full_path, new_fm)
        return True

    return Suggestion(
        code="empty-description",
        severity="info",
        message="`description:` is empty; remove the key",
        path=note.path,
        apply=fix,
        extra={"slug": note.slug},
    )
