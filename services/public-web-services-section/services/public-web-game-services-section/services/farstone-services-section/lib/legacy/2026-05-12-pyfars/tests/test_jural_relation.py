"""Tests for JuralRelation entity + derivation from polity-authored cells.

A jural relation is one Hohfeldian position — power, duty, privilege,
immunity — between an active holder and a passive party regarding a
scope-action. The substrate represents an office's deontic profile as
``duties: [...]``, ``powers: [...]``, ``privileges: [...]``,
``immunities: [...]`` cells; ``derive_jural_relations`` walks
personnel/persona holdings and emits one JuralRelation per
(action, holder, office) triple.
"""
from __future__ import annotations

import pytest
from pypredcalc import BilatticeValue
from pypredcalc.predication import PredicationCell, PredicationStore

from pyfars.sdk.entities.jural_relation import (
    JuralRelation,
    derive_jural_relations,
)


def _cell(subject: str, predicate: str, obj: str) -> PredicationCell:
    return PredicationCell(subject=subject, predicate=predicate, object=obj)


def _store(*cells: PredicationCell) -> PredicationStore:
    store = PredicationStore.empty()
    for c in cells:
        store = store.insert(c)
    return store


def test_correlate_swaps_holder_and_kind():
    r = JuralRelation(
        kind="power",
        active_holder="alice",
        passive_party="bob",
        scope_action="rescind-charter",
    )
    c = r.correlate()
    assert c.kind == "liability"
    assert c.active_holder == "bob"
    assert c.passive_party == "alice"
    assert c.scope_action == "rescind-charter"


def test_correlate_is_involutive():
    """Klein-four-symmetry: correlate twice ≡ identity."""
    r = JuralRelation(
        kind="duty",
        active_holder="alice",
        passive_party="bob",
        scope_action="report",
    )
    assert r.correlate().correlate() == r


@pytest.mark.parametrize("kind,expected", [
    ("power", True), ("duty", True),
    ("privilege", True), ("immunity", True),
    ("liability", False), ("claim", False),
    ("no-right", False), ("disability", False),
])
def test_is_active(kind, expected):
    r = JuralRelation(
        kind=kind,
        active_holder="x",
        passive_party="y",
        scope_action="a",
    )
    assert r.is_active() is expected


def test_derive_from_polity_authored_office_cells():
    """Office with duties + powers; one personnel record holds it."""
    store = _store(
        _cell("office:xo", "type", "office"),
        _cell("office:xo", "duties", "report-to-captain"),
        _cell("office:xo", "powers", "dispatch-task-to-office"),
        _cell("office:xo", "of-polity", "polity:561"),
        _cell("personnel:alex", "type", "personnel"),
        _cell("personnel:alex", "holds-offices", "office:xo"),
    )
    relations = derive_jural_relations(store)
    by_kind = {(r.kind, r.scope_action) for r in relations}
    assert ("duty", "report-to-captain") in by_kind
    assert ("power", "dispatch-task-to-office") in by_kind
    for r in relations:
        assert r.active_holder == "personnel:alex"
        assert r.passive_party == "polity:561"
        assert r.value == BilatticeValue.T


def test_derive_uses_any_when_office_has_no_polity():
    """Without of-polity, passive party defaults to ``any`` sentinel."""
    store = _store(
        _cell("office:o", "type", "office"),
        _cell("office:o", "privileges", "draft-spec"),
        _cell("personnel:p", "holds-office", "office:o"),  # singular alias
    )
    relations = derive_jural_relations(store)
    assert len(relations) == 1
    assert relations[0].kind == "privilege"
    assert relations[0].passive_party == "any"
    assert relations[0].source == "office:o"


def test_derive_emits_nothing_without_holdings():
    """No personnel holdings → no derived relations, even if offices exist."""
    store = _store(
        _cell("office:o", "type", "office"),
        _cell("office:o", "powers", "rescind"),
    )
    assert derive_jural_relations(store) == []


def test_multiple_personnel_each_get_their_own_relations():
    store = _store(
        _cell("office:o", "duties", "audit"),
        _cell("office:o", "of-polity", "polity:p"),
        _cell("personnel:a", "holds-offices", "office:o"),
        _cell("personnel:b", "holds-offices", "office:o"),
    )
    relations = derive_jural_relations(store)
    holders = {r.active_holder for r in relations}
    assert holders == {"personnel:a", "personnel:b"}
    assert all(r.kind == "duty" for r in relations)
