"""Treat a whole frontmatter dict as one citation entry — for the optional
``references/<key>.md`` annotation files. The file stem is the implicit
``key`` if frontmatter doesn't declare one. Returns ``(Reference | None,
diagnostics)``; ``None`` when the file's ``kind:`` says it isn't a reference.
"""
from __future__ import annotations

from typing import Mapping

from fars.substrate.parse._reference_entry import entry_to_reference
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.types.reference import Reference


def parse(fm: Mapping, *, source_path: str, default_key: str
          ) -> tuple[Reference | None, list[Diagnostic]]:
    if fm.get("kind") not in (None, "reference"):
        return None, []
    return entry_to_reference(
        fm, source_path=source_path, declared_inline=False,
        default_key=default_key,
    )
