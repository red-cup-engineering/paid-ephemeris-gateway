from fars.operator.edit.fm_add import add_item
from fars.operator.edit.fm_rm import remove
from fars.operator.edit.fm_set import set_field
from fars.operator.edit.rename_fm_key import rename


def test_set_overwrites():
    fm = {"a": 1}
    out = set_field(fm, "a", 2)
    assert out["a"] == 2
    assert fm["a"] == 1  # original unchanged


def test_add_creates_list_if_absent():
    out = add_item({}, "deps", "x")
    assert out == {"deps": ["x"]}


def test_add_appends_to_existing_list():
    out = add_item({"deps": ["x"]}, "deps", "y")
    assert out == {"deps": ["x", "y"]}


def test_add_dedup_no_op_if_present():
    out = add_item({"deps": ["x"]}, "deps", "x")
    assert out == {"deps": ["x"]}


def test_add_promotes_scalar_to_list():
    out = add_item({"deps": "x"}, "deps", "y")
    assert out == {"deps": ["x", "y"]}


def test_rm_drops_key():
    out = remove({"a": 1, "b": 2}, "a")
    assert out == {"b": 2}


def test_rm_no_op_for_absent_key():
    out = remove({"a": 1}, "b")
    assert out == {"a": 1}


def test_rm_item_drops_one_from_list():
    out = remove({"deps": ["x", "y"]}, "deps", item="x")
    assert out == {"deps": ["y"]}


def test_rm_item_drops_key_when_list_empty():
    out = remove({"deps": ["x"]}, "deps", item="x")
    assert "deps" not in out


def test_rename_fm_key_preserves_order():
    fm = {"a": 1, "old": 2, "c": 3}
    out = rename(fm, "old", "new")
    assert list(out.keys()) == ["a", "new", "c"]
    assert out["new"] == 2


def test_rename_fm_key_no_op_when_absent():
    fm = {"a": 1}
    assert rename(fm, "nonexistent", "x") is fm
