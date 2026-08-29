"""Classify a markdown link target by its surface shape."""
from __future__ import annotations

from fars.substrate.types.link import LinkKind


def classify(target: str) -> LinkKind:
    if target.startswith(("http://", "https://", "mailto:")):
        return "external"
    if target.startswith("#"):
        return "anchor"
    path = target.split("#", 1)[0].split("?", 1)[0]
    if not path.endswith(".md"):
        return "asset"
    if path.startswith("/"):
        return "absolute"
    return "relative"
