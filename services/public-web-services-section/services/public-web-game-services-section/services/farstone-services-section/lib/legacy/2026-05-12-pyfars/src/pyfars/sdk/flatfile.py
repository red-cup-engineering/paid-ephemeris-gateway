"""A single markdown note: parsed frontmatter plus body."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Flatfile:
    slug: str
    """POSIX-style root-relative slug: leading dirs and file extension stripped."""
    dir: str
    """Leading directory path within the corpus root, or ``""`` for top-level notes."""
    kind: str
    """Value of the frontmatter ``kind`` key, or derived from directory convention."""
    fm: dict
    """Parsed YAML frontmatter as a shallow dict; relation values are raw strings."""
    body: str
    """Markdown body text after the frontmatter delimiter block."""
    path: Path
    """Absolute filesystem path to the source file."""
    mtime: float
    """File modification time as a POSIX timestamp (``os.stat().st_mtime``)."""
