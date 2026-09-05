"""Split markdown text into ``(frontmatter dict | None, body string)``.

Returns ``(None, text)`` when the file has no frontmatter block — that's a
"this isn't a note, skip" signal, not an error. Raises ``FrontmatterError``
on a malformed YAML block (the block exists but won't parse) — that *is*
an error worth surfacing.
"""
from __future__ import annotations

import re

import yaml

_FM_RE = re.compile(r"\A---\n(.*?)\n?---\n?(.*)\Z", re.DOTALL)


class FrontmatterError(Exception):
    pass


def parse(text: str) -> tuple[dict | None, str]:
    m = _FM_RE.match(text)
    if not m:
        return None, text
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as e:
        raise FrontmatterError(f"YAML error: {e}") from e
    if not isinstance(fm, dict):
        raise FrontmatterError("frontmatter must be a YAML mapping")
    return fm, m.group(2)
