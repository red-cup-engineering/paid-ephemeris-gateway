"""``fars commit [-m MESSAGE]`` — stage corpus .md changes and commit.

Walks ``git status``, picks every modified/added/renamed ``.md`` file
under the corpus root, stages them, and commits. With no ``-m``, an
auto-generated message summarizes the change shape ("3 added, 2 moved,
1 modified across 4 dirs"). Refuses to commit non-.md changes — keeps
this tool narrowly scoped to corpus authoring.

By default, dry-run; pass ``--apply`` to actually commit.
"""
from __future__ import annotations

import subprocess
import sys
from collections import Counter
from pathlib import Path

from fars.cli._runner import as_directory
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="commit",
    description="Stage corpus .md changes and commit with an auto-generated message.",
    example="fars commit --apply",
    notes="Default dry-run; refuses to touch non-.md files.",
    output="Markdown summary of the proposed commit; --apply runs `git add` + `git commit`.",
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="message", kind="flag", default=None, short="-m",
                  description="commit message (default: auto-generated)"),
        Parameter(name="apply", kind="store_true",
                  description="actually commit; without this, dry-run"),
    ),
)


def _git(root: Path, *args: str, capture: bool = True) -> str:
    out = subprocess.run(
        ["git", "-C", str(root), *args],
        check=True, capture_output=capture, text=True,
    )
    return out.stdout if capture else ""


def _classify_status(porcelain: str) -> dict[str, list[str]]:
    buckets: dict[str, list[str]] = {
        "added": [], "modified": [], "renamed": [], "deleted": [],
    }
    for line in porcelain.splitlines():
        if len(line) < 3:
            continue
        code = line[:2]
        rest = line[3:].strip()
        if " -> " in rest:
            old, new = rest.split(" -> ", 1)
            path = new
        else:
            path = rest
        if not path.endswith(".md"):
            continue
        if "?" in code:
            buckets["added"].append(path)
        elif "A" in code:
            buckets["added"].append(path)
        elif "D" in code:
            buckets["deleted"].append(path)
        elif "R" in code:
            buckets["renamed"].append(path)
        else:
            buckets["modified"].append(path)
    return buckets


def _auto_message(buckets: dict[str, list[str]]) -> str:
    parts = []
    for label in ("added", "modified", "renamed", "deleted"):
        if buckets[label]:
            parts.append(f"{len(buckets[label])} {label}")
    if not parts:
        return "corpus: no .md changes"
    dirs: Counter[str] = Counter()
    for files in buckets.values():
        for p in files:
            dirs[p.split("/")[0]] += 1
    dirs_str = ", ".join(f"{d}({c})" for d, c in dirs.most_common(3))
    return "corpus: " + " · ".join(parts) + f"  [{dirs_str}]"


def _is_inside_git(p: Path) -> bool:
    for cand in (p, *p.parents):
        if (cand / ".git").exists():
            return True
    return False


def run(*, root: Path | str = ".") -> dict | None:
    """Survey git status and return the buckets + auto-message."""
    rooted = as_directory(root, "fars commit")
    if rooted is None:
        return None
    if not _is_inside_git(rooted):
        return {"error": "not-a-git-repo"}
    porcelain = _git(rooted, "status", "--porcelain")
    buckets = _classify_status(porcelain)
    return {
        "root": rooted,
        "buckets": buckets,
        "total": sum(len(v) for v in buckets.values()),
        "auto_message": _auto_message(buckets),
    }


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    survey = run(root=args.root)
    if survey is None:
        return 2
    if survey.get("error") == "not-a-git-repo":
        print(f"fars commit: {Path(args.root).resolve()} is not a git repo",
              file=sys.stderr)
        return 2

    rooted = survey["root"]
    buckets = survey["buckets"]
    total = survey["total"]
    if total == 0:
        print("fars commit: no .md changes", file=sys.stderr)
        return 0

    msg = args.message or survey["auto_message"]
    print(f"# fars commit ({total} .md changes)")
    print()
    print(f"message: {msg}")
    print()
    for label, files in buckets.items():
        if not files:
            continue
        print(f"## {label} ({len(files)})")
        for f in files[:20]:
            print(f"- {f}")
        if len(files) > 20:
            print(f"  (+{len(files) - 20} more)")
        print()

    if not args.apply:
        print("(dry-run; pass --apply to commit)", file=sys.stderr)
        return 0

    all_files = [f for v in buckets.values() for f in v]
    _git(rooted, "add", "--", *all_files, capture=False)
    _git(rooted, "commit", "-m", msg, capture=False)
    print(f"fars commit: committed {total} files", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
