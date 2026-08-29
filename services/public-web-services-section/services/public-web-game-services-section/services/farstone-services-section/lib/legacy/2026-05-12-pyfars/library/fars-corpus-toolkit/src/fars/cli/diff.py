"""``fars diff [--since REF]`` — incremental validate over git-changed files.

Default REF is ``HEAD~1`` (the parent commit). Lists every ``.md`` file
inside the corpus that's been added/modified/renamed since REF, runs
the per-file ``check`` rules on each, and emits a markdown summary.

Untracked changes (``git status --porcelain``) are also included in the
default mode; pass ``--committed-only`` to skip them.
"""
from __future__ import annotations

import subprocess
import sys
from collections import Counter
from pathlib import Path

from fars.cli._runner import as_directory
from fars.substrate.load.bib import load as load_bib
from fars.substrate.load.note import load as load_note
from fars.substrate.parse.frontmatter import FrontmatterError
from fars.render.diagnostic_line import render as render_line
from fars.closure.rule.broken_citations import check as check_broken_citations
from fars.closure.rule.broken_links import check as check_broken_links
from fars.spec import Parameter, VerbSpec, make_argparse
from fars.substrate.types.diagnostic import Diagnostic

SPEC = VerbSpec(
    name="diff",
    description="Run check rules on every .md changed since a git ref.",
    example="fars diff --since main",
    notes="Useful in CI / pre-commit. Includes uncommitted unless --committed-only.",
    output="Markdown sections per changed file with diagnostics; exits 1 on any error.",
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="since", kind="flag", default="HEAD~1",
                  description="git ref to diff against (default: HEAD~1)"),
        Parameter(name="committed_only", kind="store_true",
                  description="skip untracked / staged-but-uncommitted changes"),
    ),
)


def _changed_files(root: Path, since: str, *,
                   committed_only: bool) -> list[Path]:
    files: set[Path] = set()
    try:
        out = subprocess.run(
            ["git", "-C", str(root), "diff", "--name-only", since, "HEAD"],
            check=True, capture_output=True, text=True,
        ).stdout
        for line in out.splitlines():
            if line.strip():
                files.add(root / line.strip())
    except subprocess.CalledProcessError:
        pass

    if not committed_only:
        try:
            out = subprocess.run(
                ["git", "-C", str(root), "status", "--porcelain"],
                check=True, capture_output=True, text=True,
            ).stdout
            for line in out.splitlines():
                rest = line[3:].strip()
                if " -> " in rest:
                    rest = rest.split(" -> ", 1)[1]
                if rest:
                    files.add(root / rest)
        except subprocess.CalledProcessError:
            pass

    return [f for f in sorted(files)
            if f.suffix == ".md" and f.is_file()]


def run(*, root: Path | str = ".",
        since: str = "HEAD~1",
        committed_only: bool = False) -> tuple[list[Path], list[Diagnostic]] | None:
    """Run check rules on every .md changed since ``since``.
    Returns ``(changed_files, diagnostics)`` or ``None`` if root invalid."""
    rooted = as_directory(root, "fars diff")
    if rooted is None:
        return None

    files = _changed_files(rooted, since, committed_only=committed_only)
    if not files:
        return [], []

    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    bib_path = rooted / "references.bib"
    bib_keys = {b.key for b in load_bib(bib_path)} if bib_path.is_file() else set()

    all_diags: list[Diagnostic] = []
    for f in files:
        rel = f.relative_to(rooted)
        try:
            n = load_note(f, root=rooted)
        except FrontmatterError as e:
            all_diags.append(Diagnostic(
                code="frontmatter-parse", severity="error",
                message=str(e), path=rel))
            continue
        if n is None:
            continue
        all_diags.extend(check_broken_links([n], ws.by_slug))
        if bib_keys:
            all_diags.extend(check_broken_citations([n], bib_keys))
    return files, all_diags


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    result = run(root=args.root, since=args.since,
                 committed_only=args.committed_only)
    if result is None:
        return 2
    files, all_diags = result

    if not files:
        print(f"fars diff: no .md changes since {args.since}", file=sys.stderr)
        return 0

    print(f"# fars diff — {len(files)} changed .md files since {args.since}")
    print()

    by_path: dict[Path, list[Diagnostic]] = {}
    for d in all_diags:
        if d.path is not None:
            by_path.setdefault(d.path, []).append(d)

    for f in files:
        rel = f.relative_to(Path(args.root).resolve())
        diags = by_path.get(rel, [])
        if not diags:
            continue
        print(f"## `{rel}` ({len(diags)})")
        print()
        for d in diags:
            print(render_line(d))
        print()

    codes = Counter(d.code for d in all_diags)
    if codes:
        print(f"\n**Total**: {len(all_diags)} diagnostics — " +
              ", ".join(f"{n} {c}" for c, n in sorted(codes.items())))
    else:
        print(f"\nNo diagnostics across {len(files)} changed files.")

    return 1 if any(d.severity == "error" for d in all_diags) else 0


if __name__ == "__main__":
    sys.exit(main())
