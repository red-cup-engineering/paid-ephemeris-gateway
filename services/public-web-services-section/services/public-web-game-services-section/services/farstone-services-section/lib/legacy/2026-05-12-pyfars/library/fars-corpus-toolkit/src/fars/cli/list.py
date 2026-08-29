"""``fars list [--kind K] [--domain D]`` — enumerate notes by kind/domain.

Filters the loaded corpus by ``--kind`` (matches ``Flatfile.kind``) and/or
``--domain`` (matches the parent directory name, the ``Flatfile.dir`` field).
Without filters, lists every note. Output is one line per note:
``<slug>\\t<kind>\\t<path>``.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.cli._runner import as_directory
from fars.render.json_dump import dump as render_json
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="list",
    description="Enumerate notes by kind / domain / path substring.",
    example="fars list --kind theorem --domain theorems",
    output="Tab-separated `slug\\tkind\\tpath` lines, or JSON list with title.",
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="kind", kind="flag", default=None,
                  description="filter to notes with this kind"),
        Parameter(name="domain", kind="flag", default=None,
                  description="filter to notes whose parent dir name matches"),
        Parameter(name="path_contains", kind="flag", default=None,
                  description="filter to notes whose path contains this substring"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of TSV"),
    ),
)


def run(*, root: Path | str = ".",
        kind: str | None = None,
        domain: str | None = None,
        path_contains: str | None = None) -> list[dict] | None:
    """Return the filtered list of `{slug, kind, path, title}` dicts."""
    rooted = as_directory(root, "fars list")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    rows = []
    for n in sorted(ws.notes, key=lambda x: x.slug):
        if kind and n.kind != kind:
            continue
        if domain and n.dir != domain:
            continue
        if path_contains and path_contains not in str(n.path).replace("\\", "/"):
            continue
        rows.append({"slug": n.slug, "kind": n.kind,
                     "path": str(n.path).replace("\\", "/"),
                     "title": n.fm.get("title") or n.fm.get("name")})
    return rows


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    rows = run(root=args.root, kind=args.kind, domain=args.domain,
               path_contains=args.path_contains)
    if rows is None:
        return 2

    from fars.substrate.store import Substrate
    total = len(Substrate(root=Path(args.root).resolve()).notes)
    if args.json:
        sys.stdout.write(render_json(rows, meta={"matched": len(rows),
                                                 "total": total}))
    else:
        for r in rows:
            print(f"{r['slug']}\t{r['kind']}\t{r['path']}")
    print(f"\n{len(rows)} of {total} notes match", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
