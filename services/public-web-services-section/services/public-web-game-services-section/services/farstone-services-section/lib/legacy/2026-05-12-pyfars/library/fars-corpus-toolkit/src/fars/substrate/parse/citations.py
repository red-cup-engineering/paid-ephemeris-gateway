"""Find pandoc-style ``[@key]`` citations in a markdown body."""
from __future__ import annotations

import re

from fars.substrate.types.citekey import CiteKey

_CITE_RE = re.compile(r"\[@([a-z][a-z0-9\-]*\d{4}[a-z]?)\]")


def parse(body: str) -> list[CiteKey]:
    out: list[CiteKey] = []
    for line_idx, line in enumerate(body.split("\n"), start=1):
        for m in _CITE_RE.finditer(line):
            out.append(CiteKey(key=m.group(1), line=line_idx))
    return out
