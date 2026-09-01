"""Pretty-print one note: header, frontmatter, body, derived in/out edges.

Trims long fm values to keep the output readable; the full body is
included verbatim. The derived footer groups outbound and inbound edges
by predicate kind, with broken outbound counts surfaced inline.
"""
from __future__ import annotations

from collections import Counter
from typing import Iterable, Mapping

from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile


def _render_fm_value(v) -> str:
    if isinstance(v, list):
        head = ", ".join(str(x) for x in v[:5])
        more = f" (+{len(v) - 5} more)" if len(v) > 5 else ""
        return head + more if head else "*(empty list)*"
    s = str(v)
    if len(s) > 120:
        return s[:117] + "…"
    return s


def render(note: Flatfile, *,
           by_slug: Mapping[str, list[Flatfile]],
           in_edges: Mapping[str, Iterable[Predication]],
           out_edges: Mapping[str, Iterable[Predication]],
           ) -> str:
    out: list[str] = []
    out.append(f"# `{note.slug}`")
    out.append("")
    out.append(f"- **Path**: `{note.path}`")
    out.append(f"- **Kind**: `{note.kind}`")
    out.append(f"- **Dir**: `{note.dir}`")
    out.append("")

    out.append("## Frontmatter")
    out.append("")
    if not note.fm:
        out.append("*(empty)*")
    else:
        for k in sorted(note.fm):
            out.append(f"- **{k}**: {_render_fm_value(note.fm[k])}")
    out.append("")

    out.append("## Body")
    out.append("")
    body = note.body.strip()
    out.append(body if body else "*(empty)*")
    out.append("")

    outs = list(out_edges.get(note.slug, []))
    if outs:
        out.append("## Outbound edges")
        out.append("")
        by_kind: dict[str, list[Predication]] = {}
        for e in outs:
            by_kind.setdefault(e.kind, []).append(e)
        for kind, items in sorted(by_kind.items(), key=lambda x: -len(x[1])):
            unresolved = sum(1 for e in items if e.dst not in by_slug)
            sample = ", ".join(f"`{e.dst}`" for e in items[:5])
            more = f" (+{len(items) - 5} more)" if len(items) > 5 else ""
            mark = f" — {unresolved} unresolved" if unresolved else ""
            out.append(f"- **{kind}** ({len(items)}){mark}: {sample}{more}")
        out.append("")

    ins = list(in_edges.get(note.slug, []))
    if ins:
        out.append("## Inbound references")
        out.append("")
        by_kind = {}
        for e in ins:
            by_kind.setdefault(e.kind, []).append(e)
        for kind, items in sorted(by_kind.items(), key=lambda x: -len(x[1])):
            srcs = list({e.src for e in items})[:5]
            sample = ", ".join(f"`{s}`" for s in srcs)
            more = f" (+{len(items) - 5} more)" if len(items) > 5 else ""
            out.append(f"- **{kind}** ({len(items)}): {sample}{more}")
        out.append("")

    return "\n".join(out)
