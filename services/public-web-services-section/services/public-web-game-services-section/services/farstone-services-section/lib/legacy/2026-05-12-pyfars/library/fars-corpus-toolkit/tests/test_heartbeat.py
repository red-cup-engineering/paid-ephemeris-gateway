"""Tests for fars.runtime.heartbeat."""
from fars.runtime.dispatch import DispatchTable
from fars.runtime.heartbeat import Heartbeat, diagnostics_policy
from fars.substrate.flatfile import Flatfile
from fars.substrate.store import Substrate
from fars.substrate.types.diagnostic import Diagnostic


def _make_substrate(tmp_path):
    """Build a minimal substrate with one flatfile."""
    note = tmp_path / "n.md"
    note.write_text("---\nkind: theorem\n---\n\n# N\n\nbody body body body body.\n")
    sub = Substrate(root=tmp_path)
    _ = sub.notes  # warm cache
    return sub, note


def test_heartbeat_no_unsettled(tmp_path):
    sub, _ = _make_substrate(tmp_path)
    selection = lambda s: []
    hb = Heartbeat(substrate=sub, selection=selection)
    assert hb.tick() == 0


def test_heartbeat_emits_ticks(tmp_path):
    sub, note_path = _make_substrate(tmp_path)
    flatfile = sub.notes[0]
    selection = lambda s: [(flatfile, "broken-link"), (flatfile, "orphan")]
    emitted: list[tuple[str, str]] = []
    def on_tick(ff, pred):
        emitted.append((ff.slug, pred))
    hb = Heartbeat(substrate=sub, selection=selection, on_tick=on_tick)
    n = hb.tick()
    assert n == 2
    assert ("n", "broken-link") in emitted
    assert ("n", "orphan") in emitted


def test_heartbeat_routes_through_dispatch(tmp_path):
    sub, _ = _make_substrate(tmp_path)
    flatfile = sub.notes[0]
    selection = lambda s: [(flatfile, "needs-fix")]
    received: list[Flatfile] = []
    dt = DispatchTable()
    dt.register("needs-fix", lambda ff: received.append(ff))
    hb = Heartbeat(substrate=sub, selection=selection, dispatch=dt)
    hb.tick()
    assert received == [flatfile]


def test_diagnostics_policy_maps_diagnostic_to_predicate(tmp_path):
    sub, note_path = _make_substrate(tmp_path)
    flatfile = sub.notes[0]
    diag = Diagnostic(code="broken-link", severity="error",
                      message="missing target", path=flatfile.path)
    rule_runner = lambda s: [diag]
    policy = diagnostics_policy(rule_runner)
    result = policy(sub)
    assert result == [(flatfile, "broken-link")]


def test_diagnostics_policy_skips_diags_without_path(tmp_path):
    sub, _ = _make_substrate(tmp_path)
    diag = Diagnostic(code="x", severity="warning", message="m", path=None)
    rule_runner = lambda s: [diag]
    policy = diagnostics_policy(rule_runner)
    assert policy(sub) == []
