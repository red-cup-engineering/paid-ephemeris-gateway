"""Read one ``.md`` file as a ``Flatfile``.

Returns ``None`` if the file has no frontmatter — that's a non-note markdown
file, silently skipped. Raises ``FrontmatterError`` on malformed YAML so the
caller can decide whether to skip or surface as a Diagnostic.

The note's ``slug`` is the file stem, except ``_index.md`` files get the
parent directory name as their slug (Hugo convention). ``kind`` falls back
to the parent directory name singularized when frontmatter doesn't declare it.
"""
from __future__ import annotations

from pathlib import Path

from fars.substrate.load._singularize import singularize
from fars.substrate.parse.frontmatter import parse as parse_frontmatter
from fars.substrate.flatfile import Flatfile


def load(path: Path, *, root: Path) -> Flatfile | None:
    text = path.read_text(encoding="utf-8", errors="replace")
    fm, body = parse_frontmatter(text)
    if fm is None:
        return None
    parent = path.parent.name
    slug = parent if path.name == "_index.md" else path.stem
    kind = fm.get("kind") or singularize(parent)
    return Flatfile(
        slug=slug,
        dir=parent,
        kind=str(kind),
        fm=fm,
        body=body,
        path=path.relative_to(root),
        mtime=path.stat().st_mtime,
    )
