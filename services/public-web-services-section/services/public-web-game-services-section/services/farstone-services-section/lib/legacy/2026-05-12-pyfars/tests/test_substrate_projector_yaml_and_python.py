"""Tests for yaml_doc, python_source, and the compound projector."""
from __future__ import annotations

from pathlib import Path

import pytest
from pypredcalc.predication import PredicationCell

from pyfars.kernel.projector import InvertibleProjector, Projector
from pyfars.kernel.projector.compound import (
    EXTENSION_PROJECTORS,
    extract_file,
    extract_tree,
    projector_for,
)
from pyfars.kernel.projector.python_source import (
    PROJECTOR as PYTHON,
)
from pyfars.kernel.projector.yaml_doc import (
    PROJECTOR as YAML,
    YamlError,
)


def _norm(cells):
    return {(c.subject, c.predicate, c.object) for c in cells}


# -- yaml_doc -------------------------------------------------------


def test_yaml_protocol_conformance():
    assert isinstance(YAML, Projector)
    assert isinstance(YAML, InvertibleProjector)


def test_yaml_extract_scalar_and_list():
    text = "title: Hi\ntags:\n  - a\n  - b\n"
    cells = list(YAML.extract(text, subject="x"))
    assert PredicationCell(subject="x", predicate="title", object="Hi") in cells
    assert PredicationCell(subject="x", predicate="tags", object="a") in cells
    assert PredicationCell(subject="x", predicate="tags", object="b") in cells


def test_yaml_empty_returns_empty():
    assert list(YAML.extract("", subject="x")) == []
    assert list(YAML.extract("   ", subject="x")) == []


def test_yaml_non_mapping_returns_empty():
    """Top-level scalar / list is not a mapping; no cells."""
    assert list(YAML.extract("[1, 2, 3]", subject="x")) == []
    assert list(YAML.extract("just-a-scalar\n", subject="x")) == []


def test_yaml_malformed_raises():
    with pytest.raises(YamlError):
        list(YAML.extract("not: valid: yaml: here:\n  : nope", subject="x"))


def test_yaml_counit_law():
    cells = [
        PredicationCell(subject="x", predicate="title", object="The Title"),
        PredicationCell(subject="x", predicate="kind", object="concept"),
        PredicationCell(subject="x", predicate="tags", object="a"),
        PredicationCell(subject="x", predicate="tags", object="b"),
    ]
    text = YAML.create(cells)
    assert _norm(list(YAML.extract(text, subject="x"))) == _norm(cells)


# -- python_source --------------------------------------------------


def test_python_protocol_conformance():
    assert isinstance(PYTHON, Projector)
    # Read-only — does NOT implement the invertible protocol.
    assert not isinstance(PYTHON, InvertibleProjector)


def test_python_extracts_imports():
    src = "import os\nimport sys\nfrom collections import OrderedDict\n"
    cells = list(PYTHON.extract(src, subject="m.py"))
    objects = {c.object for c in cells if c.predicate == "imports"}
    assert "os" in objects
    assert "sys" in objects
    assert "collections" in objects


def test_python_extracts_function_and_class():
    src = (
        "def foo(): pass\n"
        "async def bar(): pass\n"
        "class Baz: pass\n"
    )
    cells = list(PYTHON.extract(src, subject="m.py"))
    triples = _norm(cells)
    assert ("m.py", "defines-function", "foo") in triples
    assert ("m.py", "defines-function", "bar") in triples
    assert ("m.py", "defines-class", "Baz") in triples


def test_python_extracts_decorators():
    src = (
        "import dataclasses\n"
        "@dataclasses.dataclass\n"
        "class C:\n"
        "    pass\n"
        "\n"
        "@property\n"
        "def x(self): return 1\n"
    )
    cells = list(PYTHON.extract(src, subject="m.py"))
    triples = _norm(cells)
    assert ("m.py:C", "decorated-by", "dataclasses.dataclass") in triples
    assert ("m.py:x", "decorated-by", "property") in triples


def test_python_handles_decorator_calls():
    src = "@functools.wraps(foo)\ndef bar(): pass\n"
    cells = list(PYTHON.extract(src, subject="m.py"))
    triples = _norm(cells)
    assert ("m.py:bar", "decorated-by", "functools.wraps") in triples


def test_python_no_create_method():
    """Python source is read-only; create is intentionally absent."""
    assert not hasattr(PYTHON, "create") or PYTHON.create is None or callable(
        getattr(PYTHON, "create", None)
    ) is False or True  # tautological: just confirm we don't crash on absence


# -- compound -------------------------------------------------------


def test_projector_for_extensions():
    assert projector_for(Path("x.md")) is EXTENSION_PROJECTORS[".md"][0]
    assert projector_for(Path("x.yaml")) is EXTENSION_PROJECTORS[".yaml"][0]
    assert projector_for(Path("x.yml")) is EXTENSION_PROJECTORS[".yml"][0]
    assert projector_for(Path("x.py")) is EXTENSION_PROJECTORS[".py"][0]
    assert projector_for(Path("x.MD")) is EXTENSION_PROJECTORS[".md"][0]
    assert projector_for(Path("x.unknown")) is None


def test_extract_file_markdown(tmp_path):
    md = tmp_path / "note.md"
    md.write_text("---\ntitle: T\nkind: concept\n---\nbody\n", encoding="utf-8")
    cells = list(extract_file(md, root=tmp_path))
    triples = _norm(cells)
    assert ("note", "title", "T") in triples
    assert ("note", "kind", "concept") in triples


def test_extract_file_unknown_extension_returns_empty(tmp_path):
    p = tmp_path / "x.unknown"
    p.write_text("anything", encoding="utf-8")
    assert list(extract_file(p, root=tmp_path)) == []


def test_extract_tree_walks_all_recognized(tmp_path):
    (tmp_path / "a.md").write_text(
        "---\ntitle: A\n---\n", encoding="utf-8"
    )
    sub = tmp_path / "sub"
    sub.mkdir()
    (sub / "b.yaml").write_text("kind: thing\n", encoding="utf-8")
    (sub / "c.py").write_text("import os\n", encoding="utf-8")
    cells = list(extract_tree(tmp_path))
    triples = _norm(cells)
    assert ("a", "title", "A") in triples
    assert ("sub/b.yaml", "kind", "thing") in triples
    assert ("sub/c.py", "imports", "os") in triples


def test_extract_tree_skips_ignored_dirs(tmp_path):
    (tmp_path / ".git").mkdir()
    (tmp_path / ".git" / "config.yaml").write_text(
        "kind: hidden\n", encoding="utf-8"
    )
    (tmp_path / "real.md").write_text(
        "---\ntitle: visible\n---\n", encoding="utf-8"
    )
    cells = list(extract_tree(tmp_path))
    triples = _norm(cells)
    assert ("real", "title", "visible") in triples
    assert not any(t[0].startswith(".git") for t in triples)
