"""Optional sqlite cache of parsed notes for sub-second whole-repo loads.

The cache stores one row per loaded ``.md`` file: the path (relative to
root), mtime, kind, dir, slug, fm (as JSON), and body. On re-load,
``fars.substrate.load.notes`` can compare on-disk mtimes to the cache and only
re-parse changed files.

Cache location: ``<root>/.corpus/cache.sqlite``.

The cache is opt-in. ``load.notes.load`` doesn't use it by default;
callers (or the ``fars index`` verb) build/refresh it explicitly,
and pass ``cache=True`` when calling ``load`` to consume it.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Iterable

from fars.substrate.flatfile import Flatfile

CACHE_REL = Path(".fars") / "cache.sqlite"
SCHEMA_VERSION = 1


def _open(root: Path) -> sqlite3.Connection:
    cache_path = root / CACHE_REL
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(cache_path)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE IF NOT EXISTS notes (
            path TEXT PRIMARY KEY,
            mtime REAL NOT NULL,
            slug TEXT NOT NULL,
            dir TEXT NOT NULL,
            kind TEXT NOT NULL,
            fm_json TEXT NOT NULL,
            body TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS notes_slug ON notes(slug);
        CREATE INDEX IF NOT EXISTS notes_kind ON notes(kind);
        """
    )
    cur = conn.execute("SELECT value FROM meta WHERE key = 'schema_version'")
    row = cur.fetchone()
    if row is None:
        conn.execute(
            "INSERT INTO meta (key, value) VALUES ('schema_version', ?)",
            (str(SCHEMA_VERSION),),
        )
    elif int(row[0]) != SCHEMA_VERSION:
        conn.executescript("DROP TABLE notes; ")
        return _open(root)
    return conn


def write(root: Path, notes: Iterable[Flatfile]) -> int:
    conn = _open(root)
    rows = []
    paths = set()
    for n in notes:
        rel = str(n.path).replace("\\", "/")
        rows.append((
            rel, float(n.mtime), n.slug, n.dir, n.kind,
            json.dumps(n.fm, default=str), n.body,
        ))
        paths.add(rel)
    with conn:
        conn.execute("DELETE FROM notes")
        conn.executemany(
            "INSERT INTO notes (path, mtime, slug, dir, kind, fm_json, body) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            rows,
        )
    conn.close()
    return len(rows)


def read(root: Path) -> list[Flatfile] | None:
    cache_path = root / CACHE_REL
    if not cache_path.is_file():
        return None
    conn = _open(root)
    out: list[Flatfile] = []
    for path, mtime, slug, dir_, kind, fm_json, body in conn.execute(
        "SELECT path, mtime, slug, dir, kind, fm_json, body FROM notes",
    ):
        out.append(Flatfile(
            slug=slug, dir=dir_, kind=kind,
            fm=json.loads(fm_json), body=body,
            path=Path(path), mtime=mtime,
        ))
    conn.close()
    return out


def is_fresh(root: Path) -> bool:
    """True iff every loadable .md file's mtime matches the cache.

    Mirrors the load layer's "no frontmatter → skip silently" rule by
    peeking at each file's first four bytes; only files starting with
    ``---`` are expected in the cache.
    """
    cache_path = root / CACHE_REL
    if not cache_path.is_file():
        return False
    conn = _open(root)
    cached: dict[str, float] = {}
    for path, mtime in conn.execute("SELECT path, mtime FROM notes"):
        cached[path] = mtime
    conn.close()

    on_disk: dict[str, float] = {}
    from fars.substrate.load._path_filter import keep
    for p in root.rglob("*.md"):
        rel_path = p.relative_to(root)
        if not keep(rel_path):
            continue
        try:
            with p.open("rb") as fh:
                head = fh.read(4)
        except OSError:
            continue
        if not head.startswith(b"---"):
            continue
        rel = str(rel_path).replace("\\", "/")
        try:
            on_disk[rel] = p.stat().st_mtime
        except OSError:
            continue

    if set(cached) != set(on_disk):
        return False
    for k, v in cached.items():
        if abs(v - on_disk[k]) > 0.001:
            return False
    return True
