"""YAML frontmatter — split markdown into ``(fm, body)`` and back.

``parse(text)`` splits a markdown document into ``(fm | None, body)``;
``None`` means no frontmatter block (skip-this-file signal). A present-
but-malformed block raises :class:`FrontmatterError`.

``dump(fm)`` is the inverse: render a frontmatter dict to YAML using
the same conventions the markdown_frontmatter projector uses
(``sort_keys=False``, block style).
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


def dump(fm: dict) -> str:
    return yaml.safe_dump(fm, sort_keys=False, default_flow_style=False)
