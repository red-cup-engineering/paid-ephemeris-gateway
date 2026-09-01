"""Relocation operators — move/rename without changing predication content.

Relocation is the FARS-side category for operators that *restructure*
the substrate without inserting or retracting predications: moving a
flatfile (with inbound-reference rewriting), renaming a frontmatter
key, rewriting body links.

Each function emits a ``Witness`` for its primary target. Operations
that rewrite inbound references (``move_flatfile``) emit ONE witness
for the move itself; the rewrite-summary is recorded in the witness's
``details`` rather than as separate witnesses (the witness chain stays
auditable and the multi-file rewrite is grouped as one logical
operation).
"""
from __future__ import annotations

from pathlib import Path

from fars.operator.edit.rename_fm_key import rename as rename_key
from fars.operator.edit.rewrite_body_link import rewrite as rewrite_body
from fars.operator.edit.rewrite_fm import apply as apply_fm
from fars.operator.witness import Witness, hash_path, make_witness
from fars.substrate.parse.frontmatter import parse as parse_fm


def move_flatfile(
    old_path: Path,
    new_path: Path,
    *,
    agent: str | None = None,
) -> Witness:
    """Move a flatfile from ``old_path`` to ``new_path``.

    Inbound-reference rewriting (which other flatfiles cite this one
    under what slug) is the responsibility of the higher-level
    ``operator.edit.move_note.move`` — this wrapper handles the bare
    file relocation. Use ``move_note.move`` directly when you need
    inbound rewrites and capture multiple witnesses if desired.
    """
    if not old_path.exists():
        raise FileNotFoundError(f"missing source: {old_path}")
    if new_path.exists():
        raise FileExistsError(f"destination exists: {new_path}")
    before = hash_path(old_path)
    new_path.parent.mkdir(parents=True, exist_ok=True)
    old_path.rename(new_path)
    after = hash_path(new_path)
    return make_witness(
        operator="move_flatfile",
        target=new_path,
        before_hash=before,
        after_hash=after,
        details={"from": str(old_path), "to": str(new_path)},
        agent=agent,
    )


def rename_fm_key(
    path: Path,
    old_key: str,
    new_key: str,
    *,
    agent: str | None = None,
) -> Witness:
    """Rename frontmatter ``old_key`` → ``new_key`` on ``path``."""
    before = hash_path(path)
    text = path.read_text(encoding="utf-8")
    fm, _body = parse_fm(text)
    if fm is None:
        fm = {}
    new_fm = rename_key(fm, old_key, new_key)
    apply_fm(path, new_fm)
    after = hash_path(path)
    return make_witness(
        operator="rename_fm_key",
        target=path,
        before_hash=before,
        after_hash=after,
        details={"old_key": old_key, "new_key": new_key},
        agent=agent,
    )


def rewrite_body_link(
    path: Path,
    old_target: str,
    new_target: str,
    *,
    agent: str | None = None,
) -> Witness:
    """Rewrite markdown body links from ``old_target`` to ``new_target``."""
    before = hash_path(path)
    count = rewrite_body(path, old_target, new_target)
    after = hash_path(path)
    return make_witness(
        operator="rewrite_body_link",
        target=path,
        before_hash=before,
        after_hash=after,
        details={"old": old_target, "new": new_target, "count": count},
        agent=agent,
    )
