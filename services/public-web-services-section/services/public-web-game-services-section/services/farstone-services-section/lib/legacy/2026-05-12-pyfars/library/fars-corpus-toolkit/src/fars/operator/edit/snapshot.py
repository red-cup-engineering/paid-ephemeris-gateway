"""Save and restore corpus state via git stash, or filesystem copy as fallback.

Snapshot semantics:
  - **git mode** (default when ``<root>`` is a git repo): runs
    ``git stash push -u -m <label>`` so every tracked + untracked .md
    change becomes a recoverable stash. Restore via ``git stash pop``
    on the matching label.
  - **fs mode** (when ``--no-git`` is passed or no git repo is detected):
    copies every ``.md`` under ``<root>`` into
    ``.corpus/snapshots/<label>/``. Restore overwrites in place.

The git mode is preferred because it preserves diff context and plays
well with everyday workflow. fs mode is a sledgehammer for emergencies.
"""
from __future__ import annotations

import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path


def _git(root: Path, *args: str, check: bool = True) -> str:
    out = subprocess.run(
        ["git", "-C", str(root), *args],
        check=check, capture_output=True, text=True,
    )
    return out.stdout


def _is_git_repo(root: Path) -> bool:
    if not (root / ".git").exists():
        for cand in root.parents:
            if (cand / ".git").exists():
                return True
        return False
    return True


def _now_label() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def save(root: Path, *, label: str | None = None,
         use_git: bool = True) -> dict:
    label = label or _now_label()
    if use_git and _is_git_repo(root):
        stash_msg = f"corpus-snapshot/{label}"
        out = _git(root, "stash", "push", "-u", "-m", stash_msg, check=False)
        if "No local changes to save" in out:
            return {"mode": "git", "label": label, "empty": True,
                    "stash_msg": stash_msg}
        return {"mode": "git", "label": label, "empty": False,
                "stash_msg": stash_msg}

    snap_dir = root / ".fars" / "snapshots" / label
    snap_dir.mkdir(parents=True, exist_ok=True)
    n = 0
    for md in root.rglob("*.md"):
        if ".git" in md.parts or ".fars" in md.parts:
            continue
        rel = md.relative_to(root)
        target = snap_dir / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(md, target)
        n += 1
    return {"mode": "fs", "label": label, "snap_dir": str(snap_dir),
            "n_files": n}


def restore(root: Path, label: str, *, use_git: bool = True) -> dict:
    stash_msg = f"corpus-snapshot/{label}"
    if use_git and _is_git_repo(root):
        out = _git(root, "stash", "list", check=False)
        match = None
        for line in out.splitlines():
            if stash_msg in line:
                match = line.split(":", 1)[0]
                break
        if match is None:
            return {"mode": "git", "ok": False,
                    "error": f"no stash with label {label!r}"}
        # Restore semantics, not merge semantics: overwrite working-tree
        # files with whatever they were in the stash. This loses any
        # post-snapshot edits to those files — that's the point of undo.
        # Files that didn't exist in the stash are left as-is.
        files_out = _git(root, "stash", "show", "--name-only", match, check=False)
        files = [line.strip() for line in files_out.splitlines() if line.strip()]
        if files:
            _git(root, "checkout", match, "--", *files, check=False)
        return {"mode": "git", "ok": True, "stash": match,
                "restored_files": len(files)}

    snap_dir = root / ".fars" / "snapshots" / label
    if not snap_dir.is_dir():
        return {"mode": "fs", "ok": False,
                "error": f"snapshot dir not found: {snap_dir}"}
    n = 0
    for md in snap_dir.rglob("*.md"):
        rel = md.relative_to(snap_dir)
        target = root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(md, target)
        n += 1
    return {"mode": "fs", "ok": True, "n_files": n}


def list_snapshots(root: Path) -> list[dict]:
    out: list[dict] = []
    if _is_git_repo(root):
        log = _git(root, "stash", "list", check=False)
        for line in log.splitlines():
            if "corpus-snapshot/" in line:
                stash, _, msg = line.partition(":")
                _, _, after = msg.partition("corpus-snapshot/")
                label = after.strip()
                out.append({"mode": "git", "label": label, "stash": stash.strip()})
    snap_root = root / ".fars" / "snapshots"
    if snap_root.is_dir():
        for d in sorted(snap_root.iterdir()):
            if d.is_dir():
                out.append({"mode": "fs", "label": d.name,
                            "path": str(d)})
    return out
