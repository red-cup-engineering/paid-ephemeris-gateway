"""Insertion operators — add a predication to the system.

Insertion is the FARS-side category for operators that *add* content
without removing existing content. Each function here:
  1. Reads the target file and computes its before-hash.
  2. Applies a pure transformation (using the underlying edit/*
     primitives).
  3. Writes the result back and computes its after-hash.
  4. Returns a ``Witness`` capturing the change.

The pure transformations are kept in ``pyfars.kernel.operator.edit.*`` so they
remain unit-testable without I/O. This module composes them with
system I/O and witness emission.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from pyfars.kernel.operator.edit.fm_add import add_item
from pyfars.kernel.operator.edit.fm_set import set_field
from pyfars.kernel.operator.edit.rewrite_fm import apply as apply_fm
from pyfars.kernel.witness import Witness, hash_path, make_witness
from pyfars.kernel.projector.parse.frontmatter import parse as parse_fm


def insert_fm_item(
    path: Path,
    key: str,
    item: Any,
    *,
    agent: str | None = None,
) -> Witness:
    """Append ``item`` to the list-valued frontmatter ``key`` of ``path``.

    Idempotent: if ``item`` is already present, the file is unchanged
    but a witness is still emitted (with ``after_hash == before_hash``).
    """
    before = hash_path(path)
    text = path.read_text(encoding="utf-8")
    fm, _body = parse_fm(text)
    if fm is None:
        fm = {}
    new_fm = add_item(fm, key, item)
    apply_fm(path, new_fm)
    after = hash_path(path)
    return make_witness(
        operator="insert_fm_item",
        target=path,
        before_hash=before,
        after_hash=after,
        details={"key": key, "item": item},
        agent=agent,
    )


def set_fm_field(
    path: Path,
    key: str,
    value: Any,
    *,
    agent: str | None = None,
) -> Witness:
    """Set frontmatter ``key`` to ``value`` on ``path``."""
    before = hash_path(path)
    text = path.read_text(encoding="utf-8")
    fm, _body = parse_fm(text)
    if fm is None:
        fm = {}
    new_fm = set_field(fm, key, value)
    apply_fm(path, new_fm)
    after = hash_path(path)
    return make_witness(
        operator="set_fm_field",
        target=path,
        before_hash=before,
        after_hash=after,
        details={"key": key, "value": value},
        agent=agent,
    )


def insert_flatfile(
    path: Path,
    fm: dict,
    body: str,
    *,
    agent: str | None = None,
) -> Witness:
    """Create a new flatfile at ``path`` with ``fm`` and ``body``.

    The file must not already exist. Caller can ``path.unlink()`` first
    or use ``set_fm_field`` / ``insert_fm_item`` instead.
    """
    if path.exists():
        raise FileExistsError(f"flatfile already exists: {path}")
    before = None
    path.parent.mkdir(parents=True, exist_ok=True)
    from pyfars.kernel.projector.parse.frontmatter import dump
    fm_yaml = dump(fm).rstrip() + "\n"
    path.write_text(f"---\n{fm_yaml}---\n{body or ''}", encoding="utf-8")
    after = hash_path(path)
    return make_witness(
        operator="insert_flatfile",
        target=path,
        before_hash=before,
        after_hash=after,
        details={"kind": fm.get("kind", "")},
        agent=agent,
    )
