"""Render the fars stats dashboard as markdown."""
from __future__ import annotations


def render(stats: dict) -> str:
    out: list[str] = ["# Corpus stats", ""]
    out.append(f"- **Notes**: {stats['n_notes']:,}")
    out.append(f"- **Kinds**: {stats['n_kinds']}")
    out.append(f"- **Domains (parent dirs)**: {stats['n_domains']}")
    out.append("")

    out.append("## By kind")
    out.append("")
    out.append("| kind | count |")
    out.append("|---|---:|")
    for k, c in stats["by_kind"].items():
        out.append(f"| `{k}` | {c} |")
    out.append("")

    out.append("## By directory (top 10)")
    out.append("")
    out.append("| dir | count |")
    out.append("|---|---:|")
    for d, c in stats["by_dir"].items():
        out.append(f"| `{d}` | {c} |")
    out.append("")

    e = stats["edges"]
    out.append("## Edges")
    out.append("")
    out.append(f"- Total: **{e['total']:,}** ({e['fm']:,} fm + {e['body']:,} body)")
    out.append(f"- ``depends-on``: **{e['depends_on']:,}**")
    out.append(f"- Broken (target not in corpus): **{e['broken_internal']:,}**")
    out.append("")

    h = stats["health"]
    out.append("## Health")
    out.append("")
    out.append(f"- Orphans (no incoming refs): **{h['orphans']:,}**")
    out.append(f"- Stubs (body <200 chars): **{h['stubs']:,}**")
    out.append(f"- WIP theorems (draft / sketch): **{h['wip_theorems']:,}**")
    out.append(f"- Broken body links: **{h['broken_links']:,}**")
    out.append(f"- Broken citations: **{h['broken_citations']:,}**")
    out.append("")

    b = stats["body_chars"]
    out.append("## Body length")
    out.append("")
    out.append(f"- Total: **{b['total']:,}** chars")
    out.append(f"- Average: **{b['avg']:,}** chars/note")
    out.append(f"- Median: **{b['median']:,}** chars/note")
    out.append("")

    if stats["top_load_bearing"]:
        out.append("## Top 10 load-bearing slugs (most descendants)")
        out.append("")
        out.append("| slug | descendants |")
        out.append("|---|---:|")
        for s, c in stats["top_load_bearing"]:
            out.append(f"| `{s}` | {c} |")
        out.append("")
    return "\n".join(out)
