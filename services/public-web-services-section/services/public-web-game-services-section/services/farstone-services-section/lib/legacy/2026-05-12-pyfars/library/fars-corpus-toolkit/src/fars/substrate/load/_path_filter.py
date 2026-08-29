"""Default path filter for whole-tree walks: skip vendored / build / draft.

Returns True when the path should be loaded as a note. Callers compose
their own predicates by passing a different filter to ``load.notes.load``.

Skipped categories:

  - **Build / cache / VCS dirs** — ``.git``, ``node_modules``, ``public``,
    ``.lake``, ``.venv``, ``__pycache__``, ``build``, ``dist``.
  - **Vendored content** — paths containing ``reference-source-code/``;
    we don't hold other projects to our predicate conventions.
  - **Hugo archetypes** — every ``archetypes/`` directory contains
    template files with literal ``{{ .Date }}`` placeholders that aren't
    valid YAML. They get substituted at ``hugo new`` time, never read.
  - **Content triage** — every ``triage/`` directory holds draft material
    explicitly bucketed as not-yet-ready. Loading it imposes the
    corpus's parse expectations on intentional drafts. A rule that
    specifically wants to surface triage candidates passes its own
    ``path_filter``.
  - **README.md** — convention: never a note.
"""
from __future__ import annotations

from pathlib import Path

_SKIP_DIR_NAMES: frozenset[str] = frozenset({
    ".git", "node_modules", "public", ".lake", ".venv", "__pycache__",
    "build", "dist",
    "archetypes",
    "triage",
})

_SKIP_PATH_MARKERS: tuple[str, ...] = (
    "reference-source-code/",
)

_SKIP_FILENAMES: frozenset[str] = frozenset({"README.md"})


def keep(path: Path) -> bool:
    if path.name in _SKIP_FILENAMES:
        return False
    parts = path.parts
    if any(p in _SKIP_DIR_NAMES for p in parts):
        return False
    posix = path.as_posix()
    if any(m in posix for m in _SKIP_PATH_MARKERS):
        return False
    return True
