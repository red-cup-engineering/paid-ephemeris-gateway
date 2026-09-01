"""Tests for compound projector — multi-projector dispatch + write-back."""
from __future__ import annotations

from pathlib import Path

import pytest
from pypredcalc.predication import PredicationCell

from pyfars.kernel.projector.compound import (
    create_file,
    create_tree,
    extract_file,
    extract_tree,
    invertible_projector_for,
    projectors_for,
)
from pyfars.kernel.projector.json_doc import (
    PROJECTOR as JSON_PROJ,
)
from pyfars.kernel.projector.markdown_body import (
    PROJECTOR as MD_BODY,
)
from pyfars.kernel.projector.markdown_frontmatter import (
    PROJECTOR as MD_FM,
)


def _norm(cells):
    return {(c.subject, c.predicate, c.object) for c in cells}


# -- multi-projector dispatch ---------------------------------------


def test_markdown_gets_both_frontmatter_and_body_projectors():
    projs = projectors_for(Path("note.md"))
    assert MD_FM in projs
    assert MD_BODY in projs


def test_extract_file_composes_md_frontmatter_and_body(tmp_path):
    md = tmp_path / "note.md"
    md.write_text(
        "---\n"
        "title: Hello\n"
        "kind: concept\n"
        "---\n"
        "# Heading\n"
        "\n"
        "See [other](other.md) for details.\n"
        "\n"
        "```python\n"
        "print('x')\n"
        "```\n",
        encoding="utf-8",
    )
    cells = list(extract_file(md, root=tmp_path))
    triples = _norm(cells)
    # Subject for .md files is the file stem (or fm slug, when authored).
    assert ("note", "title", "Hello") in triples
    assert ("note", "kind", "concept") in triples
    assert ("note", "has-heading", "Heading") in triples
    assert ("note", "links-to", "other.md") in triples
    assert ("note", "has-code-fence", "python") in triples
    # Routing cell so write-back can map cells back to the file.
    assert ("note", "projected-from-path", "note.md") in triples


def test_invertible_projector_for_md_returns_frontmatter():
    """Markdown's invertible projector is the frontmatter one (body is RO)."""
    proj = invertible_projector_for(Path("x.md"))
    assert proj is MD_FM


def test_invertible_projector_for_python_returns_none():
    """Python source is read-only — no invertible projector."""
    assert invertible_projector_for(Path("x.py")) is None


# -- json projector -------------------------------------------------


def test_json_extracts_object_keys():
    text = '{"title": "Hello", "tags": ["a", "b"]}'
    cells = list(JSON_PROJ.extract(text, subject="x"))
    triples = _norm(cells)
    assert ("x", "title", "Hello") in triples
    assert ("x", "tags", "a") in triples
    assert ("x", "tags", "b") in triples


def test_json_counit_law():
    cells = [
        PredicationCell(subject="x", predicate="title", object="Hello"),
        PredicationCell(subject="x", predicate="tags", object="a"),
        PredicationCell(subject="x", predicate="tags", object="b"),
    ]
    text = JSON_PROJ.create(cells)
    assert _norm(list(JSON_PROJ.extract(text, subject="x"))) == _norm(cells)


def test_compound_dispatches_to_json(tmp_path):
    p = tmp_path / "x.json"
    p.write_text('{"k": "v"}', encoding="utf-8")
    cells = list(extract_file(p, root=tmp_path))
    triples = _norm(cells)
    assert ("x.json", "k", "v") in triples
    assert ("x.json", "projected-from-path", "x.json") in triples


# -- write-back -----------------------------------------------------


def test_create_file_renders_markdown_frontmatter(tmp_path):
    p = tmp_path / "out.md"
    cells = [
        PredicationCell(subject="out.md", predicate="title", object="T"),
        PredicationCell(subject="out.md", predicate="kind", object="concept"),
    ]
    create_file(p, cells)
    text = p.read_text(encoding="utf-8")
    assert "title: T" in text
    assert "kind: concept" in text


def test_create_file_rejects_read_only_extension(tmp_path):
    p = tmp_path / "x.py"
    cells = [
        PredicationCell(subject="x.py", predicate="imports", object="os"),
    ]
    with pytest.raises(ValueError, match="no invertible projector"):
        create_file(p, cells)


def test_create_tree_round_trip(tmp_path):
    """extract_tree → create_tree → extract_tree preserves the cell set
    for invertible-extension files."""
    a = tmp_path / "a.md"
    a.write_text(
        "---\ntitle: A\nkind: concept\n---\n", encoding="utf-8",
    )
    b = tmp_path / "b.yaml"
    b.write_text("kind: thing\n", encoding="utf-8")
    # Read everything.
    cells_first = list(extract_tree(tmp_path))
    # Filter to only invertible-extension cells (skip code-fence /
    # links-to / etc. that body and Python projectors emit, since
    # those projectors don't write back).
    invertible_cells = [
        c for c in cells_first
        if c.predicate not in ("has-heading", "links-to", "has-code-fence",
                               "imports", "defines-function",
                               "defines-class", "decorated-by")
    ]
    # Wipe and re-create.
    a.unlink()
    b.unlink()
    written = create_tree(tmp_path, invertible_cells)
    assert written == 2
    assert a.is_file()
    assert b.is_file()
    cells_second = list(extract_tree(tmp_path))
    invertible_second = [
        c for c in cells_second
        if c.predicate not in ("has-heading", "links-to", "has-code-fence",
                               "imports", "defines-function",
                               "defines-class", "decorated-by")
    ]
    assert _norm(invertible_cells) == _norm(invertible_second)


def test_create_tree_rejects_traversal_subjects(tmp_path):
    """Subjects that escape root via ``..`` are rejected silently."""
    cells = [
        PredicationCell(
            subject="../escape.md", predicate="title", object="oops",
        ),
    ]
    written = create_tree(tmp_path, cells)
    assert written == 0
    assert not (tmp_path.parent / "escape.md").exists()


def test_create_tree_skips_unrecognized_extensions(tmp_path):
    cells = [
        PredicationCell(subject="x.unknown", predicate="k", object="v"),
    ]
    written = create_tree(tmp_path, cells)
    assert written == 0
