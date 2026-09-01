"""Find every ``[text](target)`` link in a markdown body and classify it.

Returns ``Link`` records with kind set; ``target_resolved`` is left None —
resolution against the filesystem is a separate step (see ``index.edges``
or the consumer-specific resolver).
"""
from __future__ import annotations

import re

from fars.substrate.parse.link_kind import classify
from fars.substrate.types.link import Link

_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def parse(body: str) -> list[Link]:
    out: list[Link] = []
    for line_idx, line in enumerate(body.split("\n"), start=1):
        for m in _LINK_RE.finditer(line):
            target = m.group(2).strip()
            out.append(Link(
                text=m.group(1),
                target_raw=target,
                line=line_idx,
                kind=classify(target),
            ))
    return out
