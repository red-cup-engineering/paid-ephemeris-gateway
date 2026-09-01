"""``triage-cands`` — triage files with non-triage inbound (move candidates).

Loads with ``--include-triage`` so the triage subtree is visible. Counts
incoming edges from non-triage notes; the higher the count, the more
leverage moving the file out of triage gives.
"""
from __future__ import annotations

from fars.analyze.predicate_category import category
from fars.cli.query._load import QueryContext


def run(ctx: QueryContext, args: list[str]) -> int:
    if args:
        print("usage: query triage-cands  (use --include-triage globally)")
        return 2
    inbound: dict[str, int] = {}
    for e in ctx.edges:
        if e.source != "fm" or category(e.kind) != "EDGE":
            continue
        src_paths = ctx.by_slug.get(e.src, [])
        if not src_paths:
            continue
        if any("triage" in str(n.path).replace("\\", "/").split("/") for n in src_paths):
            continue
        inbound[e.dst] = inbound.get(e.dst, 0) + 1

    print("=== triage files with non-triage library/ops inbound (move candidates) ===")
    print(f'{"in-deg":>6s}  {"slug":35s} {"location"}')
    cands: list[tuple[int, str, str]] = []
    for slug, count in inbound.items():
        notes_for = ctx.by_slug.get(slug, [])
        if not notes_for:
            continue
        canonical = sorted(
            notes_for,
            key=lambda n: (
                "triage" not in str(n.path).replace("\\", "/").split("/"),
                "archive" not in str(n.path).replace("\\", "/"),
                "public" not in str(n.path).replace("\\", "/"),
                len(str(n.path)),
            ),
        )[0]
        path_str = str(canonical.path).replace("\\", "/")
        if "triage" not in path_str.split("/"):
            continue
        cands.append((count, slug, path_str))
    for indeg, slug, path in sorted(cands, key=lambda x: -x[0])[:25]:
        print(f"  {indeg:5d}  {slug:35s} {path}")
    return 0
