"""Serialize a frontmatter dict back to YAML with our conventions.

Block style for mappings and sequences (no flow ``[a, b]`` lists),
no aliases / anchors, no sort_keys (preserves declaration order),
default UTF-8. Suitable for round-tripping our notes' frontmatter.
"""
from __future__ import annotations

import yaml


def dump(fm: dict) -> str:
    return yaml.safe_dump(
        fm,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False,
        width=10_000,
    )
