"""Tests for fars.runtime.event_log."""
from fars.operator.witness import make_witness
from fars.runtime.event_log import EventLog


def test_event_log_append_and_read(tmp_path):
    log = EventLog(root=tmp_path)
    w1 = make_witness("fm_add", "a.md", None, "h1", details={"k": "v"})
    w2 = make_witness("fm_set", "b.md", "h2", "h3", details={"k": "v2"})
    log.append(w1)
    log.append(w2)
    all_w = list(log.read_all())
    assert len(all_w) == 2
    assert all_w[0] == w1
    assert all_w[1] == w2


def test_event_log_count(tmp_path):
    log = EventLog(root=tmp_path)
    assert log.count() == 0
    log.append(make_witness("op", "x.md", None, "h", details={}))
    assert log.count() == 1


def test_event_log_tail(tmp_path):
    log = EventLog(root=tmp_path)
    for i in range(5):
        log.append(make_witness("op", f"f{i}.md", None, f"h{i}", details={"i": i}))
    last3 = log.tail(3)
    assert len(last3) == 3
    assert last3[0].details["i"] == 2
    assert last3[2].details["i"] == 4


def test_event_log_tail_empty(tmp_path):
    log = EventLog(root=tmp_path)
    assert log.tail(5) == []


def test_event_log_creates_dir(tmp_path):
    log = EventLog(root=tmp_path)
    assert not log.log_dir.exists()
    log.append(make_witness("op", "x.md", None, "h", details={}))
    assert log.log_dir.exists()
    assert log.log_dir.is_dir()


def test_event_log_skips_blank_lines(tmp_path):
    log = EventLog(root=tmp_path)
    log.append(make_witness("op", "x.md", None, "h", details={}))
    # Manually inject a blank line
    log_file = next(log.log_dir.glob("*.jsonl"))
    with log_file.open("a", encoding="utf-8") as f:
        f.write("\n\n")
    log.append(make_witness("op2", "y.md", None, "h", details={}))
    assert log.count() == 2
