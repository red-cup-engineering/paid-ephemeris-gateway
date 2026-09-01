"""Cell-query helpers over a :class:`PredicationStore`.

Every query treats ``T`` as load-bearing: ``subjects_with``,
``objects_under``, etc. return only entities for which the cell value
is exactly ``T``. ``F`` (denied) and ``TOP`` (contested) are excluded
from positive queries — match those with :func:`cells_with_value`.

The ``belief_*`` helpers fold a witness stream (witnesses are cells in
the witness fiber) into a four-valued cell state under knowledge-join.
"""
from __future__ import annotations

from collections.abc import Hashable, Iterable, Iterator
from dataclasses import dataclass, field

from pypredcalc.algebra.bilattice import BilatticeValue
from pypredcalc.predication import PredicationStore
from pypredcalc import knowledge_join


T = BilatticeValue.T

CellKey = tuple[Hashable, Hashable, Hashable]


def value(
    store: PredicationStore,
    subject: Hashable,
    predicate: Hashable,
    object_: Hashable,
) -> BilatticeValue:
    return store.get(subject, predicate, object_)


def holds(
    store: PredicationStore,
    subject: Hashable,
    predicate: Hashable,
    object_: Hashable,
) -> bool:
    return store.get(subject, predicate, object_) == T


def t_cells(store: PredicationStore) -> Iterator[CellKey]:
    for key, val in store._values.items():
        if val == T:
            yield key


def cells_with_value(
    store: PredicationStore, want: BilatticeValue,
) -> Iterator[CellKey]:
    for key, val in store._values.items():
        if val == want:
            yield key


def subjects_with(
    store: PredicationStore, predicate: Hashable, object_: Hashable,
) -> set[Hashable]:
    return {
        s for (s, p, o) in t_cells(store)
        if p == predicate and o == object_
    }


def objects_under(
    store: PredicationStore,
    subject: Hashable,
    predicates: Iterable[Hashable],
) -> set[Hashable]:
    pred_set = set(predicates)
    return {
        o for (s, p, o) in t_cells(store)
        if s == subject and p in pred_set
    }


def predicates_of(
    store: PredicationStore, subject: Hashable,
) -> set[Hashable]:
    return {p for (s, p, _o) in t_cells(store) if s == subject}


def cells_at(
    store: PredicationStore, subject: Hashable,
) -> Iterator[CellKey]:
    for s, p, o in t_cells(store):
        if s == subject:
            yield (s, p, o)


def subjects_of_type(
    store: PredicationStore, types: Iterable[Hashable],
) -> set[Hashable]:
    type_set = set(types)
    return {
        s for (s, p, o) in t_cells(store)
        if p == "type" and o in type_set
    }


def all_subjects(store: PredicationStore) -> set[Hashable]:
    return {s for (s, _p, _o) in store._values.keys()}


def all_entities(store: PredicationStore) -> tuple[Hashable, ...]:
    seen: set[Hashable] = set()
    for s, _p, o in store._values.keys():
        seen.add(s)
        seen.add(o)
    return tuple(sorted(seen, key=str))


def relation_map(
    store: PredicationStore, predicate: Hashable,
    *, direction: str = "subject-keyed",
) -> dict[str, list[str]]:
    """Typed-relation graph as a dict.

    ``direction="subject-keyed"`` — each subject → list of objects
    (``depends_on[slug]`` semantics). ``object-keyed`` is the reverse
    (``dependents[slug]``).
    """
    out: dict[str, list[str]] = {}
    for s, p, o in t_cells(store):
        if p != predicate:
            continue
        if direction == "subject-keyed":
            out.setdefault(str(s), []).append(str(o))
        elif direction == "object-keyed":
            out.setdefault(str(o), []).append(str(s))
        else:
            raise ValueError(
                f"direction must be 'subject-keyed' or 'object-keyed'; "
                f"got {direction!r}"
            )
    return out


def in_edges(
    store: PredicationStore, slug: Hashable,
    *, predicates: Iterable[Hashable] | None = None,
) -> Iterator[CellKey]:
    pred_set = None if predicates is None else set(predicates)
    for s, p, o in t_cells(store):
        if o != slug:
            continue
        if pred_set is not None and p not in pred_set:
            continue
        yield (s, p, o)


