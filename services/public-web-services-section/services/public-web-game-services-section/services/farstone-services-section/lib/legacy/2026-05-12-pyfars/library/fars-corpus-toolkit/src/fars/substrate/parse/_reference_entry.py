"""Shared helper: turn one citation-entry mapping into a ``Reference``.

Used by both ``parse.fm_references`` (inline ``references:`` block) and
``parse.fm_annotation`` (whole-frontmatter ``references/<key>.md`` files).
Type is inferred from ``journal:``/``booktitle:`` when not declared.
"""
from __future__ import annotations

from pathlib import Path
from typing import Mapping

from fars.convention import INTERNAL_FIELDS
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.types.reference import Reference


def entry_to_reference(entry: Mapping, *, source_path: str,
                       declared_inline: bool,
                       default_key: str | None = None,
                       ) -> tuple[Reference | None, list[Diagnostic]]:
    diags: list[Diagnostic] = []
    key = entry.get("key") or default_key
    if not key:
        diags.append(Diagnostic(
            code="missing-key",
            severity="error",
            message="reference entry has no `key` field",
            path=Path(source_path),
        ))
        return None, diags
    ref_type = entry.get("type")
    if not ref_type:
        if entry.get("journal"):
            ref_type = "article"
        elif entry.get("booktitle"):
            ref_type = "inproceedings"
        else:
            ref_type = "misc"
        diags.append(Diagnostic(
            code="inferred-type",
            severity="warning",
            message=f"no `type` field on `{key}`; inferred `{ref_type}`",
            path=Path(source_path),
        ))
    fields = {k: v for k, v in entry.items()
              if k not in ("key", "type") and k not in INTERNAL_FIELDS}
    return Reference(
        key=str(key), type=str(ref_type), fields=fields,
        source_path=source_path, declared_inline=declared_inline,
    ), diags
