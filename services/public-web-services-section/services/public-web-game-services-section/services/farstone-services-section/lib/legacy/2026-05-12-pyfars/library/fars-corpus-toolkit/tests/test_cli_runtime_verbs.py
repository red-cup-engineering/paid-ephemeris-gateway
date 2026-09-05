"""Smoke tests for the new runtime CLI verbs: agents, profile, witness-log."""
import textwrap
from pathlib import Path

import pytest

from fars.cli import agents as agents_cli
from fars.cli import profile as profile_cli
from fars.cli import witness_log as witness_log_cli
from fars.operator.witness import make_witness
from fars.runtime.event_log import EventLog


CONFIG = textwrap.dedent("""
[instance]
name = "test-instance"
description = "for tests"

[substrate]
roots = ["src/"]

[closure]
rules = ["broken_links"]

[event_log]
dir = ".fars/event-log"

[[agents.registered]]
name = "claude-code"
capabilities = ["edit"]
skills = ["foo"]
""").strip()


def _set_up_instance(tmp_path: Path) -> Path:
    """Create a `.fars/config.toml` at tmp_path."""
    fars_dir = tmp_path / ".fars"
    fars_dir.mkdir()
    (fars_dir / "config.toml").write_text(CONFIG + "\n")
    return tmp_path


def test_agents_lists_registered_agents(tmp_path, monkeypatch, capsys):
    _set_up_instance(tmp_path)
    monkeypatch.chdir(tmp_path)
    rc = agents_cli.run()
    assert rc == 0
    out = capsys.readouterr().out
    assert "claude-code" in out
    assert "edit" in out
    assert "foo" in out


def test_agents_no_profile_returns_2(tmp_path, monkeypatch, capsys):
    monkeypatch.chdir(tmp_path)
    rc = agents_cli.run()
    assert rc == 2


def test_profile_shows_discovered_instance(tmp_path, monkeypatch, capsys):
    _set_up_instance(tmp_path)
    monkeypatch.chdir(tmp_path)
    rc = profile_cli.run()
    assert rc == 0
    out = capsys.readouterr().out
    assert "test-instance" in out
    assert "broken_links" in out
    assert "claude-code" in out


def test_profile_no_instance(tmp_path, monkeypatch, capsys):
    monkeypatch.chdir(tmp_path)
    rc = profile_cli.run()
    assert rc == 2


def test_witness_log_empty(tmp_path, monkeypatch, capsys):
    _set_up_instance(tmp_path)
    monkeypatch.chdir(tmp_path)
    rc = witness_log_cli.run()
    assert rc == 0
    assert "empty" in capsys.readouterr().out


def test_witness_log_emits_human_format(tmp_path, monkeypatch, capsys):
    _set_up_instance(tmp_path)
    log = EventLog(root=tmp_path)
    log.append(make_witness("set_fm_field", "x.md", "h1", "h2",
                            details={"key": "status", "value": "proved"},
                            agent="claude-code"))
    log.append(make_witness("delete_flatfile", "y.md", "h3", None,
                            agent="ci"))
    monkeypatch.chdir(tmp_path)
    rc = witness_log_cli.run(tail=10, json=False)
    assert rc == 0
    out = capsys.readouterr().out
    assert "set_fm_field" in out
    assert "x.md" in out
    assert "agent=claude-code" in out
    assert "delete_flatfile" in out
    assert "agent=ci" in out


def test_witness_log_emits_jsonl(tmp_path, monkeypatch, capsys):
    _set_up_instance(tmp_path)
    log = EventLog(root=tmp_path)
    log.append(make_witness("op", "z.md", None, "h", details={}))
    monkeypatch.chdir(tmp_path)
    rc = witness_log_cli.run(tail=1, json=True)
    assert rc == 0
    out = capsys.readouterr().out.strip()
    import json
    parsed = json.loads(out)
    assert parsed["operator"] == "op"
    assert parsed["target"] == "z.md"
