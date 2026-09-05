"""``fars show <slug-or-path> [--root R]`` — pretty-print a note + its subgraph.

Resolves ``slug-or-path`` against the corpus rooted at ``--root`` (CWD by
default). When the slug ambiguates across multiple notes, every match
is rendered, headed by its path.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.cli._runner import as_directory
from fars.render.json_dump import dump as render_json
from fars.render.show_note import render as render_show
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="show",
    description="Pretty-print a note + its in/out edges.",
    example="fars show bilattice",
    notes="First tool to reach for when an agent needs to know what a slug is.",
    output="Markdown rendering of frontmatter, body, and grouped in/out edges; --json emits a structured object.",
    parameters=(
        Parameter(name="target", kind="positional", required=True,
                  description="slug or relative path to a note"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
    ),
)


def run(target: str, *, root: Path | str = ".") -> list | None:
    """Return matched notes with their inbound/outbound edges, or None when nothing matched."""
    rooted = as_directory(root, "fars show")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    matches = []
    if "/" in target or target.endswith(".md") or "\\" in target:
        normalized = target.replace("\\", "/")
        for n in ws.notes:
            if str(n.path).replace("\\", "/") == normalized:
                matches.append(n)
                break
    if not matches:
        matches = list(ws.by_slug.get(target.lower(), []) or
                       ws.by_slug.get(target, []))
    if not matches:
        return []
    return [(n, list(ws.in_edges.get(n.slug, [])),
             list(ws.out_edges.get(n.slug, [])), ws.by_slug) for n in matches]


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    matches = run(args.target, root=args.root)
    if matches is None:
        return 2
    if not matches:
        print(f"fars show: no note matched {args.target!r}", file=sys.stderr)
        return 1

    if args.json:
        payload = []
        for n, ins, outs, by_slug in matches:
            payload.append({
                "slug": n.slug, "kind": n.kind, "dir": n.dir,
                "path": str(n.path).replace("\\", "/"),
                "fm": n.fm, "body": n.body,
                "outbound": [{"kind": e.kind, "dst": e.dst, "source": e.source,
                              "resolves": e.dst in by_slug} for e in outs],
                "inbound": [{"kind": e.kind, "src": e.src, "source": e.source}
                            for e in ins],
            })
        sys.stdout.write(render_json(payload, meta={"target": args.target}))
        return 0

    if len(matches) > 1:
        print(f"# {len(matches)} matches for `{args.target}`", file=sys.stderr)

    for n, ins, outs, by_slug in matches:
        # show_note renderer takes the index-shaped versions
        in_idx = {n.slug: ins}
        out_idx = {n.slug: outs}
        print(render_show(n, by_slug=by_slug, in_edges=in_idx, out_edges=out_idx))
        if len(matches) > 1:
            print("\n---\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
