"""Jural relation — Hohfeldian substrate entity.

Per the predicated-governance theory's ``objects/jural-relation.md``, a
jural relation is one of the four Hohfeldian (1913) positions — power,
duty, privilege, immunity — between an active-holder and a passive-
party regarding a scope-action. Jural relations are the operational
representation of authority: ``Office.deontic_profile`` is the human-
readable summary, ``JuralRelation`` is what the residuation gate in
``check-authorization`` actually operates over.

The substrate cells encoding one jural relation:

    (R, kind, k)             k ∈ {power, duty, privilege, immunity}
    (R, active-holder, A)
    (R, passive-party, B)
    (R, scope-action, X)
    (R, correlate-of, R')    optional; computable from the above

We do *not* eagerly write jural-relation cells back into the store —
they are derived from offices + holdings on demand. The
``derive_jural_relations`` helper walks personnel/persona holdings and
office deontic-profiles and produces in-memory ``JuralRelation``
records. Closure-rule-resident jural-relation cells can be added later
as a denormalization without changing this API.

The four-position Hohfeldian table (active kind → passive correlate):

    power     ↔ liability
    duty      ↔ claim
    privilege ↔ no-right
    immunity  ↔ disability
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pypredcalc import BilatticeValue
from pypredcalc.predication import PredicationStore

from pyfars.kernel import query


JuralKind = Literal[
    "power", "duty", "privilege", "immunity",
    "liability", "claim", "no-right", "disability",
]


_ACTIVE_KINDS: frozenset[str] = frozenset(
    {"power", "duty", "privilege", "immunity"}
)


_CORRELATE: dict[str, str] = {
    "power": "liability",
    "duty": "claim",
    "privilege": "no-right",
    "immunity": "disability",
    "liability": "power",
    "claim": "duty",
    "no-right": "privilege",
    "disability": "immunity",
}


class JuralRelation(BaseModel):
    """One Hohfeldian jural relation.

    The ``kind`` field carries one of eight values — the four active
    positions plus their four passive correlates. ``active_holder``
    and ``passive_party`` are subject slugs (personnel, persona-agent,
    office, or — for unscoped relations — a sentinel like ``"any"``).
    ``scope_action`` is the substrate operation or action identifier
    the relation regards. ``value`` is the bilattice cell value;
    ``T`` = asserted, ``F`` = explicitly denied, ``BOT`` = no info,
    ``TOP`` = contested.
    """
    model_config = ConfigDict(frozen=True, extra="forbid")

    kind: JuralKind
    active_holder: str
    passive_party: str
    scope_action: str
    value: BilatticeValue = BilatticeValue.T
    source: str | None = Field(
        default=None,
        description="slug of the office or charter rule that grants this",
    )

    def correlate(self) -> "JuralRelation":
        """Return the Hohfeldian correlate by swapping holder/party and renaming kind.

        Power ↔ liability, duty ↔ claim, privilege ↔ no-right, immunity ↔ disability.
        The correlative-pair encoding is ``predicate-converse ∘ kind-rename`` per
        ``jural-relation.md``'s Klein-four-symmetry section.
        """
        return JuralRelation(
            kind=_CORRELATE[self.kind],
            active_holder=self.passive_party,
            passive_party=self.active_holder,
            scope_action=self.scope_action,
            value=self.value,
            source=self.source,
        )

    def is_active(self) -> bool:
        """``True`` for the four active positions; ``False`` for their correlates."""
        return self.kind in _ACTIVE_KINDS


def derive_jural_relations(
    store: PredicationStore,
) -> list[JuralRelation]:
    """Walk offices + holdings, produce in-memory JuralRelation records.

    For each personnel/persona-agent ``H`` and each office ``O`` with
    ``H holds-offices O`` (or ``H holds-office O``), emit one JuralRelation
    per action in each Hohfeldian list on ``O``'s deontic profile.
    Passive-party is the office's ``of-polity`` if present, else ``"any"``
    (an unscoped relation, the substrate's default sentinel).
    """
    out: list[JuralRelation] = []
    held: dict[str, list[str]] = {}
    for (s, p, o) in query.t_cells(store):
        if p in ("holds-offices", "holds-office"):
            held.setdefault(str(s), []).append(str(o))

    for holder, offices in held.items():
        for office_slug in offices:
            relations = _office_relations(
                store, office_slug, holder, source=office_slug,
            )
            out.extend(relations)
    return out


_KIND_BY_PREDICATE: dict[str, str] = {
    "duties": "duty",
    "powers": "power",
    "privileges": "privilege",
    "immunities": "immunity",
}


def _office_relations(
    store: PredicationStore,
    office_slug: str,
    holder: str,
    *,
    source: str,
) -> list[JuralRelation]:
    of_polities = query.objects_under(store, office_slug, ("of-polity",))
    passive = next(iter(of_polities), None)
    passive_party = str(passive) if passive is not None else "any"

    out: list[JuralRelation] = []
    for predicate, kind in _KIND_BY_PREDICATE.items():
        for action in query.objects_under(store, office_slug, (predicate,)):
            out.append(JuralRelation(
                kind=kind,
                active_holder=holder,
                passive_party=passive_party,
                scope_action=str(action),
                value=BilatticeValue.T,
                source=source,
            ))
    return out


__all__ = [
    "JuralKind",
    "JuralRelation",
    "derive_jural_relations",
]
