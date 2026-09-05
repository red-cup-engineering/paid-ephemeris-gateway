"""Set a scalar frontmatter field. Overwrites any existing value."""
from __future__ import annotations


def set_field(fm: dict, key: str, value) -> dict:
    out = dict(fm)
    out[key] = value
    return out
