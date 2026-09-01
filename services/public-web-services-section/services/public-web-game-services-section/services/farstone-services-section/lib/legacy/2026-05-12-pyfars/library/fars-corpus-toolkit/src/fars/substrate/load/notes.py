"""Walk a directory tree, load every markdown file with frontmatter as a ``Flatfile``.

Returns ``(notes, diagnostics)``. Files without frontmatter are skipped
silently. Files with a frontmatter block but malformed YAML, or that fail
to read at all, become Diagnostics and are skipped. Multiple notes may
share the same slug — that's normal across the repo and is the consumer's
problem, not the loader's; build ``index.by_slug`` if you need a slug view.

``path_filter`` defaults to the standard skip set (``.git``, ``node_modules``,
vendored markers, ``README.md``); pass a custom callable to widen or narrow.
"""
from __future__ import annotations

from pathlib import Path
from typing import Callable

from fars.substrate.load._path_filter import keep as default_keep
from fars.substrate.load.note import load as load_note
from fars.substrate.parse.frontmatter import FrontmatterError
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile


def load(root: Path, *,
         path_filter: Callable[[Path], bool] = default_keep,
         ) -> tuple[list[Flatfile], list[Diagnostic]]:
    notes: list[Flatfile] = []
    diagnostics: list[Diagnostic] = []
    for p in sorted(root.rglob("*.md")):
        rel = p.relative_to(root)
        if not path_filter(rel):
            continue
        try:
            n = load_note(p, root=root)
        except FrontmatterError as e:
            diagnostics.append(Diagnostic(
                code="frontmatter-parse",
                severity="error",
                message=str(e),
                path=rel,
            ))
            continue
        except OSError as e:
            diagnostics.append(Diagnostic(
                code="file-read-error",
                severity="error",
                message=str(e),
                path=rel,
            ))
            continue
        if n is None:
            continue
        notes.append(n)
    return notes, diagnostics
