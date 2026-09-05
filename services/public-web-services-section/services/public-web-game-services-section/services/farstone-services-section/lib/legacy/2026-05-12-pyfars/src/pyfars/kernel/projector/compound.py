"""Compound projector — walks a directory and dispatches by extension.

Per PAM's prior art (esm-predication archive), the compound projector
is impure — it bridges two stateful systems (disk and the cell store).
Atomic projectors stay pure; this module is where filesystem reads
and writes live.

Two symmetric directions:

  * ``extract_tree(root)`` — walk every regular file under ``root``,
    look up its atomic projector by extension, and yield cells with
    ``subject = <root-relative-path>``.

  * ``create_tree(root, cells)`` — group cells by subject, look up
    each subject's atomic projector by extension, render bytes, and
    write to disk. (Implementation: groupby + dispatch; not yet
    wired here — first cut is read-only.)

Registry: a small dict ``EXTENSION_PROJECTORS`` mapping file
extensions to atomic projectors. Adding a new format is a single
registry entry.

Subject convention: the *POSIX-style* path relative to ``root``. So
the root README becomes ``"README.md"``, and a nested file becomes
``"docs/intro.md"``. This keeps subjects portable across operating
systems and stable when projects are moved on disk.
"""
from __future__ import annotations

from pathlib import Path
from typing import Callable, Iterable

from pypredcalc.predication import PredicationCell

from pyfars.kernel.projector import InvertibleProjector, Projector
from pyfars.kernel.projector.ledger import (
    ProjectionConflict,
    append_record,
    check_writable,
)
from pyfars.kernel.projector.json_doc import (
    PROJECTOR as _JSON_PROJECTOR,
)
from pyfars.kernel.projector.markdown_body import (
    PROJECTOR as _MARKDOWN_BODY_PROJECTOR,
)
from pyfars.kernel.projector.markdown_frontmatter import (
    PROJECTOR as _MARKDOWN_FM_PROJECTOR,
)
from pyfars.kernel.projector.python_source import (
    PROJECTOR as _PYTHON_PROJECTOR,
)
from pyfars.kernel.projector.yaml_doc import (
    PROJECTOR as _YAML_PROJECTOR,
)


# Extension → list of atomic projectors that apply. Multi-projector
# extensions (``.md``: frontmatter + body) compose their cells into
# one stream. Add a new format by importing its PROJECTOR and adding
# an entry here. Match-on-suffix is case-insensitive.
EXTENSION_PROJECTORS: dict[str, tuple[Projector, ...]] = {
    ".md": (_MARKDOWN_FM_PROJECTOR, _MARKDOWN_BODY_PROJECTOR),
    ".markdown": (_MARKDOWN_FM_PROJECTOR, _MARKDOWN_BODY_PROJECTOR),
    ".yaml": (_YAML_PROJECTOR,),
    ".yml": (_YAML_PROJECTOR,),
    ".json": (_JSON_PROJECTOR,),
    ".py": (_PYTHON_PROJECTOR,),
}


def projectors_for(path: Path) -> tuple[Projector, ...]:
    """Return the atomic projectors registered for ``path``.

    Returns ``()`` if the extension is unrecognized. May return more
    than one (e.g. markdown gets both frontmatter and body
    projectors); callers compose their cells into one stream.
    """
    return EXTENSION_PROJECTORS.get(path.suffix.lower(), ())


def projector_for(path: Path) -> Projector | None:
    """First registered projector for ``path``, or ``None``.

    Convenience for callers that only want one projector — when the
    extension is invertible-mapped (e.g. ``.md`` carries both fm and
    body projectors), this returns the first (the *invertible* one,
    by registry convention). Use ``projectors_for`` for the full list.
    """
    projectors = projectors_for(path)
    return projectors[0] if projectors else None


def _posix_path_subject(path: Path, root: Path | None) -> str:
    """POSIX-style relative subject if ``root`` is given, else absolute path."""
    if root is not None:
        try:
            return path.resolve().relative_to(root.resolve()).as_posix()
        except ValueError:
            return path.as_posix()
    return path.as_posix()


