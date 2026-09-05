"""Tests for nested-YAML projection in the markdown-frontmatter projector.

Nested YAML mappings in frontmatter project to dotted-path predicates
on the cell's subject. The polity's ``nix-package:`` block on a tool's
``_index.md`` becomes first-class cells like
``(<subject>, nix-package.input-name, <X>) = T``.
"""
from __future__ import annotations

from pypredcalc.predication import PredicationCell

from pyfars.kernel.projector.markdown_frontmatter import (
    MarkdownFrontmatterProjector,
)


def _cells(projector, text, subject):
    return list(projector.extract(text, subject=subject))


def test_flat_keys_unchanged():
    proj = MarkdownFrontmatterProjector()
    text = "---\ntype: agent\ntitle: Foo\n---\nbody\n"
    cells = _cells(proj, text, "foo")
    keyed = {(c.predicate, c.object) for c in cells}
    assert keyed == {("type", "agent"), ("title", "Foo")}


def test_nested_mapping_lowers_to_dotted_path():
    proj = MarkdownFrontmatterProjector()
    text = (
        "---\n"
        "type: tool\n"
        "nix-package:\n"
        "  input-name: pyfars\n"
        "  package-name: pyfars-cli\n"
        "---\n"
    )
    cells = _cells(proj, text, "tool-pyfars")
    keyed = {(c.predicate, c.object) for c in cells}
    assert keyed == {
        ("type", "tool"),
        ("nix-package.input-name", "pyfars"),
        ("nix-package.package-name", "pyfars-cli"),
    }


def test_list_inside_nested_mapping_fans_out():
    proj = MarkdownFrontmatterProjector()
    text = (
        "---\n"
        "nix-package:\n"
        "  follows-inputs:\n"
        "    - nixpkgs\n"
        "    - flake-utils\n"
        "---\n"
    )
    cells = _cells(proj, text, "x")
    follows = {c.object for c in cells
               if c.predicate == "nix-package.follows-inputs"}
    assert follows == {"nixpkgs", "flake-utils"}


def test_deeply_nested_mapping():
    proj = MarkdownFrontmatterProjector()
    text = (
        "---\n"
        "devshells:\n"
        "  dev:\n"
        "    purpose: development\n"
        "    packages:\n"
        "      nixpkgs:\n"
        "        - python\n"
        "        - uv\n"
        "---\n"
    )
    cells = _cells(proj, text, "asset")
    keyed = {(c.predicate, c.object) for c in cells}
    assert ("devshells.dev.purpose", "development") in keyed
    pkgs = {c.object for c in cells
            if c.predicate == "devshells.dev.packages.nixpkgs"}
    assert pkgs == {"python", "uv"}


def test_round_trip_preserves_nested_shape():
    """extract → create should reproduce the nested structure."""
    proj = MarkdownFrontmatterProjector()
    original = (
        "---\n"
        "type: tool\n"
        "nix-package:\n"
        "  input-name: pyfars\n"
        "  follows-inputs:\n"
        "  - nixpkgs\n"
        "  - flake-utils\n"
        "---\n"
    )
    cells = _cells(proj, original, "tool-pyfars")
    rendered = proj.create(cells)
    cells_again = _cells(proj, rendered, "tool-pyfars")
    keyed1 = sorted((c.predicate, str(c.object)) for c in cells)
    keyed2 = sorted((c.predicate, str(c.object)) for c in cells_again)
    assert keyed1 == keyed2


def test_create_lifts_dotted_path_to_yaml_mapping():
    """The inverse direction — dotted-path cells render as nested YAML."""
    proj = MarkdownFrontmatterProjector()
    cells = [
        PredicationCell(subject="x", predicate="type", object="tool"),
        PredicationCell(
            subject="x",
            predicate="nix-package.input-name",
            object="pyfars",
        ),
        PredicationCell(
            subject="x",
            predicate="nix-package.package-name",
            object="pyfars-cli",
        ),
    ]
    rendered = proj.create(cells)
    assert "nix-package:" in rendered
    assert "input-name: pyfars" in rendered
    assert "package-name: pyfars-cli" in rendered
