"""Render a topo-sorted reading list for a slug's ancestors."""
from __future__ import annotations

from fars.substrate.flatfile import Flatfile


def render(seed: str, notes: list[Flatfile]) -> str:
    out: list[str] = [f"# Ramp-up reading order for `{seed}`", ""]
    out.append(f"{len(notes)} notes in topological order (dependencies first).")
    out.append("")
    for i, n in enumerate(notes, 1):
        title = n.fm.get("title") or n.fm.get("name") or n.slug
        out.append(f"{i}. **`{n.slug}`** ({n.kind}) — {title}")
        out.append(f"   `{n.path}`")
    out.append("")
    return "\n".join(out)