def _markdown_subject(path: Path) -> str:
    """For ``.md`` files: prefer frontmatter ``slug:`` if authored, else
    the file stem (with sentinel-stems disambiguated by parent dir).

    Matches the load-directory's :class:`Flatfile.slug` convention so
    every cell-store consumer sees the same subject regardless of
    which projector emitted the cell.
    """
    from pyfars.kernel.projector.parse.frontmatter import parse as parse_fm
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return path.stem
    try:
        fm, _ = parse_fm(text)
    except Exception:
        fm = None
    if isinstance(fm, dict):
        slug = fm.get("slug")
        if isinstance(slug, str) and slug:
            return slug
    parent = path.parent.name
    if path.name == "_index.md":
        return f"{parent}-index"
    if path.name == "SKILL.md":
        return f"{parent}-skill"
    return path.stem


def _subject_for(path: Path, root: Path | None) -> str:
    """Canonical subject for a file's cells.

    For ``.md`` files: frontmatter ``slug:`` if authored, else the file
    stem — the load-directory convention, so the cell store has one
    semantic-identity space across markdown sources. For non-markdown
    formats: POSIX-relative path with extension — there's no
    frontmatter to derive identity from, and the path is the only
    natural identity.
    """
    if path.suffix.lower() in {".md", ".markdown"}:
        return _markdown_subject(path)
    return _posix_path_subject(path, root)


def extract_file(path: Path, *,
                 root: Path | None = None) -> Iterable[PredicationCell]:
    """Project a single file through every registered projector.

    Multiple projectors per extension (e.g. markdown's frontmatter +
    body) compose into one cell stream. Returns ``[]`` for
    unrecognized extensions. Raises whatever the atomic projectors
    raise on malformed content.

    Always emits one extra cell ``(subject, projected-from-path,
    <rel-path>) = T`` so the ledger / write-back layer can map cells
    back to files.
    """
    projectors = projectors_for(path)
    if not projectors:
        return ()
    subject = _subject_for(path, root)
    text = path.read_text(encoding="utf-8")
    out: list[PredicationCell] = []
    for proj in projectors:
        out.extend(proj.extract(text, subject=subject))
    rel_path = _posix_path_subject(path, root)
    out.append(PredicationCell(
        subject=subject,
        predicate="projected-from-path",
        object=rel_path,
    ))
    return out


_DEFAULT_IGNORE_DIRS: frozenset[str] = frozenset({
    ".git", ".pyfars", ".claude", ".openclaw",
    "__pycache__", "node_modules", ".venv", "venv",
    "build", "dist", "result", "result-bin",
})


def _default_path_filter(rel: Path) -> bool:
    if rel.name == "README.md":
        return False
    return not any(p in _DEFAULT_IGNORE_DIRS for p in rel.parts)


def extract_tree(
    root: Path,
    *,
    path_filter: Callable[[Path], bool] | None = None,
    tolerant: bool = True,
) -> Iterable[PredicationCell]:
    """Walk ``root`` and yield cells from every recognized file.

    ``path_filter`` is called with each file's ``Path`` relative to
    ``root``; truthy keeps the file. Default skips build / cache / VCS
    dirs and READMEs. On projector error: when ``tolerant`` is ``True``
    (default), yield a ``(rel-path, has-projection-error, <msg>) = T``
    finding cell and continue. ``tolerant=False`` propagates.
    """
    keep = path_filter or _default_path_filter
    root = root.resolve()
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if not keep(rel):
            continue
        try:
            cells = list(extract_file(path, root=root))
        except Exception as e:
            if not tolerant:
                raise
            yield PredicationCell(
                subject=rel.as_posix(),
                predicate="has-projection-error",
                object=str(e),
            )
            continue
        for cell in cells:
            yield cell


def invertible_projector_for(path: Path) -> InvertibleProjector | None:
    """The first ``InvertibleProjector`` registered for ``path``, if any.

    ``create_file`` uses this to decide whether write-back is
    supported for the file's extension. Read-only projectors
    (Python source, markdown body) are filtered out.
    """
    for proj in projectors_for(path):
        if isinstance(proj, InvertibleProjector):
            return proj
    return None


