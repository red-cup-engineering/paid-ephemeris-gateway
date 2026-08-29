"""Suggest adding a trailing newline to files that lack one."""
from __future__ import annotations

from pathlib import Path

from fars.substrate.flatfile import Flatfile
from fars.substrate.types.suggestion import Suggestion


def find(notes: list[Flatfile], *, root: Path) -> list[Suggestion]:
    out: list[Suggestion] = []
    for n in notes:
        full = root / n.path
        try:
            text = full.read_text(encoding="utf-8")
        except OSError:
            continue
        if text and not text.endswith("\n"):
            out.append(_suggestion(n, full))
    return out


def _suggestion(note: Flatfile, full_path: Path) -> Suggestion:
    def fix() -> bool:
        text = full_path.read_text(encoding="utf-8")
        if text.endswith("\n"):
            return False
        full_path.write_text(text + "\n", encoding="utf-8")
        return True

    return Suggestion(
        code="missing-trailing-newline",
        severity="info",
        message="file does not end with a newline",
        path=note.path,
        apply=fix,
        extra={"slug": note.slug},
    )
