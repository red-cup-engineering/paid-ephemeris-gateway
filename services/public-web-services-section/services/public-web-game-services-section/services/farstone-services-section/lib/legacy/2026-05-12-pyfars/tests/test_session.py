"""Tests for pyfars.sdk.entities.session — structured session memory."""
from pathlib import Path

import pytest

from pyfars.sdk.entities.session import MEMORY_BANK_SECTIONS, Session


def test_session_initializes_canonical_memory_bank_sections():
    """Per the session-and-memory discipline: memory is structured in
    named sections, not free-form. All five canonical sections must be
    present even when the caller supplies none."""
    s = Session(id="alpha")
    for name in MEMORY_BANK_SECTIONS:
        assert name in s.sections
    assert s.sections["custom"] == {}


def test_session_update_section_rejects_unknown_keys():
    """Adding a new top-level key would re-open the free-form text
    failure mode the discipline explicitly rejects."""
    s = Session(id="alpha")
    with pytest.raises(KeyError):
        s.update_section("freeform_notes", "anything")


def test_session_set_custom_extends_open_dict():
    """The ``custom`` section is the sanctioned extension point for
    office-specific predicates the canonical sections don't cover."""
    s = Session(id="alpha")
    s.set_custom("recent_target", "operations/engineering/pyfars/")
    assert s.sections["custom"]["recent_target"].endswith("pyfars/")


def test_session_save_and_load_round_trip(tmp_path):
    """Explicit save/resume preserves working state across
    disconnection — every named section, the bound office, and the
    lifecycle timestamps round-trip exactly."""
    s = Session(id="beta", office="comms")
    s.update_section("active_context", "drafting witness wiring")
    s.set_custom("ticket", "FARS-123")
    s.start()
    out = tmp_path / "beta.json"
    s.save(out)

    loaded = Session.load(out)
    assert loaded.id == "beta"
    assert loaded.office == "comms"
    assert loaded.sections["active_context"] == "drafting witness wiring"
    assert loaded.sections["custom"]["ticket"] == "FARS-123"
    assert loaded.started_at == s.started_at
    assert loaded.saved_at == s.saved_at


def test_session_start_is_idempotent_on_started_at():
    """Resuming an existing session must not overwrite its original
    start timestamp."""
    s = Session(id="zeta")
    s.start()
    original = s.started_at
    s.start()
    assert s.started_at == original


def test_session_id_must_be_a_safe_slug():
    """The id flows into a filename — path-traversal and shell-special
    characters must be rejected at construction, not at save time."""
    for bad in ("../escape", "a/b", ".hidden", "..", "with space",
                "tab\tchar", ""):
        with pytest.raises(ValueError):
            Session(id=bad)
    Session(id="ok-id_1.2")  # no raise


def test_session_load_strict_rejects_unknown_top_level_sections(tmp_path):
    """Structure enforcement must hold at load time, not just at
    update_section time — otherwise hand-edited JSON could re-introduce
    free-form keys the discipline explicitly forbids."""
    path = tmp_path / "bad.json"
    path.write_text(
        '{"id":"x","sections":{"freeform":"oops","active_context":""}}',
        encoding="utf-8",
    )
    with pytest.raises(ValueError):
        Session.load(path)


def test_session_load_non_strict_quarantines_unknown_keys(tmp_path):
    """Migration mode: tolerate the unknown key but isolate it under
    custom._unknown so the consumer can see it without it becoming
    first-class state."""
    path = tmp_path / "bad.json"
    path.write_text(
        '{"id":"x","sections":{"freeform":"oops","active_context":""}}',
        encoding="utf-8",
    )
    s = Session.load(path, strict=False)
    assert "freeform" not in s.sections
    assert s.sections["custom"]["_unknown"]["freeform"] == "oops"


def test_session_load_rejects_malformed_files(tmp_path):
    """Defensive parsing: missing id, non-object root, or non-mapping
    sections all surface as explicit errors, not silent corruption."""
    no_id = tmp_path / "noid.json"
    no_id.write_text('{"sections": {}}', encoding="utf-8")
    with pytest.raises(ValueError):
        Session.load(no_id)

    not_obj = tmp_path / "notobj.json"
    not_obj.write_text('["array", "root"]', encoding="utf-8")
    with pytest.raises(ValueError):
        Session.load(not_obj)

    bad_sections = tmp_path / "bad.json"
    bad_sections.write_text('{"id":"x","sections":"string"}',
                            encoding="utf-8")
    with pytest.raises(ValueError):
        Session.load(bad_sections)


def test_session_load_rejects_falsey_non_mapping_custom(tmp_path):
    """Closes a falsy-bypass in load(): a JSON ``custom`` of ``[]``,
    ``""``, ``0``, or ``false`` must still trip the type check, not
    sneak past because the value happens to be falsy."""
    for bad_custom in ("[]", '""', "0", "false"):
        path = tmp_path / f"bad-{bad_custom}.json"
        path.write_text(
            f'{{"id":"x","sections":{{"custom":{bad_custom}}}}}',
            encoding="utf-8",
        )
        with pytest.raises(ValueError):
            Session.load(path)


def test_session_constructor_rejects_non_mapping_custom():
    """Same invariant in-memory: callers can't bypass load() by
    constructing a Session directly with a list/string custom."""
    with pytest.raises((TypeError, ValueError)):
        Session(id="x", sections={"custom": []})
