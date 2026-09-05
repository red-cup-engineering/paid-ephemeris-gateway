"""Render the dependency-audit markdown report.

Structure:
  1. Summary stats (notes, edges).
  2. Cross-ref vs depends-on consistency, broken into unrelated /
     sibling / ancestor / deps-not-cited buckets, with an unrelated
     ranking (highest priority signal).
  3. Top load-bearing notes by transitive descendant count.
  4. Foundation-distance distribution + top-10 deepest.
"""
from __future__ import annotations

from typing import Mapping

from fars.substrate.flatfile import Flatfile


def render(notes: list[Flatfile], *,
           crossref: dict[str, dict],
           crossref_aggressive: dict[str, dict],
           descendant_counts: Mapping[str, int],
           foundation: Mapping[str, int],
           depends_on: Mapping[str, list[str]],
           ) -> str:
    by_slug = {n.slug: n for n in notes}
    lines: list[str] = ["# Dependency-graph audit", ""]
    lines.append(f"Notes scanned: **{len(notes)}**.")
    edges = sum(len([d for d in depends_on.get(n.slug, ()) if d in by_slug])
                for n in notes)
    lines.append(f"Dependency edges (resolved): **{edges}**.")
    lines.append("")

    unrelated_pairs = sum(len(v["body_not_in_deps_unrelated"]) for v in crossref.values())
    sibling_pairs = sum(len(v["body_not_in_deps_sibling"]) for v in crossref.values())
    ancestor_pairs = sum(len(v["body_not_in_deps_ancestor"]) for v in crossref.values())
    deps_missing = sum(len(v["deps_not_in_body"]) for v in crossref.values())
    body_missing_aggressive = sum(
        len(v["body_not_in_deps"]) for v in crossref_aggressive.values()
    )

    lines.append("## Cross-ref vs depends-on consistency")
    lines.append("")
    lines.append(
        "Body links classified by their relation to the citing note's `depends-on`:"
    )
    lines.append("- *direct*: in `depends-on` (good)")
    lines.append("- *descendant*: M's proof depends on N (forward-pointer, dropped)")
    lines.append("- *ancestor*: M is a transitive ancestor of N (dependency implicit)")
    lines.append("- *sibling*: reachable from a direct dep — usually benign 'see also'")
    lines.append("- *unrelated*: none of the above (highest-priority signal)")
    lines.append("")

    n_unrel = sum(1 for v in crossref.values() if v["body_not_in_deps_unrelated"])
    n_sib = sum(1 for v in crossref.values() if v["body_not_in_deps_sibling"])
    n_anc = sum(1 for v in crossref.values() if v["body_not_in_deps_ancestor"])
    n_dep = sum(1 for v in crossref.values() if v["deps_not_in_body"])
    lines.append(
        f"- **Unrelated body references**: **{unrelated_pairs} pairs** across "
        f"{n_unrel} notes. Most likely real missing dependencies."
    )
    lines.append(
        f"- **Sibling body references**: **{sibling_pairs} pairs** across "
        f"{n_sib} notes. Mostly 'see also' cites — usually benign."
    )
    lines.append(
        f"- **Ancestor body references**: **{ancestor_pairs} pairs** across "
        f"{n_anc} notes. Lower priority — transitive dependency present."
    )
    lines.append(
        f"- `depends-on` lists a note but body never cites it: **{deps_missing} pairs** "
        f"across {n_dep} notes."
    )
    lines.append("")
    dropped = body_missing_aggressive - unrelated_pairs - sibling_pairs - ancestor_pairs
    lines.append(
        f"*Filter context: {body_missing_aggressive} unfiltered → "
        f"{unrelated_pairs} unrelated + {sibling_pairs} sibling + {ancestor_pairs} ancestor "
        f"({dropped} pairs dropped as forward-pointers / informational).*"
    )
    lines.append("")

    unrelated_notes = sorted(
        ((slug, v) for slug, v in crossref.items() if v["body_not_in_deps_unrelated"]),
        key=lambda x: (-descendant_counts.get(x[0], 0), x[0]),
    )
    if unrelated_notes:
        lines.append("### Unrelated body references (highest priority)")
        lines.append("")
        lines.append(
            "Body cites a note that's not in `depends-on`, not a descendant, "
            "not a transitive ancestor, and not a sibling. Either the note "
            "IS a real dependency, OR it's an arbitrary cross-reference."
        )
        lines.append("")
        for slug, v in unrelated_notes[:50]:
            n = by_slug.get(slug)
            if n is None:
                continue
            d = descendant_counts.get(slug, 0)
            refs = ", ".join(f"`{r}`" for r in v["body_not_in_deps_unrelated"][:8])
            more = (f" (+{len(v['body_not_in_deps_unrelated']) - 8} more)"
                    if len(v["body_not_in_deps_unrelated"]) > 8 else "")
            lines.append(
                f"- `{slug}` (descendants={d}, kind={n.kind}, "
                f"status={n.fm.get('status') or '—'}): {refs}{more}"
            )
        if len(unrelated_notes) > 50:
            lines.append("")
            lines.append(f"*(+ {len(unrelated_notes) - 50} more notes with unrelated body refs)*")
        lines.append("")

    lines.append("## Top 20 load-bearing notes (most descendants)")
    lines.append("")
    lines.append(
        "These notes have the most transitive dependents — an error in any "
        "of them propagates farthest. Re-check the proofs / definitions are tight."
    )
    lines.append("")
    top = sorted(descendant_counts.items(), key=lambda x: -x[1])[:20]
    lines.append("| Rank | Flatfile | Descendants | Kind | Status |")
    lines.append("|---:|---|---:|---|---|")
    for i, (slug, count) in enumerate(top, 1):
        n = by_slug.get(slug)
        if n is None:
            continue
        st = n.fm.get("status") or "—"
        lines.append(f"| {i} | `{slug}` | {count} | {n.kind} | {st} |")
    lines.append("")

    if foundation:
        max_dist = max(foundation.values())
        avg_dist = sum(foundation.values()) / len(foundation)
        lines.append("## Foundation distance")
        lines.append("")
        lines.append(
            f"Longest dependency chain from an atomic note (empty `depends-on`) "
            f"to a leaf: **{max_dist}** edges."
        )
        lines.append(
            f"Average distance: **{avg_dist:.1f}** edges across "
            f"{len(foundation)} notes."
        )
        lines.append("")
        far = sorted(foundation.items(), key=lambda x: -x[1])[:10]
        lines.append("### Top 10 deepest notes (longest distance from atoms)")
        lines.append("")
        lines.append("| Flatfile | Distance |")
        lines.append("|---|---:|")
        for slug, d in far:
            lines.append(f"| `{slug}` | {d} |")
        lines.append("")

    return "\n".join(lines) + "\n"
