"""Rewrite ``[text](slug.md)`` links to in-doc ``[text](#slug)`` anchors.

Only rewrites links whose target slug is in ``known_slugs`` — external or
unresolvable links pass through unchanged. The optional ``#anchor``
fragment on the original link is preserved.
"""
from __future__ import annotations

import re
from typing import Container

_LINK_RE = re.compile(
    r"\[([^\]]+)\]\((?:\.\./[a-z]+/)?([A-Za-z0-9\-]+)\.md(#[A-Za-z0-9\-]+)?\)"
)


def rewrite(body: str, known_slugs: Container[str]) -> str:
    def sub(m: re.Match) -> str:
        text, target, frag = m.group(1), m.group(2), m.group(3) or ""
        if target in known_slugs:
            return f"[{text}](#{target}{frag})"
        return m.group(0)
    return _LINK_RE.sub(sub, body)
