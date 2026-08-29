"""Tests for ``pyfars.kernel.projector.markdown_frontmatter``.

Counit law: ``extract(create(cells)) ≈ cells``. The projector is the
canonical adjoint pair between markdown-frontmatter bytes and
predication cells.
"""
from __future__ import annotations

from pypredcalc.predication import PredicationCell

from pyfars.kernel.projector import InvertibleProjector, Projector
from pyfars.kernel.projector.markdown_frontmatter import (
    PROJECTOR,
    MarkdownFrontmatterProjector,
)


def test_protocol_conformance():
    assert isinstance(PROJECTOR, Projector)
    assert isinstance(PROJECTOR, InvertibleProjector)


def test_extract_scalar_keys():
    text = (
        "---\n"
        "title: Hello\n"
        "kind: concept\n"
        "---\n"
        "Body content here.\n"
    )
    cells = list(PROJECTOR.extract(text, subject="hello"))
    assert PredicationCell(subject="hello", predicate="title",
                           object="Hello") in cells
    assert PredicationCell(subject="hello", predicate="kind",
                           object="concept") in cells
    assert len(cells) == 2


def test_extract_list_value_fans_out():
    text = (
        "---\n"
        "depends-on:\n"
        "  - foo\n"
        "  - bar\n"
        "  - baz\n"
        "---\n"
    )
    cells = list(PROJECTOR.extract(text, subject="x"))
    assert len(cells) == 3
    objects = [c.object for c in cells]
    assert objects == ["foo", "bar", "baz"]
    assert all(c.predicate == "depends-on" for c in cells)


def test_extract_returns_nothing_when_no_frontmatter():
    text = "Just a body, no fm.\n"
    cells = list(PROJECTOR.extract(text, subject="x"))
    assert cells == []


def test_extract_skips_empty_and_null_values():
    text = (
        "---\n"
        "title: \"\"\n"
        "tags: ~\n"
        "kind: concept\n"
        "---\n"
    )
    cells = list(PROJECTOR.extract(text, subject="x"))
    assert len(cells) == 1
    assert cells[0].predicate == "kind"


def test_extract_skips_nested_mappings():
    """Nested dicts are out of scope; a separate projector can handle them."""
    text = (
        "---\n"
        "title: hi\n"
        "frontmatter-meta:\n"
        "  nested: yes\n"
        "---\n"
    )
    cells = list(PROJECTOR.extract(text, subject="x"))
    predicates = {c.predicate for c in cells}
    assert "title" in predicates
    assert "frontmatter-meta" not in predicates


def test_create_emits_well_formed_document():
    cells = [
        PredicationCell(subject="x", predicate="title", object="Hello"),
        PredicationCell(subject="x", predicate="kind", object="concept"),
    ]
    text = PROJECTOR.create(cells)
    assert text.startswith("---\n")
    assert "title: Hello" in text
    assert "kind: concept" in text
    assert text.rstrip().endswith("---")


def test_create_collapses_same_predicate_to_list():
    cells = [
        PredicationCell(subject="x", predicate="depends-on", object="foo"),
        PredicationCell(subject="x", predicate="depends-on", object="bar"),
    ]
    text = PROJECTOR.create(cells)
    assert "depends-on:" in text
    assert "- foo" in text
    assert "- bar" in text


def test_create_appends_body():
    cells = [PredicationCell(subject="x", predicate="kind",
                             object="concept")]
    text = PROJECTOR.create(cells, body="# body content\n")
    assert text.endswith("# body content\n")


# -- counit law -----------------------------------------------------


def _normalize(cells):
    """Set-of-tuples representation for order-insensitive comparison."""
    return {(c.subject, c.predicate, c.object) for c in cells}


def test_counit_law_scalar():
    cells = [
        PredicationCell(subject="x", predicate="title", object="Hello"),
        PredicationCell(subject="x", predicate="kind", object="concept"),
    ]
    text = PROJECTOR.create(cells)
    re_extracted = list(PROJECTOR.extract(text, subject="x"))
    assert _normalize(re_extracted) == _normalize(cells)


def test_counit_law_list_value():
    cells = [
        PredicationCell(subject="x", predicate="depends-on", object="foo"),
        PredicationCell(subject="x", predicate="depends-on", object="bar"),
        PredicationCell(subject="x", predicate="depends-on", object="baz"),
    ]
    text = PROJECTOR.create(cells)
    re_extracted = list(PROJECTOR.extract(text, subject="x"))
    assert _normalize(re_extracted) == _normalize(cells)


def test_counit_law_mixed():
    cells = [
        PredicationCell(subject="x", predicate="title", object="The Title"),
        PredicationCell(subject="x", predicate="kind", object="concept"),
        PredicationCell(subject="x", predicate="depends-on", object="a"),
        PredicationCell(subject="x", predicate="depends-on", object="b"),
        PredicationCell(subject="x", predicate="status", object="draft"),
    ]
    text = PROJECTOR.create(cells)
    re_extracted = list(PROJECTOR.extract(text, subject="x"))
    assert _normalize(re_extracted) == _normalize(cells)


def test_counit_law_with_body_preserved():
    """Body round-trips because it's not part of the claim image."""
    cells = [PredicationCell(subject="x", predicate="kind",
                             object="concept")]
    body = "# Heading\n\nParagraph text.\n"
    text = PROJECTOR.create(cells, body=body)
    re_extracted = list(PROJECTOR.extract(text, subject="x"))
    assert _normalize(re_extracted) == _normalize(cells)
    # And the body lives in the document.
    assert "# Heading" in text


def test_idempotence_on_image():
    """extract ∘ create ∘ extract == extract — true projector behaviour."""
    text = (
        "---\n"
        "title: T\n"
        "depends-on:\n"
        "  - a\n"
        "  - b\n"
        "---\n"
        "body\n"
    )
    once = list(PROJECTOR.extract(text, subject="x"))
    re_text = PROJECTOR.create(once)
    twice = list(PROJECTOR.extract(re_text, subject="x"))
    assert _normalize(once) == _normalize(twice)


def test_create_is_no_op_on_empty_cells():
    assert PROJECTOR.create([]) == ""
    assert PROJECTOR.create([], body="hi\n") == "hi\n"
