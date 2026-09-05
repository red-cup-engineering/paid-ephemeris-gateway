"""The markdown-body projector.

Forward-only. Extracts predications from the body of a markdown
document — links to other notes, headings, and code-fence languages.
The frontmatter (everything between the opening ``---`` lines) is
left to ``markdown_frontmatter``; this projector picks up where that
one stops.

A single markdown file is naturally projected by **both** projectors
in sequence: one supplies the frontmatter cells, the other the body
cells. The compound projector composes them when needed (each
markdown file's cells are the union).

Vocabulary:

  ``body``           (file, "body", "<full body text>")  — the prose itself
  ``links-to``       (file, "links-to", "<target>")  — body link
  ``has-heading``    (file, "has-heading", "<text>")  — every # heading
  ``has-code-fence`` (file, "has-code-fence", "<language>")

``create`` is intentionally absent — the projector reads the body
but does not rewrite prose. Editorial tools modify markdown via
purpose-built editors, not by re-rendering from cells.
"""
from __future__ import annotations

import re
from typing import Iterable

from pypredcalc.predication import PredicationCell


_FM_RE = re.compile(r"\A---\n(.*?)\n?---\n?(.*)\Z", re.DOTALL)
_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
_FENCE_RE = re.compile(r"^\s*```(\S*)")
_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")


def _split_body(text: str) -> str:
    """Strip frontmatter; return the body."""
    m = _FM_RE.match(text)
    return m.group(2) if m else text


def _strip_inline_code(line: str) -> str:
    """Mask inline backtick-spans so example links don't extract as real."""
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


class MarkdownBodyProjector:
    """Markdown body → ``PredicationCell`` (extract only)."""

    name = "markdown-body"
    vocabulary: tuple[str, ...] = (
        "body",
        "links-to",
        "has-heading",
        "has-code-fence",
    )

    def extract(self, data: str, *,
                subject: str) -> Iterable[PredicationCell]:
        body = _split_body(data)
        yield PredicationCell(
            subject=subject,
            predicate="body",
            object=body,
        )
        in_fence = False
        for line in body.split("\n"):
            fence_match = _FENCE_RE.match(line)
            if fence_match:
                if not in_fence:
                    lang = fence_match.group(1).strip()
                    if lang:
                        yield PredicationCell(
                            subject=subject,
                            predicate="has-code-fence",
                            object=lang,
                        )
                in_fence = not in_fence
                continue
            if in_fence:
                continue
            heading = _HEADING_RE.match(line)
            if heading:
                yield PredicationCell(
                    subject=subject,
                    predicate="has-heading",
                    object=heading.group(2),
                )
                continue
            scanline = _strip_inline_code(line)
            for m in _LINK_RE.finditer(scanline):
                target = m.group(2).strip()
                yield PredicationCell(
                    subject=subject,
                    predicate="links-to",
                    object=target,
                )


PROJECTOR = MarkdownBodyProjector()


__all__ = ["MarkdownBodyProjector", "PROJECTOR"]
