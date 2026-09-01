"""Render a markdown ``## Title (count)`` section listing each Diagnostic."""
from __future__ import annotations

from fars.render.diagnostic_line import render as render_line
from fars.substrate.types.diagnostic import Diagnostic


def render(title: str, items: list[Diagnostic]) -> str:
    out: list[str] = [f"## {title} ({len(items)})", ""]
    if not items:
        out.append("*(none)*")
    else:
        for d in items:
            out.append(render_line(d))
    out.append("")
    return "\n".join(out)
