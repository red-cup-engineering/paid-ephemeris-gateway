"""Classify a markdown link target by its surface shape."""
from __future__ import annotations

from pyfars.kernel.types.link import LinkKind


def classify(target: str) -> LinkKind:
    if target.startswith(("http://", "https://", "mailto:")):
        return "external"
    if target.startswith("#"):
        return "anchor"
    path = target.split("#", 1)[0].split("?", 1)[0]
    # ``.md`` files and bare directory links (trailing ``/``) both address
    # corpus notes — the latter resolve to that section's ``_index.md``.
    if not (path.endswith(".md") or path.endswith("/")):
        return "asset"
    if path.startswith("/"):
        return "absolute"
    return "relative"
