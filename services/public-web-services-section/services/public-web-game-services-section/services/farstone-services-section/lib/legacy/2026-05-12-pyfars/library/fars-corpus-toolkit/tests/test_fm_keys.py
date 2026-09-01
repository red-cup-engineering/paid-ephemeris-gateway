from pathlib import Path

from fars.analyze.fm_keys import gather
from fars.substrate.flatfile import Flatfile


def _note(slug: str, **fm) -> Flatfile:
    return Flatfile(slug=slug, dir="concepts", kind="concept",
                fm=fm, body="", path=Path(f"concepts/{slug}.md"), mtime=0.0)


def test_gather_counts_keys():
    notes = [
        _note("a", title="A", kind="concept", deps=["x"]),
        _note("b", title="B", kind="concept"),
    ]
    rows = gather(notes)
    keys = {k for k, _, _, _ in rows}
    assert keys == {"title", "kind", "deps"}
    by_key = {k: c for k, c, _, _ in rows}
    assert by_key["title"] == 2
    assert by_key["kind"] == 2
    assert by_key["deps"] == 1


def test_gather_collects_sample_values():
    notes = [
        _note("a", description="first"),
        _note("b", description="second"),
        _note("c", description="third"),
        _note("d", description="fourth"),
    ]
    rows = gather(notes, value_samples=3)
    by_key = {k: vs for k, _, vs, _ in rows}
    assert len(by_key["description"]) == 3


def test_gather_sorts_by_count_desc():
    notes = [
        _note("a", common="x"),
        _note("b", common="y"),
        _note("c", common="z", rare="r"),
    ]
    rows = gather(notes)
    keys_in_order = [k for k, _, _, _ in rows]
    assert keys_in_order.index("common") < keys_in_order.index("rare")
