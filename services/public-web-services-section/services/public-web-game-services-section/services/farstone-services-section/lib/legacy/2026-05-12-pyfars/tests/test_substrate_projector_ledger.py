"""Projection ledger — pre-write conflict checks and append-on-write."""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from pypredcalc.predication import PredicationCell

from pyfars.kernel.projector.compound import (
    ProjectionConflict,
    create_file,
    create_tree,
)
from pyfars.kernel.projector.ledger import (
    LEDGER_RELPATH,
    PROJECTED_PREDICATE,
    ProjectionRecord,
    append_record,
    check_writable,
    hash_file,
    last_record_for,
    read_records,
    to_cells,
)


def _ledger_lines(root: Path) -> list[dict]:
    p = root / LEDGER_RELPATH
    if not p.is_file():
        return []
    return [
        json.loads(line)
        for line in p.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def test_create_file_records_projection(tmp_path):
    p = tmp_path / "out.md"
    cells = [PredicationCell(subject="out.md", predicate="title",
                             object="T")]
    create_file(p, cells, root=tmp_path)
    lines = _ledger_lines(tmp_path)
    assert len(lines) == 1
    assert lines[0]["subject"] == "out.md"
    assert lines[0]["sha256"] == hash_file(p)
    assert lines[0]["byte_length"] == p.stat().st_size


def test_create_file_no_root_skips_ledger(tmp_path):
    p = tmp_path / "out.md"
    cells = [PredicationCell(subject="out.md", predicate="title",
                             object="T")]
    create_file(p, cells)  # root omitted
    assert not (tmp_path / LEDGER_RELPATH).exists()


def test_create_file_round_trip_after_self_write_succeeds(tmp_path):
    p = tmp_path / "out.md"
    cells = [PredicationCell(subject="out.md", predicate="title",
                             object="T")]
    create_file(p, cells, root=tmp_path)
    # Same write again — file matches the recorded hash, so OK.
    create_file(p, cells, root=tmp_path)
    lines = _ledger_lines(tmp_path)
    assert len(lines) == 2
    assert lines[0]["sha256"] == lines[1]["sha256"]


def test_create_file_refuses_to_overwrite_external_edit(tmp_path):
    p = tmp_path / "out.md"
    cells = [PredicationCell(subject="out.md", predicate="title",
                             object="T")]
    create_file(p, cells, root=tmp_path)
    # External actor edits the file.
    p.write_text("manually edited\n", encoding="utf-8")
    cells2 = [PredicationCell(subject="out.md", predicate="title",
                              object="U")]
    with pytest.raises(ProjectionConflict, match="does not match"):
        create_file(p, cells2, root=tmp_path)


def test_create_file_refuses_to_overwrite_unrecorded_file(tmp_path):
    p = tmp_path / "out.md"
    p.write_text(
        "---\ntitle: Pre-existing\n---\n", encoding="utf-8",
    )
    cells = [PredicationCell(subject="out.md", predicate="title",
                             object="T")]
    with pytest.raises(ProjectionConflict, match="no record"):
        create_file(p, cells, root=tmp_path)


def test_create_file_after_recording_then_changes_writes_new_record(
        tmp_path):
    p = tmp_path / "out.md"
    cells_a = [PredicationCell(subject="out.md", predicate="title",
                               object="A")]
    cells_b = [PredicationCell(subject="out.md", predicate="title",
                               object="B")]
    create_file(p, cells_a, root=tmp_path)
    create_file(p, cells_b, root=tmp_path)  # legitimate update
    records = read_records(tmp_path)
    assert len(records) == 2
    latest = last_record_for(tmp_path, "out.md")
    assert latest is not None
    assert latest.sha256 == hash_file(p)


def test_check_writable_passes_when_file_absent(tmp_path):
    # No file, no record — fine.
    check_writable(tmp_path, tmp_path / "missing.md", "missing.md")


def test_create_tree_threads_root_into_ledger(tmp_path):
    cells = [
        PredicationCell(subject="a.md", predicate="title", object="A"),
        PredicationCell(subject="b.yaml", predicate="kind", object="thing"),
    ]
    written = create_tree(tmp_path, cells)
    assert written == 2
    subjects = {r.subject for r in read_records(tmp_path)}
    assert subjects == {"a.md", "b.yaml"}


def test_create_tree_refuses_when_one_subject_conflicts(tmp_path):
    # Pre-existing un-recorded a.md; b.yaml is new. The conflict on
    # a.md should propagate; b.yaml should still be written before the
    # raise (or not — order is dict-iteration order, so just check the
    # raise happens).
    (tmp_path / "a.md").write_text("preexisting\n", encoding="utf-8")
    cells = [
        PredicationCell(subject="a.md", predicate="title", object="A"),
        PredicationCell(subject="b.yaml", predicate="kind", object="thing"),
    ]
    with pytest.raises(ProjectionConflict):
        create_tree(tmp_path, cells)


def test_to_cells_renders_projected_as_sha256_triples(tmp_path):
    rec = append_record(tmp_path, "out.md", b"hello\n")
    cells = to_cells([rec])
    assert len(cells) == 1
    c = cells[0]
    assert str(c.subject) == "out.md"
    assert str(c.predicate) == PROJECTED_PREDICATE
    assert str(c.object) == rec.sha256


def test_record_round_trip_through_json_line():
    rec = ProjectionRecord(
        subject="x.md",
        sha256="a" * 64,
        byte_length=42,
        projected_at="2026-05-09T12:00:00Z",
    )
    line = rec.to_json_line()
    rec2 = ProjectionRecord.from_json_line(line)
    assert rec == rec2


def test_read_records_skips_malformed_lines(tmp_path):
    p = tmp_path / LEDGER_RELPATH
    p.parent.mkdir(parents=True)
    p.write_text(
        '{"subject":"x.md","sha256":"a","byte_length":1,'
        '"projected_at":"2026-05-09T00:00:00Z"}\n'
        'not-json\n'
        '{"subject":"y.md","sha256":"b","byte_length":2,'
        '"projected_at":"2026-05-09T00:00:01Z"}\n',
        encoding="utf-8",
    )
    records = read_records(tmp_path)
    assert [r.subject for r in records] == ["x.md", "y.md"]