def out_edges(
    store: PredicationStore, slug: Hashable,
    *, predicates: Iterable[Hashable] | None = None,
) -> Iterator[CellKey]:
    pred_set = None if predicates is None else set(predicates)
    for s, p, o in t_cells(store):
        if s != slug:
            continue
        if pred_set is not None and p not in pred_set:
            continue
        yield (s, p, o)


# ---- belief: knowledge-join fold over a witness stream -------------

EVIDENCE_THRESHOLD = 0.0
TRUTH_THRESHOLD = 0.5


def witness_vote(
    truth: float,
    evidence: float,
    *,
    truth_threshold: float = TRUTH_THRESHOLD,
    evidence_threshold: float = EVIDENCE_THRESHOLD,
) -> BilatticeValue:
    """One witness's (truth, evidence) → FOUR vote.

      evidence ≤ et                →  BOT  (silent)
      evidence > et, truth >  tt   →  T
      evidence > et, truth <  tt   →  F
      evidence > et, truth == tt   →  BOT  (agnostic)

    A single witness cannot vote ⊤ — that arises only at the cell
    level via knowledge-join over multiple votes.
    """
    if not (0.0 <= float(truth) <= 1.0):
        raise ValueError(f"truth={truth!r} out of range [0, 1]")
    if not (0.0 <= float(evidence) <= 1.0):
        raise ValueError(f"evidence={evidence!r} out of range [0, 1]")
    if evidence <= evidence_threshold:
        return BilatticeValue.BOT
    if truth > truth_threshold:
        return BilatticeValue.T
    if truth < truth_threshold:
        return BilatticeValue.F
    return BilatticeValue.BOT


@dataclass(frozen=True)
class BeliefVote:
    witness: object  # Witness — typed loosely to avoid an import cycle
    vote: BilatticeValue
    truth: float
    evidence: float


@dataclass(frozen=True)
class BeliefCell:
    target: str
    attribute: str | None
    value: BilatticeValue
    votes: tuple[BeliefVote, ...] = field(default_factory=tuple)

    @property
    def is_consistent(self) -> bool:
        return self.value is not BilatticeValue.TOP

    @property
    def is_settled(self) -> bool:
        return self.value is not BilatticeValue.BOT

    @property
    def supporting(self) -> tuple[BeliefVote, ...]:
        return tuple(v for v in self.votes if v.vote is BilatticeValue.T)

    @property
    def opposing(self) -> tuple[BeliefVote, ...]:
        return tuple(v for v in self.votes if v.vote is BilatticeValue.F)


def belief_fold(
    witnesses: Iterable,  # Iterable[Witness]
    *,
    target: str,
    attribute: str | None = None,
    truth_threshold: float = TRUTH_THRESHOLD,
    evidence_threshold: float = EVIDENCE_THRESHOLD,
) -> BeliefCell:
    """Fold a witness stream into the FOUR state of one cell.

    Pure: takes any iterable of witnesses, matches by ``(target,
    attribute)``, lifts each match to a vote via :func:`witness_vote`,
    reduces by knowledge-join. Used by federation merge, audit, and
    any belief query.
    """
    votes: list[BeliefVote] = []
    folded: BilatticeValue = BilatticeValue.BOT
    for w in witnesses:
        if getattr(w, "target", None) != target:
            continue
        if attribute is not None and w.details.get("key") != attribute:
            continue
        vote = witness_vote(
            w.truth, w.evidence,
            truth_threshold=truth_threshold,
            evidence_threshold=evidence_threshold,
        )
        votes.append(BeliefVote(witness=w, vote=vote,
                                truth=w.truth, evidence=w.evidence))
        folded = knowledge_join(folded, vote)
    return BeliefCell(target=target, attribute=attribute,
                      value=folded, votes=tuple(votes))


__all__ = [
    "BeliefCell",
    "BeliefVote",
    "CellKey",
    "EVIDENCE_THRESHOLD",
    "TRUTH_THRESHOLD",
    "all_entities",
    "all_subjects",
    "belief_fold",
    "cells_at",
    "cells_with_value",
    "holds",
    "in_edges",
    "objects_under",
    "out_edges",
    "predicates_of",
    "relation_map",
    "subjects_of_type",
    "subjects_with",
    "t_cells",
    "value",
    "witness_vote",
]
