"""Normalize a target string to a bare slug.

Strips ``#anchor``, ``?query``, ``.md`` suffix, and any directory prefix.
Used for both markdown link targets and frontmatter relation values
(some notes write the latter as path-y references like ``../foo/bar.md``
rather than bare slugs).

Pass ``require_md=True`` when the caller only cares about ``.md`` targets
(body markdown links); the function returns None for non-``.md`` targets
in that mode.
"""
from __future__ import annotations


def slug_of(target: str, *, require_md: bool = False) -> str | None:
    s = target.split("#", 1)[0].split("?", 1)[0].strip()
    if not s:
        return None
    has_md = s.endswith(".md")
    is_dir_link = (not has_md) and s.endswith("/")
    # ``require_md`` callers want only ``.md`` body links — but a bare
    # directory link like ``skills/`` is also a body link to a note (its
    # section index), so admit it here.
    if require_md and not (has_md or is_dir_link):
        return None
    parts = [p for p in s.split("/") if p and p not in (".", "..")]
    if not parts:
        return None
    # Directory link → that section's index, same slug as ``<dir>/_index.md``.
    if is_dir_link:
        return f"{parts[-1]}-index"
    # Bare slug (no slash, no ``.md``) is a frontmatter-style reference and
    # passes through unchanged.
    if not has_md:
        return parts[-1] or None
    stem = parts[-1][:-3] if parts[-1].endswith(".md") else parts[-1]
    # Sentinel filenames whose stem is the same in every directory get a
    # ``<parent>-<sentinel>`` slug, mirroring ``kernel.load.note``.
    if stem == "_index":
        if len(parts) >= 2:
            return f"{parts[-2]}-index"
        return None
    if stem == "SKILL":
        if len(parts) >= 2:
            return f"{parts[-2]}-skill"
        return None
    # ``README.md`` is never loaded as a note (see ``_path_filter._SKIP_FILENAMES``)
    # so links to it are intentionally out-of-corpus and not broken-link material.
    if stem == "README":
        return None
    return stem or None
