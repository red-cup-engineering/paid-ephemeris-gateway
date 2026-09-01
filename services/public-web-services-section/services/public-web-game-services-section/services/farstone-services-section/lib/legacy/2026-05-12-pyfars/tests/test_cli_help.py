from pyfars.apps.cli import __main__ as cli


def test_help_verb_prints_top_level_usage(capsys):
    assert cli.main(["help"]) == 0

    out = capsys.readouterr().out
    assert "usage: pyfars" in out
    assert "run" in out
    assert "query" in out
    assert "materialize" in out
    assert "help" in out


def test_help_verb_prints_topic_usage(capsys):
    assert cli.main(["help", "materialize"]) == 0

    out = capsys.readouterr().out
    assert "usage: pyfars materialize" in out
    assert "--root" in out


def test_help_verb_rejects_unknown_topic(capsys):
    assert cli.main(["help", "missing"]) == 2

    captured = capsys.readouterr()
    assert "unknown verb 'missing'" in captured.err
    assert "usage: pyfars" in captured.err
