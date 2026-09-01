"""Office records — action-domain entities agents inhabit.

Per the FARS office-record spec (eight components: identity, authority,
normative-system, deontic-profile, accountability, action-domain,
capabilities, installation), an Office is the system-resident
record of *what an agent inhabits to do work*. Agents reference the
offices they currently inhabit via :attr:`Agent.offices`.

The class supports both the live frontmatter shape (used by records
under ``governance/offices/``) and the forward-looking FARS-spec shape
(richer scope-dimensions, accountability-scope, installation
predicates). Live records work today; spec-shape fields land as those
records grow into the full eight-component template.

Per ``concepts/office-as-fuzzy-cell.md``, an office is a *cell* with
mixed formality across components. The ``settlement_path_position``
field is where each component declares its current formality (F0-F3)
so sharpening operators know what to refine next.
"""
from __future__ import annotations

from collections.abc import Iterable
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


OfficeType = Literal[
    "coordination",
    "production",
    "governance",
    "analytical",
    "support",
    "boundary-crossing",
]


WeberType = Literal["traditional", "charismatic", "rational-legal"]


class ScopeDimensions(BaseModel):
    """Five-dimensional scope of an office's authority."""
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    positional: list[str] = Field(default_factory=list)
    substantive: list[str] = Field(default_factory=list)
    temporal: list[str] = Field(default_factory=list)
    jurisdictional: list[str] = Field(default_factory=list)
    who_bound: list[str] = Field(default_factory=list, alias="who-bound")


class DeonticProfile(BaseModel):
    """Hohfeldian four-position deontic profile for an office.

    The four canonical positions per Hohfeld (1913): duties, powers,
    privileges, immunities. One shape, no aliases. Negative duties are
    encoded as explicit duties with ``f``-valued cells in the system,
    not as a separate ``must-not`` list.
    """
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    duties: list[str] = Field(default_factory=list)
    powers: list[str] = Field(default_factory=list)
    privileges: list[str] = Field(default_factory=list)
    immunities: list[str] = Field(default_factory=list)


class Office(BaseModel):
    """One office record."""
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    slug: str

    title: str = ""
    description: str = ""
    type: OfficeType | None = None
    department: str | None = None

    status: str = "active"

    reads: frozenset[str] = Field(default_factory=frozenset)
    writes: frozenset[str] = Field(default_factory=frozenset)

    # --- Authority --------------------------------------------------

    authority_source: str | None = Field(
        default=None, alias="authority-source",
    )
    weber_type: WeberType | None = Field(default=None, alias="weber-type")
    scope_dimensions: ScopeDimensions = Field(
        default_factory=ScopeDimensions, alias="scope-dimensions",
    )

    # --- Normative system -------------------------------------------

    charter_bindings: list[str] = Field(
        default_factory=list, alias="charter-bindings",
    )
    installation_anchored: bool = Field(
        default=False, alias="installation-anchored",
    )

    # --- Deontic profile (Hohfeldian) -------------------------------

    deontic_profile: DeonticProfile = Field(
        default_factory=DeonticProfile, alias="deontic-profile",
    )

    # --- Accountability ---------------------------------------------

    bearer: str | None = None
    held_by: str | None = Field(default=None, alias="held-by")
    accountability_scope: list[str] = Field(
        default_factory=list, alias="accountability-scope",
    )
    non_transferable: bool = Field(default=False, alias="non-transferable")
    escalation_path: list[str] = Field(
        default_factory=list, alias="escalation-path",
    )

    # --- Action domain ----------------------------------------------

    of_polity: str | None = Field(default=None, alias="of-polity")
    remit: str = ""
    entities_governed: list[str] = Field(
        default_factory=list, alias="entities-governed",
    )
    channels_read: list[str] = Field(
        default_factory=list, alias="channels-read",
    )
    channels_write: list[str] = Field(
        default_factory=list, alias="channels-write",
    )
    state_transitions: list[str] = Field(
        default_factory=list, alias="state-transitions",
    )

    # --- Capabilities -----------------------------------------------

    work_types: list[str] = Field(default_factory=list, alias="work-types")
    provides_capabilities: list[str] = Field(
        default_factory=list, alias="provides-capabilities",
    )
    constructors: list[str] = Field(default_factory=list)
    settlement_path_position: dict = Field(
        default_factory=dict, alias="settlement-path-position",
    )

    agents_serving: list[str] = Field(
        default_factory=list, alias="agents-serving",
    )

    # --- Installation -----------------------------------------------

    felicity_conditions: list[str] = Field(
        default_factory=list, alias="felicity-conditions",
    )
    installation_mechanism: str | None = Field(
        default=None, alias="installation-mechanism",
    )
    installation_markers: list[str] = Field(
        default_factory=list, alias="installation-markers",
    )

    # --- Body --------------------------------------------------------

    body: str = ""

    # --- Provenance --------------------------------------------------


    # --- Hohfeldian position accessors ------------------------------
    #
    # The four positions surface at the top level as frozensets so
    # callers can compose them with set algebra. ``deontic_profile``
    # is the source of truth.

    @property
    def duties(self) -> frozenset[str]:
        return frozenset(self.deontic_profile.duties)

    @property
    def powers(self) -> frozenset[str]:
        return frozenset(self.deontic_profile.powers)

    @property
    def privileges(self) -> frozenset[str]:
        return frozenset(self.deontic_profile.privileges)

    @property
    def immunities(self) -> frozenset[str]:
        return frozenset(self.deontic_profile.immunities)

    # --- Hohfeldian queries -----------------------------------------

    def has_duty(self, action: str) -> bool:
        return action in self.duties

    def can_command(self, action: str) -> bool:
        return action in self.powers

    def is_privileged(self, action: str) -> bool:
        return action in self.privileges

    def is_immune(self, action: str) -> bool:
        return action in self.immunities

    def is_liable(self, action: str) -> bool:
        """Hohfeldian liability — the jural correlative of *power*.

        ``True`` iff this office holds no immunity covering ``action``.
        Liability is *abstract*: the office is *susceptible* to a
        matching power, but no specific office must actually hold one.
        Use ``is_compelled_by`` for the contextual existential check.
        """
        return not self.is_immune(action)

    def is_vacant(self) -> bool:
        """``True`` if the office has no current incumbent."""
        return self.held_by is None

    def is_compelled_by(
        self, offices: Iterable["Office"], action: str
    ) -> bool:
        """Contextual compellability: ``True`` iff this office is
        liable to ``action`` AND at least one office in ``offices``
        (other than self) holds the matching power.
        """
        if not self.is_liable(action):
            return False
        return any(
            o.can_command(action) and o.slug != self.slug for o in offices
        )


def offices_with_duty(
    offices: Iterable[Office], action: str
) -> list[Office]:
    """Governance query: which offices bear a duty to do ``action``?"""
    return [o for o in offices if o.has_duty(action)]


def offices_with_power(
    offices: Iterable[Office], action: str
) -> list[Office]:
    """Governance query: which offices may command ``action`` of others?
    Routing point for command-channel dispatch."""
    return [o for o in offices if o.can_command(action)]


__all__ = [
    "DeonticProfile",
    "Office",
    "OfficeType",
    "ScopeDimensions",
    "WeberType",
    "offices_with_duty",
    "offices_with_power",
]
