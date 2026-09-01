"""Find every ``[text](target)`` link in a markdown body, classify each.

Returns a list of ``(text, target_raw, line, kind)`` tuples. Code
regions (fenced blocks and inline backtick spans) are masked before
scanning so example links inside documentation are not extracted.
"""
from __future__ import annotations

import re

from pyfars.kernel.projector.parse.link_kind import classify

_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
_FENCE_RE = re.compile(r"^\s*```")


def _strip_inline_code(line: str) -> str:
    out: list[str] = []
    i = 0
    n = len(line)
    while i < n:
        if line[i] == "`":
            close = line.find("`", i + 1)
            if close == -1:
                out.append(line[i:])
                break
            out.append(" " * (close - i + 1))
            i = close + 1
        else:
            out.append(line[i])
            i += 1
    return "".join(out)


def parse(body: str) -> list[tuple[str, str, int, str]]:
    out: list[tuple[str, str, int, str]] = []
    in_fence = False
    for line_idx, line in enumerate(body.split("\n"), start=1):
        if _FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        scanline = _strip_inline_code(line)
        for m in _LINK_RE.finditer(scanline):
            target = m.group(2).strip()
            out.append((m.group(1), target, line_idx, classify(target)))
    return out
