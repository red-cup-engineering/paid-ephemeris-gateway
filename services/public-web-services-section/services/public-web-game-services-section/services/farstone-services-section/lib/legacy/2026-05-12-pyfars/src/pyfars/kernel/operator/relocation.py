"""Relocation operators — move/rename without changing cell content.

Restructure the system without inserting or retracting cells:
moving a flatfile, renaming a frontmatter key, rewriting body links.
Each function emits one ``Witness`` for its primary target;
multi-file rewrites are recorded in that witness's ``details``.
"""
from __future__ import annotations

from pathlib import Path

from pyfars.kernel.operator.edit.rename_fm_key import rename as rename_key
from pyfars.kernel.operator.edit.rewrite_body_link import rewrite as rewrite_body
from pyfars.kernel.operator.edit.rewrite_fm import apply as apply_fm
from pyfars.kernel.witness import Witness, hash_path, make_witness
from pyfars.kernel.projector.parse.frontmatter import parse as parse_fm


def move_flatfile(
    old_path: Path,
    new_path: Path,
    *,
    agent: str | None = None,
) -> Witness:
    """Move a flatfile from ``old_path`` to ``new_path``.

    Bare relocation only. Inbound-reference rewriting is the caller's
    job: query the system for ``(_, links-to, <old-slug>)`` and
    other relation predicates pointing at the moved subject, then
    apply :func:`rewrite_body_link` and :func:`rename_fm_key` per cite.
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
