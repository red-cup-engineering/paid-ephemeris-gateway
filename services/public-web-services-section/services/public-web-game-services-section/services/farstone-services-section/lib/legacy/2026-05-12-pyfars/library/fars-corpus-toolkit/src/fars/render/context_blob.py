"""Render a list of Notes as one concatenated context blob for LLM consumption.

Each note gets an H2 header with slug + kind + path; bodies are emitted
verbatim. A trailing summary lists the slugs visited and the total chars,
which is the budget signal an agent can use to gate its prompt.
"""
from __future__ import annotations

from fars.substrate.flatfile import Flatfile


def render(seed: str, notes: list[Flatfile], *,
           budget_chars: int) -> str:
    out: list[str] = [
        f"# Context for `{seed}`",
        "",
        f"{len(notes)} notes, " + (f"{sum(len(n.body) for n in notes):,} body chars "
                                   f"(budget {budget_chars:,})"),
        "",
    ]
    for n in notes:
        out.append(f"## `{n.slug}` ({n.kind})")
        out.append(f"*Path: `{n.path}`*")
        out.append("")
        body = n.body.strip()
        out.append(body if body else "*(empty body)*")
        out.append("")
        out.append("---")
        out.append("")
    out.append("### Visited slugs")
    out.append("")
    out.append(", ".join(f"`{n.slug}`" for n in notes))
    out.append("")
    return "\n".join(out)
