"""``fars search <pattern> [filters]`` — ranked text + frontmatter search.

Default match is case-insensitive substring; pass ``--regex`` for regex,
or ``--bm25`` for BM25-ranked relevance scoring (better for fuzzy
"find the slug closest to this description" queries).

Filters: ``--kind``, ``--domain``, ``--path-contains``. Output is one
line per hit with the match counts in substring/regex modes, or a single
score in BM25 mode.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.analyze.bm25_search import find as bm25_find
from fars.analyze.search import find
from fars.cli._runner import as_directory
from fars.render.json_dump import dump as render_json
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="search",
    description="Ranked text + frontmatter search.",
    example='fars search "bilattice" --kind concept --limit 10',
    notes="Title=10, slug=8, description=4, body=1 weighting; --regex for regex; --bm25 for BM25.",
    output="Ranked rows with score + slug + kind + title; --json emits a list of objects.",
    parameters=(
        Parameter(name="pattern", kind="positional", required=True,
                  description="search pattern (substring by default)"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="kind", kind="flag", default=None,
                  description="restrict to notes of this kind"),
        Parameter(name="domain", kind="flag", default=None,
                  description="restrict to notes in this parent dir"),
        Parameter(name="path_contains", kind="flag", default=None,
                  description="restrict to notes whose path contains this substring"),
        Parameter(name="regex", kind="store_true",
                  description="treat pattern as a regex"),
        Parameter(name="bm25", kind="store_true",
                  description="rank by BM25 instead of substring match counts"),
        Parameter(name="limit", kind="flag", type=int, default=30,
                  description="max hits (default: 30)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of human-readable lines"),
    ),
)


def run(pattern: str, *, root: Path | str = ".",
        kind: str | None = None, domain: str | None = None,
        path_contains: str | None = None,
        regex: bool = False, bm25: bool = False, limit: int = 30) -> list | None:
    """Return ranked hits. BM25 mode emits ``[(score, note), ...]``;
    substring/regex mode emits ``[(score, note, hits_dict), ...]``."""
    rooted = as_directory(root, "fars search")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    if bm25:
        return bm25_find(
            ws.notes, pattern,
            kind=kind, domain=domain,
            path_contains=path_contains, limit=limit,
        )
    return find(
        ws.notes, pattern,
        kind=kind, domain=domain,
        path_contains=path_contains, use_regex=regex, limit=limit,
    )


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    if args.regex and args.bm25:
        print("fars search: --regex and --bm25 are mutually exclusive",
              file=sys.stderr)
        return 2

    rows = run(args.pattern, root=args.root, kind=args.kind, domain=args.domain,
               path_contains=args.path_contains,
               regex=args.regex, bm25=args.bm25, limit=args.limit)
    if rows is None:
        return 2
    if not rows:
        mode = "BM25 " if args.bm25 else ""
        print(f"fars search: no {mode}matches for {args.pattern!r}",
              file=sys.stderr)
        return 1

    if args.bm25:
        if args.json:
            payload = [
                {"score": s, "slug": n.slug, "kind": n.kind,
                 "path": str(n.path).replace("\\", "/"),
                 "title": n.fm.get("title") or n.fm.get("name") or n.slug}
                for s, n in rows
            ]
            sys.stdout.write(render_json(
                payload, meta={"pattern": args.pattern, "mode": "bm25",
                               "n": len(rows)}))
        else:
            for s, n in rows:
                title = n.fm.get("title") or n.fm.get("name") or n.slug
                print(f"{s:6.2f}  {n.slug:35s}  ({n.kind})  {title}")
                print(f"        {n.path}")
        print(f"\n{len(rows)} hits (BM25)", file=sys.stderr)
        return 0

    if args.json:
        payload = [
            {"score": score, "slug": n.slug, "kind": n.kind,
             "path": str(n.path).replace("\\", "/"),
             "title": n.fm.get("title") or n.fm.get("name") or n.slug,
             "hits": hits}
            for score, n, hits in rows
        ]
        sys.stdout.write(render_json(payload,
                                     meta={"pattern": args.pattern, "n": len(rows)}))
    else:
        for score, n, hits in rows:
            title = n.fm.get("title") or n.fm.get("name") or n.slug
            breakdown = " ".join(f"{k}={v}" for k, v in hits.items() if v)
            print(f"{score:5d}  {n.slug:35s}  ({n.kind})  {title}")
            print(f"        {n.path}  [{breakdown}]")
    print(f"\n{len(rows)} hits", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
