"""Retraction operators — remove a predication from the system.

Retraction is the FARS-side category for operators that *remove*
content. Each function:
  1. Reads the target and computes its before-hash.
  2. Applies a pure transformation (using ``pyfars.kernel.operator.edit.fm_rm``
     and friends).
  3. Writes back (or deletes) and computes the after-hash.
  4. Returns a ``Witness``.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from pyfars.kernel.operator.edit.fm_rm import remove
from pyfars.kernel.operator.edit.rewrite_fm import apply as apply_fm
from pyfars.kernel.witness import Witness, hash_path, make_witness
from pyfars.kernel.projector.parse.frontmatter import parse as parse_fm


def remove_fm_item(
    path: Path,
    key: str,
    item: Any,
    *,
    agent: str | None = None,
) -> Witness:
    """Remove ``item`` from the list-valued frontmatter ``key`` of ``path``.

    No-op if the key is absent or the item is not in the list (witness
    still emitted with after_hash == before_hash).
    """
    before = hash_path(path)
    text = path.read_text(encoding="utf-8")
    fm, _body = parse_fm(text)
    if fm is None:
        fm = {}
    new_fm = remove(fm, key, item)
    apply_fm(path, new_fm)
    after = hash_path(path)
    return make_witness(
        operator="remove_fm_item",
        target=path,
        before_hash=before,
        after_hash=after,
        details={"key": key, "item": item},
        agent=agent,
    )


def remove_fm_key(
    path: Path,
    key: str,
    *,
    agent: str | None = None,
) -> Witness:
    """Remove the frontmatter ``key`` (and its value) entirely."""
    before = hash_path(path)
    text = path.read_text(encoding="utf-8")
    fm, _body = parse_fm(text)
    if fm is None:
        fm = {}
    new_fm = remove(fm, key)
    apply_fm(path, new_fm)
    after = hash_path(path)
    return make_witness(
        operator="remove_fm_key",
        target=path,
        before_hash=before,
        after_hash=after,
        details={"key": key},
        agent=agent,
    )


def delete_flatfile(
    path: Path,
    *,
    agent: str | None = None,
) -> Witness:
    """Delete the flatfile at ``path``."""
    before = hash_path(path)
    path.unlink()
    return make_witness(
        operator="delete_flatfile",
        target=path,
        before_hash=before,
        after_hash=None,
        details={},
        agent=agent,
    )
