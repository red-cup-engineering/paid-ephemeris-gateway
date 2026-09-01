"""Render the impact report as markdown — proved-first, then sketches/drafts."""
from __future__ import annotations


def render(impact: dict) -> str:
    out: list[str] = [f"# Impact of `{impact['slug']}`", ""]
    out.append(f"**{impact['n_descendants']} transitive descendants** in the depends-on graph.")
    out.append("")
    if impact["by_kind"]:
        out.append("## By kind")
        out.append("")
        for k, c in impact["by_kind"].items():
            out.append(f"- `{k}`: {c}")
        out.append("")

    if impact["proved_theorems"]:
        out.append(f"## Proved theorems at risk ({len(impact['proved_theorems'])})")
        out.append("")
        out.append("Editing `" + impact["slug"] + "` may invalidate these proofs.")
        out.append("")
        for s in impact["proved_theorems"]:
            out.append(f"- `{s}`")
        out.append("")

    if impact["draft_theorems"]:
        out.append(f"## Draft / sketch theorems ({len(impact['draft_theorems'])})")
        out.append("")
        for s, st in impact["draft_theorems"]:
            out.append(f"- `{s}` ({st})")
        out.append("")

    if impact["anchors"]:
        out.append(f"## Anchor descendants ({len(impact['anchors'])})")
        out.append("")
        out.append("Definitions / concepts / morphisms that depend on this slug.")
        out.append("")
        for s in impact["anchors"]:
            out.append(f"- `{s}`")
        out.append("")

    if impact["examples"]:
        out.append(f"## Examples ({len(impact['examples'])})")
        out.append("")
        for s in impact["examples"]:
            out.append(f"- `{s}`")
        out.append("")

    if impact["other_theorems"] or impact["other"]:
        out.append("## Other dependents")
        out.append("")
        for s in impact["other_theorems"]:
            out.append(f"- `{s}` (theorem-like, no status)")
        for s in impact["other"]:
            out.append(f"- `{s}`")
        out.append("")
    return "\n".join(out)
