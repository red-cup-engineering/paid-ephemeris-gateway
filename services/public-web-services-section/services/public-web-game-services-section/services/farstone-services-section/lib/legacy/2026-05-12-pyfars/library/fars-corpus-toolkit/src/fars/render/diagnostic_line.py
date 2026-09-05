"""Render one ``Diagnostic`` as a single markdown bullet line.

Format: ``- `path:line`: message`` when path is set, else ``- message``.
"""
from __future__ import annotations

from fars.substrate.types.diagnostic import Diagnostic


def render(d: Diagnostic) -> str:
    if d.path is None:
        return f"- {d.message}"
    loc = str(d.path)
    if d.line is not None:
        loc = f"{loc}:{d.line}"
    return f"- `{loc}`: {d.message}"
