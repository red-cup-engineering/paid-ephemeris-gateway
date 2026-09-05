"""Rewrite a body markdown link from one slug to another in a single file.

Replaces ``[text](old_target_raw)`` with ``[text](new_target_raw)`` —
literal text replacement on the exact target path the original link
declared. Doesn't try to be clever about path-resolution: the caller
hands in the new target path string verbatim.

Returns the number of substitutions made.
"""
from __future__ import annotations

from pathlib import Path


def rewrite(path: Path, old_target_raw: str, new_target_raw: str) -> int:
    text = path.read_text(encoding="utf-8")
    needle = f"]({old_target_raw})"
    if needle not in text:
        return 0
    replaced = text.replace(needle, f"]({new_target_raw})")
    path.write_text(replaced, encoding="utf-8")
    return text.count(needle)
