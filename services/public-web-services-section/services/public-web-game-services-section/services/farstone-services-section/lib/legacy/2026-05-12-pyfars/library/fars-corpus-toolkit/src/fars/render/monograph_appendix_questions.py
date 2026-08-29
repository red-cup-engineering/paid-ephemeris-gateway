"""Render the open-questions appendix: H3 list of question notes by slug."""
from __future__ import annotations

from typing import Container

from fars.render._demote_headings import demote
from fars.render._extract_title import extract
from fars.render._kind_label import label
from fars.render._link_rewrite import rewrite
from fars.render._strip_lean import strip
from fars.substrate.flatfile import Flatfile


def _render_question(n: Flatfile, all_slugs: Container[str]) -> str:
    title, body = extract(n.body)
    body = strip(body)
    body = demote(body, 3)
    body = rewrite(body, all_slugs)
    status = n.fm.get("status", "open")
    badge = f" [{status.upper()}]" if status != "open" else ""
    explores = n.fm.get("explores") or []
    explores_links = ", ".join(f"[{e}](#{e})" for e in explores if e in all_slugs)
    explores_line = f"*Explores: {explores_links}*\n\n" if explores_links else ""
    heading = f"#### {label('question')}{badge}: {title} {{#{n.slug}}}"
    return f"{heading}\n\n{explores_line}{body}\n"


def render(notes: list[Flatfile], all_slugs: Container[str]) -> str:
    questions = sorted(
        (n for n in notes
         if n.kind == "question"
         and n.fm.get("status") in (None, "open", "partial")),
        key=lambda n: n.slug,
    )
    if not questions:
        return ""
    parts = ["### Open questions {#appendix-open-questions}", ""]
    parts.append(
        "Open mathematical and program-shaping questions, indexed by the "
        "entities they explore. Each question's `explores:` list points to "
        "the objects, concepts, or theorems that situate the inquiry.\n"
    )
    for q in questions:
        parts.append(_render_question(q, all_slugs))
        parts.append("")
    return "\n".join(parts)
