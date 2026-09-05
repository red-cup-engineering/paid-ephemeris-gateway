"""compute-working-fiber — compose an agent's effective authorization scope.

Per ``check-authorization.md``: ``the session's working fiber carries the
agent's effective scope after composition with the active mode``. This
module realizes that composition.

The working fiber is a flat map from ``(JuralKind, scope_action)`` to
:class:`BilatticeValue`. Each entry records the strongest claim the
agent's offices (and mode, when present) make about that
``(kind, action)`` pair. Multiple offices contributing to the same key
are joined in the *knowledge* order — disagreements promote to
``TOP`` (contested), per the bilattice's standard reading of
conflicting evidence.

The Pydantic SDK class ``JuralRelation`` is what we read; this operator
produces a plain dict so ``check-authorization``'s residuation gate can
do simple lookups without re-walking entities.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

from pypredcalc import BilatticeValue
from pypredcalc.algebra.bilattice import knowledge_join
from pypredcalc.predication import PredicationStore

from pyfars.sdk.entities.jural_relation import (
    JuralKind,
    JuralRelation,
    derive_jural_relations,
)


FiberKey = tuple[str, str]
"""``(kind, scope_action)`` — the cell key in a working fiber."""


@dataclass(frozen=True)
class WorkingFiber:
    """Composed scope from a session's agent + office + active mode.

    Fields:
      agent: subject slug of the acting agent (persona-agent or personnel).
      office: office slug currently occupied (the one whose deontic profile
        is in force for this session), or ``None`` if unscoped.
      mode: active session mode, or ``None``.
      cells: flat map from ``(kind, scope_action)`` to bilattice value.
        Multiple contributing offices join in the knowledge order.
      sources: per cell, the office slugs that contributed.
    """
    agent: str
    office: str | None
    mode: str | None
    cells: dict[FiberKey, BilatticeValue] = field(default_factory=dict)
    sources: dict[FiberKey, tuple[str, ...]] = field(default_factory=dict)

    def value_for(
        self, kind: JuralKind, action: str,
    ) -> BilatticeValue:
        """Return the joined bilattice value, or ``BOT`` if unmentioned."""
        return self.cells.get((kind, action), BilatticeValue.BOT)


def compute_working_fiber(
    store: PredicationStore,
    *,
    agent: str,
    office: str | None = None,
    mode: str | None = None,
) -> WorkingFiber:
    """Walk the agent's holdings, gather jural relations, join into a fiber.

    The agent's whole holdings contribute when ``office`` is ``None``.
    When ``office`` is set, only relations sourced from that office (or
    its delegation chain — followed via the ``source`` field on the
    JuralRelation) contribute; this is the spec's "scope after
    composition with the active mode."
    """
    all_relations = derive_jural_relations(store)
    agent_relations: Iterable[JuralRelation] = (
        r for r in all_relations if r.active_holder == agent
    )
    if office is not None:
        agent_relations = (
            r for r in agent_relations if r.source == office
        )

    cells: dict[FiberKey, BilatticeValue] = {}
    sources: dict[FiberKey, list[str]] = {}
    for relation in agent_relations:
        key: FiberKey = (relation.kind, relation.scope_action)
        existing = cells.get(key)
        cells[key] = (
            relation.value if existing is None
            else knowledge_join(existing, relation.value)
        )
        if relation.source is not None:
            sources.setdefault(key, []).append(relation.source)

    return WorkingFiber(
        agent=agent,
        office=office,
        mode=mode,
        cells=cells,
        sources={k: tuple(v) for k, v in sources.items()},
    )


__all__ = [
    "FiberKey",
    "WorkingFiber",
    "compute_working_fiber",
]
