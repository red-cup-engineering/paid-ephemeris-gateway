from fars import convention


def test_kind_groups_disjoint_for_known_kinds():
    # No kind is both an anchor and a theorem.
    assert not (convention.ANCHOR_KINDS & convention.THEOREM_KINDS)


def test_badge_kinds_supersets_theorem_kinds():
    assert convention.THEOREM_KINDS.issubset(convention.BADGE_KINDS)


def test_internal_fields_supersets_relations():
    for k in convention.RELATION_KEYS:
        assert k in convention.INTERNAL_FIELDS


def test_proved_and_unproved_disjoint():
    assert not (convention.UNPROVED & convention.PROVED)


def test_kind_label_covers_known_kinds():
    for k in convention.THEOREM_KINDS | convention.ANCHOR_KINDS:
        assert k in convention.KIND_LABEL


def test_default_lib_dirs_are_subcollections():
    for d in convention.DEFAULT_LIB_DIRS:
        assert d in convention.SUBCOLLECTIONS
