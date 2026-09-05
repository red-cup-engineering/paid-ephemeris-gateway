"""Console entry point for the Farstone PyFARS application."""
from __future__ import annotations

import os
import shutil
import sys
import tempfile
from importlib.resources import as_file, files
from pathlib import Path

from pyfars.apps.cli.__main__ import main as pyfars_main


def _is_farstone_root(path: Path) -> bool:
    return (path / "_index.md").is_file() and (path / "governance").is_dir()


def _checkout_root() -> Path | None:
    root = Path.cwd()
    if _is_farstone_root(root):
        return root
    return None


def _explicit_root() -> Path | None:
    raw = os.environ.get("FARSTONE_ROOT")
    if not raw:
        return None
    root = Path(raw).expanduser().resolve()
    if not _is_farstone_root(root):
        raise SystemExit(
            f"FARSTONE_ROOT does not look like a Farstone substrate: {root}"
        )
    return root


def _copy_packaged_corpus() -> Path:
    target = Path(tempfile.mkdtemp(prefix="farstone-root."))
    corpus = files("farstone") / "corpus"
    with as_file(corpus) as source:
        shutil.copytree(source, target, dirs_exist_ok=True)
    print(
        f"farstone: using temporary writable substrate at {target}",
        file=sys.stderr,
    )
    print(
        "farstone: set FARSTONE_ROOT=/path/to/farstone for persistent state",
        file=sys.stderr,
    )
    return target


def _root() -> Path:
    return _explicit_root() or _checkout_root() or _copy_packaged_corpus()


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    return pyfars_main(["run", str(_root()), *args])
