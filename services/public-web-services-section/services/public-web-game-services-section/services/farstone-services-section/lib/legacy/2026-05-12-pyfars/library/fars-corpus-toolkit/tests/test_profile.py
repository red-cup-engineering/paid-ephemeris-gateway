"""Tests for fars.runtime.profile."""
import textwrap
from pathlib import Path

import pytest

from fars.runtime.profile import (
    Profile, discover_profile, find_profile_root, load_profile,
)


CONFIG_BASIC = textwrap.dedent("""
[instance]
name = "test-instance"
description = "for testing"

[substrate]
roots = ["src/", "docs/"]
skip = ["**/__pycache__/"]

[closure]
rules = ["broken_links", "orphans"]

[event_log]
dir = ".fars/event-log"

[[agents.registered]]
name = "test-agent"
capabilities = ["edit", "validate"]
skills = ["foo"]
""").strip()


def _write_instance(tmp_path: Path, config_text: str = CONFIG_BASIC) -> Path:
    fars_dir = tmp_path / ".fars"
    fars_dir.mkdir()
    (fars_dir / "config.toml").write_text(config_text + "\n")
    return tmp_path


def test_find_profile_root_at_root(tmp_path):
    root = _write_instance(tmp_path)
    assert find_profile_root(root) == root


def test_find_profile_root_walks_up(tmp_path):
    root = _write_instance(tmp_path)
    deep = root / "a" / "b" / "c"
    deep.mkdir(parents=True)
    assert find_profile_root(deep) == root


def test_find_profile_root_from_file(tmp_path):
    root = _write_instance(tmp_path)
    deep = root / "src" / "thing.md"
    deep.parent.mkdir(parents=True)
    deep.write_text("hi")
    assert find_profile_root(deep) == root


def test_find_profile_root_none_when_absent(tmp_path):
    assert find_profile_root(tmp_path) is None


def test_load_profile_reads_fields(tmp_path):
    root = _write_instance(tmp_path)
    p = load_profile(root)
    assert p.name == "test-instance"
    assert p.description == "for testing"
    assert p.substrate_roots == ("src/", "docs/")
    assert p.substrate_skip == ("**/__pycache__/",)
    assert p.closure_rules == ("broken_links", "orphans")
    assert p.event_log_dir == ".fars/event-log"


def test_load_profile_registers_agents(tmp_path):
    root = _write_instance(tmp_path)
    p = load_profile(root)
    a = p.agents.get("test-agent")
    assert a is not None
    assert a.has_capability("edit")
    assert a.has_capability("validate")
    assert a.has_skill("foo")


def test_discover_profile_finds_from_subdir(tmp_path):
    root = _write_instance(tmp_path)
    deep = root / "x" / "y"
    deep.mkdir(parents=True)
    p = discover_profile(deep)
    assert p is not None
    assert p.root == root
    assert p.name == "test-instance"


def test_discover_profile_returns_none(tmp_path):
    assert discover_profile(tmp_path) is None


def test_profile_path_helpers(tmp_path):
    root = _write_instance(tmp_path)
    p = load_profile(root)
    assert p.fars_dir == root / ".fars"
    assert p.config_path == root / ".fars" / "config.toml"
    assert p.profile_dir == root / ".fars" / "profile"
