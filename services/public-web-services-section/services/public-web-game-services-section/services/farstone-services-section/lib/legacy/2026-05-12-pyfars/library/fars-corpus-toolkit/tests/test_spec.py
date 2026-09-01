"""Tests for the spec module: argparse + MCP-schema + help generators.

Each test exercises a different generator against a synthetic VerbSpec,
plus roundtrips through real migrated verbs (stats, impact, search) to
ensure the spec pipeline doesn't drift from the live CLIs.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from fars.spec import (
    Parameter, VerbSpec,
    format_help, kwargs_from_dict, make_argparse, make_json_schema, parse_kwargs,
    to_dict,
)


def _example_spec() -> VerbSpec:
    return VerbSpec(
        name="example",
        description="Example verb for testing.",
        example="corpus example foo --count 3",
        parameters=(
            Parameter(name="slug", kind="positional", required=True,
                      description="positional slug"),
            Parameter(name="root", kind="flag", type=Path, default=Path("."),
                      short="-r", description="corpus root"),
            Parameter(name="count", kind="flag", type=int, default=10,
                      description="count limit"),
            Parameter(name="dry_run", kind="store_true",
                      description="dry-run mode"),
            Parameter(name="set", kind="append", default=[],
                      description="repeatable k=v"),
        ),
    )


# --- argparse ---------------------------------------------------------------

def test_argparse_required_positional():
    spec = _example_spec()
    ap = make_argparse(spec)
    args = ap.parse_args(["foo"])
    assert args.slug == "foo"
    assert args.root == Path(".")
    assert args.count == 10
    assert args.dry_run is False


def test_argparse_flags():
    ap = make_argparse(_example_spec())
    args = ap.parse_args(["foo", "--count", "5", "--dry-run"])
    assert args.count == 5
    assert args.dry_run is True


def test_argparse_short_flag():
    ap = make_argparse(_example_spec())
    args = ap.parse_args(["foo", "-r", "/tmp"])
    assert args.root == Path("/tmp")


def test_argparse_append():
    ap = make_argparse(_example_spec())
    args = ap.parse_args(["foo", "--set", "a=1", "--set", "b=2"])
    assert args.set == ["a=1", "b=2"]


# --- JSON schema ------------------------------------------------------------

def test_json_schema_shape():
    schema = make_json_schema(_example_spec())
    assert schema["type"] == "object"
    assert "slug" in schema["properties"]
    assert schema["properties"]["count"]["type"] == "integer"
    assert schema["properties"]["dry_run"]["type"] == "boolean"
    assert schema["properties"]["set"]["type"] == "array"


def test_json_schema_required_only_positional():
    schema = make_json_schema(_example_spec())
    assert schema["required"] == ["slug"]


# --- kwargs roundtrip -------------------------------------------------------

def test_parse_kwargs():
    out = parse_kwargs(_example_spec(), ["foo", "--count", "7"])
    assert out["slug"] == "foo"
    assert out["count"] == 7


def test_kwargs_from_dict_coerces_types():
    out = kwargs_from_dict(_example_spec(),
                           {"slug": "foo", "count": "5", "root": "/tmp"})
    assert out["slug"] == "foo"
    assert out["count"] == 5
    assert isinstance(out["root"], Path)


def test_kwargs_from_dict_uses_defaults_for_missing():
    out = kwargs_from_dict(_example_spec(), {"slug": "foo"})
    assert out["count"] == 10
    assert out["dry_run"] is None  # bools without explicit default → None
    assert out["root"] == Path(".")


# --- help formatting --------------------------------------------------------

def test_format_help_contains_description_and_params():
    spec = _example_spec()
    out = format_help(spec)
    assert spec.description in out
    assert "## Parameters" in out
    assert "`slug`" in out
    assert "`count`" in out


# --- to_dict serializer -----------------------------------------------------

def test_to_dict_roundtrips_parameters():
    spec = _example_spec()
    d = to_dict(spec)
    assert d["name"] == "example"
    assert len(d["parameters"]) == 5
    assert d["parameters"][0]["name"] == "slug"
    assert d["parameters"][0]["kind"] == "positional"
    assert d["json_schema"]["type"] == "object"


# --- live spec sanity (migrated verbs) --------------------------------------

@pytest.mark.parametrize("verb_module", [
    "audit", "check", "cite", "commit", "compose", "context", "diff",
    "fm", "fm_keys", "from_template", "help", "impact", "index",
    "install_hooks", "lint", "list", "list_verbs", "mcp", "move",
    "new", "plan", "ramp", "rename_fm_key", "rewrite_slug", "search",
    "show", "snapshot", "stats", "undo", "validate", "where",
])
def test_migrated_verb_has_spec(verb_module: str):
    import importlib
    mod = importlib.import_module(f"fars.cli.{verb_module}")
    spec = getattr(mod, "SPEC", None)
    assert spec is not None, f"{verb_module} should have a SPEC"
    assert spec.description, f"{verb_module} SPEC needs a description"
    # All migrated verbs build a working argparse.
    ap = make_argparse(spec)
    assert ap.prog == f"corpus {spec.name}"


def test_only_query_and_watch_remain_legacy():
    """Migration discipline: every verb except sub-dispatchers has a SPEC."""
    import importlib
    from fars.cli.__main__ import VERB_MODULES
    legacy = []
    for verb, suffix in VERB_MODULES.items():
        try:
            mod = importlib.import_module(f"fars.cli.{suffix}")
        except ImportError:
            continue
        if getattr(mod, "SPEC", None) is None:
            legacy.append(verb)
    assert set(legacy) == {"query", "watch"}, (
        f"unexpected legacy verbs: {legacy} — query and watch are intentional "
        f"sub-dispatchers; everything else should be spec-driven."
    )


def test_migrated_verb_argparse_matches_live_help():
    """The live `fars stats --help` should include the spec description."""
    from fars.cli.stats import SPEC
    ap = make_argparse(SPEC)
    help_text = ap.format_help()
    # argparse line-wraps long descriptions; look for the first few words
    # rather than the whole sentence.
    first_words = SPEC.description.split()[:5]
    for w in first_words:
        assert w in help_text
