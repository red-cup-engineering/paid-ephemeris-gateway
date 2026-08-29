"""Move/rename a note and rewrite every inbound reference.

Moves the file, then for every inbound:
  - **fm references**: rewrite the slug value in the citing note's
    frontmatter (using ``rewrite_fm_slug``).
  - **body links**: replace ``[text](old_target_raw)`` with
    ``[text](new_target_raw)`` in the citing note's body.

When the slug doesn't change (only the path moves), body links are
still updated because their target paths shift. When the slug changes
but the parent dir is the same, fm refs change and body links keyed by
``slug.md`` change too.

Returns a dict summarizing what was changed: ``{"fm": N, "body": N,
"moved": True}``.
"""
from __future__ import annotations

import os
import shutil
from pathlib import Path

from fars.analyze.inbound_refs import body_refs, fm_refs
from fars.operator.edit.rewrite_body_link import rewrite as rewrite_body
from fars.operator.edit.rewrite_fm_slug import rewrite as rewrite_fm
from fars.substrate.flatfile import Flatfile


def move(old_note: Flatfile, new_path: Path, *,
         root: Path,
         all_notes: list[Flatfile],
         dry_run: bool = False,
         ) -> dict:
    old_full = (root / old_note.path).resolve()
    new_full = new_path.resolve()
    new_slug = new_full.stem if new_full.name != "_index.md" else new_full.parent.name
    old_slug = old_note.slug
    summary = {"fm": 0, "body": 0, "moved": False, "old": str(old_full),
               "new": str(new_full), "old_slug": old_slug, "new_slug": new_slug}

    fm_hits = fm_refs(all_notes, old_slug)
    body_hits = body_refs(all_notes, old_slug)
    summary["fm_planned"] = len(fm_hits)
    summary["body_planned"] = len(body_hits)

    if dry_run:
        return summary

    new_full.parent.mkdir(parents=True, exist_ok=True)
    if new_full.exists():
        raise FileExistsError(f"target exists: {new_full}")
    shutil.move(str(old_full), str(new_full))
    summary["moved"] = True

    if old_slug != new_slug:
        for n, _key, _pos in fm_hits:
            citing_path = (root / n.path).resolve()
            if citing_path == old_full:
                citing_path = new_full
            summary["fm"] += rewrite_fm(citing_path, old_slug, new_slug)

    for n, link in body_hits:
        citing_path = (root / n.path).resolve()
        if citing_path == old_full:
            citing_path = new_full
        new_target = _rewrite_target_for_move(
            link.target_raw, citing_path, old_full, new_full,
        )
        summary["body"] += rewrite_body(citing_path, link.target_raw, new_target)

    return summary


def _rewrite_target_for_move(target_raw: str, citing_path: Path,
                             old_full: Path, new_full: Path) -> str:
    """Build the post-move target for a body link, given the citing file's
    location and the moved file's old/new full paths.

    Strategy: compute the new relative path from the citing file's
    directory to ``new_full``, preserving any ``#anchor`` fragment.
    """
    fragment = ""
    body = target_raw
    if "#" in target_raw:
        body, fragment = target_raw.split("#", 1)
        fragment = "#" + fragment

    new_rel = os.path.relpath(new_full, citing_path.parent).replace(os.sep, "/")
    return new_rel + fragment