def create_file(path: Path, cells: Iterable[PredicationCell], *,
                encoding: str = "utf-8",
                root: Path | None = None) -> None:
    """Render ``cells`` to ``path`` via the file's invertible projector.

    Raises ``ValueError`` if the extension has no invertible
    projector (i.e. the file format is read-only from the
    system's perspective). The file's parent directory is created
    if it does not exist.

    When ``root`` is given, the call is gated by the projection
    ledger at ``<root>/.pyfars/projections.jsonl``: if the target
    file already exists, its bytes must hash to the most recent
    recorded projection for the same subject, otherwise
    ``ProjectionConflict`` is raised. After a successful write, a
    new ledger record is appended. Pass ``root=None`` to bypass the
    ledger entirely (legacy callers; not recommended for production
    system writes).

    Note: when a path's projectors include both an invertible and a
    read-only one (e.g. markdown = frontmatter + body), only the
    invertible projector renders. Body content of multi-projector
    files is supplied separately (e.g. by passing a ``body`` keyword
    that the projector's ``create`` accepts) — the basic
    ``create_file`` path here renders frontmatter-only documents.
    """
    proj = invertible_projector_for(path)
    if proj is None:
        raise ValueError(
            f"no invertible projector registered for {path.suffix!r}"
        )
    rendered = proj.create(cells)
    if not isinstance(rendered, (str, bytes)):
        raise TypeError(
            f"projector {proj.name!r} create() returned "
            f"{type(rendered).__name__}, expected str or bytes"
        )
    if isinstance(rendered, bytes):
        content_bytes = rendered
    else:
        content_bytes = rendered.encode(encoding)
    # Ledger keys by POSIX-relative path — the ledger tracks *files*,
    # not cell subjects. Two different cell subjects can share a path
    # only if the system is broken; the ledger is the wrong place to
    # paper over that.
    ledger_key = (
        _posix_path_subject(path, root) if root is not None else None
    )
    if root is not None and ledger_key is not None:
        check_writable(root, path, ledger_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content_bytes)
    if root is not None and ledger_key is not None:
        append_record(root, ledger_key, content_bytes)


def create_tree(root: Path, cells: Iterable[PredicationCell]) -> int:
    """Group cells by subject; render each subject's file via its projector.

    Routing: each subject's ``projected-from-path`` cell names the
    file the subject's cells render back to. Subjects without a
    ``projected-from-path`` cell are skipped (the system has no
    recorded provenance for where to write them). Cells with the same
    subject are grouped and passed as one batch. Returns the number
    of files written.

    Symmetric partner of ``extract_tree`` — extract reads bytes and
    produces cells; create groups cells by subject and writes bytes
    back. The compound projector is impure by construction; atomic
    projectors stay pure.
    """
    by_subject: dict[str, list[PredicationCell]] = {}
    path_for_subject: dict[str, str] = {}
    for cell in cells:
        sid = str(cell.subject)
        by_subject.setdefault(sid, []).append(cell)
        if cell.predicate == "projected-from-path":
            path_for_subject[sid] = str(cell.object)
    written = 0
    for subject, subject_cells in by_subject.items():
        # Routing precedence: explicit ``projected-from-path`` cell,
        # else fall back to treating the subject as the path. The
        # fallback supports raw-cell call sites that haven't yet
        # adopted the routing-cell convention; the subject must look
        # like a relative file path under ``root``.
        rel_path = path_for_subject.get(subject, subject)
        path = (root / rel_path).resolve()
        if not path.is_relative_to(root.resolve()):
            continue
        if invertible_projector_for(path) is None:
            continue
        # Drop the routing cell from the cells passed to the projector
        # (it's system metadata, not file content).
        content_cells = [
            c for c in subject_cells if c.predicate != "projected-from-path"
        ]
        create_file(path, content_cells, root=root)
        written += 1
    return written


__all__ = [
    "EXTENSION_PROJECTORS",
    "ProjectionConflict",
    "create_file",
    "create_tree",
    "extract_file",
    "extract_tree",
    "invertible_projector_for",
    "projector_for",
    "projectors_for",
]
