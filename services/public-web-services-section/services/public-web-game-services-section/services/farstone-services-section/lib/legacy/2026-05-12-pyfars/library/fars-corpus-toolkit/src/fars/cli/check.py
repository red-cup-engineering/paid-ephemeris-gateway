"""``fars check <file>`` — fast single-file validate.

Loads the file as a Flatfile, then runs the file-local rules (frontmatter
parse, broken citations, broken body links resolved against the
file's containing directory tree). For full corpus-wide checks, use
``fars validate`` against the corpus root.
"""
from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from fars.substrate.load.bib import load as load_bib
from fars.substrate.load.note import load as load_note
from fars.substrate.parse.frontmatter import FrontmatterError
from fars.render.diagnostic_line import render as render_line
from fars.closure.rule.broken_citations import check as check_broken_citations
from fars.closure.rule.broken_links import check as check_broken_links
from fars.spec import Parameter, VerbSpec, make_argparse
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.store import Substrate

SPEC = VerbSpec(
    name="check",
    description="Fast single-file validate.",
    example="fars check path/to/note.md",
    notes="Use this in agent edit loops; full corpus checks belong to `validate`.",
    output="Markdown diagnostic lines for the file, or `clean` when no issues.",
    parameters=(
        Parameter(name="file", kind="positional", required=True,
                  description="path to a single .md file"),
        Parameter(name="root", kind="flag", default=None, short="-r",
                  description="corpus root for cross-ref resolution "
                              "(default: walk up looking for .git or _index.md)"),
    ),
)


def run(file: Path | str, *,
        root: Path | str | None = None) -> tuple[list[Diagnostic], Path] | None:
    """Run the file-local rules and return ``(diagnostics, file_path)``."""
    file_path = Path(file).resolve()
    if not file_path.is_file():
        return None

    if root:
        rooted = Path(root).resolve()
    else:
        rooted = file_path.parent
        for cand in (file_path.parent, *file_path.parents):
            if (cand / ".git").exists() or (cand / "_index.md").exists():
                rooted = cand
                break

    diagnostics: list[Diagnostic] = []
    try:
        n = load_note(file_path, root=rooted)
    except FrontmatterError as e:
        diagnostics.append(Diagnostic(
            code="frontmatter-parse", severity="error",
            message=str(e), path=file_path.relative_to(rooted),
        ))
        n = None

    if n is not None:
        ws = Substrate(root=rooted)
        bib_path = rooted / "references.bib"
        bib_keys = {b.key for b in load_bib(bib_path)} if bib_path.is_file() else set()
        diagnostics.extend(check_broken_links([n], ws.by_slug))
        if bib_keys:
            diagnostics.extend(check_broken_citations([n], bib_keys))
    return diagnostics, file_path


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    result = run(args.file, root=args.root)
    if result is None:
        print(f"fars check: not a file: {Path(args.file).resolve()}",
              file=sys.stderr)
        return 2
    diagnostics, file_path = result

    if not diagnostics:
        print(f"fars check: {file_path}: clean")
        return 0

    for d in diagnostics:
        print(render_line(d))
    codes = Counter(d.code for d in diagnostics)
    print(f"\n{len(diagnostics)} diagnostics: " + ", ".join(
        f"{n} {c}" for c, n in sorted(codes.items())
    ), file=sys.stderr)
    return 1 if any(d.severity == "error" for d in diagnostics) else 0


if __name__ == "__main__":
    sys.exit(main())
