"""Suggest lowercasing frontmatter keys that have any uppercase letters.

Convention in this corpus is lowercase + hyphen-separated keys
(``date-created``, ``depends-on``). Camel-case or Title-Case keys drift
in over time. Auto-fixable: rename via ``edit.rename_fm_key``.
"""
from __future__ import annotations

from pathlib import Path

from fars.operator.edit.rename_fm_key import rename
from fars.operator.edit.rewrite_fm import apply as rewrite_fm
from fars.substrate.flatfile import Flatfile
from fars.substrate.types.suggestion import Suggestion


def find(notes: list[Flatfile], *, root: Path) -> list[Suggestion]:
    out: list[Suggestion] = []
    for n in notes:
        for k in n.fm:
            if k.lower() != k:
                full_path = root / n.path
                out.append(_suggestion(n, k, full_path))
    return out


def _suggestion(note: Flatfile, bad_key: str, full_path: Path) -> Suggestion:
    new_key = bad_key.lower()

    def fix() -> bool:
        from fars.substrate.parse.frontmatter import parse as parse_fm
        text = full_path.read_text(encoding="utf-8")
        fm, _ = parse_fm(text)
        new_fm = rename(fm or {}, bad_key, new_key)
        rewrite_fm(full_path, new_fm)
        return True

    return Suggestion(
        code="fm-key-casing",
        severity="info",
        message=f"frontmatter key `{bad_key}` should be `{new_key}`",
        path=note.path,
        apply=fix,
        extra={"slug": note.slug, "old": bad_key, "new": new_key},
    )
