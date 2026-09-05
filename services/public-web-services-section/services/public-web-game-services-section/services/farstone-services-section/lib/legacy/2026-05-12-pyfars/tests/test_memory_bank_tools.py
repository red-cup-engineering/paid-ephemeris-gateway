"""Tests for the Memory-Bank tools — ``read_memory`` and ``update_memory_section``.

Session state lives at ``<root>/.pyfars/sessions/<session_id>.json``.
The tools provide structured (named-section) access to that state and
post a ``memory_section_updated`` witness when content changes. The
witness-post path goes through the UDS client; with no engine running
the tools degrade gracefully (the section update still succeeds, the
witness post returns ``engine_running: False``).
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from pyfars.sdk import tools
from pyfars.sdk.entities.session import MEMORY_BANK_SECTIONS, Session


def test_read_memory_returns_empty_for_missing_session(tmp_path: Path):
    result = tools.read_memory(
        root=tmp_path, session_id="fresh", section="active_context",
    )
    assert result.ok
    assert result.data["exists"] is False
    assert result.data["content"] == ""


def test_read_memory_returns_empty_dict_for_custom_when_missing(tmp_path: Path):
    result = tools.read_memory(
        root=tmp_path, session_id="fresh", section="custom",
    )
    assert result.ok
    assert result.data["content"] == {}


def test_read_memory_rejects_unknown_section(tmp_path: Path):
    result = tools.read_memory(
        root=tmp_path, session_id="x", section="not-a-section",
    )
    assert not result.ok
    assert "unknown memory-bank section" in result.error


def test_update_creates_session_file(tmp_path: Path):
    """update_memory_section writes a new session file on first save."""
    result = tools.update_memory_section(
        root=tmp_path,
        session_id="sess-1",
        section="active_context",
        content="working on the test rewrite",
    )
    assert result.ok
    session_file = tmp_path / ".pyfars" / "sessions" / "sess-1.json"
    assert session_file.is_file()


def test_update_then_read_round_trip(tmp_path: Path):
    update = tools.update_memory_section(
        root=tmp_path,
        session_id="sess-2",
        section="decision_log",
        content="adopted minimal Assignment shape",
    )
    assert update.ok
    read = tools.read_memory(
        root=tmp_path, session_id="sess-2", section="decision_log",
    )
    assert read.ok
    assert read.data["exists"] is True
    assert read.data["content"] == "adopted minimal Assignment shape"


def test_update_witness_path_degrades_without_engine(tmp_path: Path):
    """With no UDS socket on the polity root, the witness post returns
    a degraded result but the section update still completes."""
    result = tools.update_memory_section(
        root=tmp_path,
        session_id="sess-3",
        section="progress",
        content="halfway done",
    )
    assert result.ok
    assert result.data["witness"] == {"engine_running": False}
    session = Session.load(
        tmp_path / ".pyfars" / "sessions" / "sess-3.json", strict=False,
    )
    assert session.sections["progress"] == "halfway done"


def test_update_rejects_unknown_section(tmp_path: Path):
    result = tools.update_memory_section(
        root=tmp_path,
        session_id="sess-x",
        section="not-a-section",
        content="oops",
    )
    assert not result.ok
    assert "unknown memory-bank section" in result.error


@pytest.mark.parametrize("section", MEMORY_BANK_SECTIONS)
def test_all_named_sections_accepted(tmp_path: Path, section: str):
    """The five canonical Memory-Bank section names all round-trip."""
    update = tools.update_memory_section(
        root=tmp_path,
        session_id=f"each-{section}",
        section=section,
        content=f"content for {section}",
    )
    assert update.ok
    read = tools.read_memory(
        root=tmp_path, session_id=f"each-{section}", section=section,
    )
    assert read.data["content"] == f"content for {section}"
