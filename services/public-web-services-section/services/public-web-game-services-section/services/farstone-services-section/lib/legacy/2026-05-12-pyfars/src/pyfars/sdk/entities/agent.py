"""Agent records — one system-resident record per registered agent.

An ``Agent`` mirrors the markdown record under
``governance/agents/<slug>.md``: identity, capability, and operative
history predications plus body content. Per FARS theory's
agential-self-generation principle, the agent's existence IS the
existence of its record — the system treats only agents-as-entities.

Three classes of predications carried per FARS
``objects/agent-record.md``:

* **Identity** — name (slug), title, type, description, role,
  reports-to, model, provenance, credential.
* **Capability** — skills, scope, work-types, jurisdiction (reads /
  writes), provides-capabilities, offices.
* **Operative history** — witness-chain, current-session, last-active.

The ``credential`` field references a :class:`Credential` slug whose
``public-key`` cell verifies this agent's witness signatures.
"""
from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Iterable, Literal

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from pyfars.kernel.witness import Witness

from pyfars.sdk.entities.endpoint import DEFAULT_AGENT_REQUIRED_CAPABILITIES


AgentType = Literal["human", "ai-model", "automated-process", "hybrid"]


class CharterBindings(BaseModel):
    """Frontmatter sub-record: rules and guidelines binding the agent."""
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    rules: list[str] = Field(default_factory=list)
    guidelines: list[str] = Field(default_factory=list)


class Jurisdiction(BaseModel):
    """Frontmatter sub-record: read/write scope expressed as path patterns
    or predicate slugs.

    Empty lists are treated as unscoped on that axis (legacy permissive
    default; the deny-by-default migration will tighten this). The
    wildcard ``"*"`` means "all" on that axis.
    """
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    read: list[str] = Field(default_factory=list)
    write: list[str] = Field(default_factory=list)


class Agent(BaseModel):
    """One agent's system record.

    Mirrors the frontmatter shape used by ``governance/agents/<slug>.md``
    records. Hyphenated keys are accepted via Pydantic field aliases;
    snake_case attribute access in Python.

    The record's ``slug`` is the canonical name used in witness
    ``agent`` fields. ``title`` / ``description`` are display-side; the
    slug is identity.
    """
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    slug: str

    # --- Identity ---------------------------------------------------

    title: str = ""
    description: str = ""

    type: AgentType | None = None
    """FARS-spec field: agent kind (human / ai-model / automated-process
    / hybrid). Optional; live records typically omit and the runtime
    infers from ``model`` / context."""

    role: str = ""
    """Office-shaped role tag (review / research / orchestration / ...).
    Distinct from the agent's offices."""

    reports_to: str | None = Field(default=None, alias="reports-to")
    serves: list[str] = Field(default_factory=list)

    model: str = ""
    """Model class hint (sonnet / opus / haiku / ...) for routing
    selection. Distinct from a concrete endpoint binding."""

    provenance: str | None = None
    """FARS-spec: predicate chain back to system-installation. Optional."""

    credential: str | None = None
    """Slug of the :class:`Credential` whose ``public-key`` cell verifies
    this agent's witness signatures. Optional until signing is wired."""

    # --- Capability -------------------------------------------------

    skills: list[str] = Field(default_factory=list)
    """Skill slugs the agent can invoke. References to Skill records."""

    work_types: list[str] = Field(default_factory=list, alias="work-types")
    """Workitem subtype predicates the agent handles (process /
    procedure / derivation / inquiry)."""

    provides_capabilities: list[str] = Field(
        default_factory=list, alias="provides-capabilities",
    )
    """Capability fiber the agent serves. Matched against workitem
    ``requires-capabilities`` at dispatch."""

    requires_capabilities: list[str] = Field(
        default_factory=list, alias="requires-capabilities",
    )
    """Capabilities the agent itself needs from an endpoint to run.
    Distinct from provides-capabilities. Empty falls back to the
    universal floor (text-generation, instruction-following)."""

    jurisdiction: Jurisdiction = Field(default_factory=Jurisdiction)
    """Path / predicate scope: where the agent may read and write."""

    offices: list[str] = Field(default_factory=list)
    """Office slugs the agent currently inhabits. Effective capabilities
    are the union of the agent's own skills and its offices'
    constructors."""

    # --- Deontic profile (Hohfeldian) -------------------------------

    duties: list[str] = Field(default_factory=list)
    powers: list[str] = Field(default_factory=list)
    privileges: list[str] = Field(default_factory=list)
    immunities: list[str] = Field(default_factory=list)

    charter_bindings: CharterBindings = Field(
        default_factory=CharterBindings, alias="charter-bindings",
    )

    # --- Behavioral envelope ----------------------------------------

    autonomous: list[str] = Field(default_factory=list)
    """Permitted-without-escalation actions."""

    escalates: list[str] = Field(default_factory=list)
    """Decisions the agent must escalate."""

    # --- Operative history ------------------------------------------

    witness_chain: list[str] = Field(
        default_factory=list, alias="witness-chain",
    )
    """FARS-spec: content-addressed references to witnesses this agent
    has emitted, in canonical order. Replay reproduces the agent's
    history. Empty for fresh records; populated by the runtime as the
    agent acts."""

    current_session: str | None = Field(
        default=None, alias="current-session",
    )
    """Reference to the agent's currently-open SessionRecord. Null
    between sessions."""

    last_active: str | None = Field(default=None, alias="last-active")
    """ISO-8601 timestamp of the agent's most recent witness emission."""

    # --- Body --------------------------------------------------------

    body: str = ""
    """Markdown body following the frontmatter — the agent's
    persona / system-prompt source."""

    # --- Helpers -----------------------------------------------------

    @property
    def required_capabilities(self) -> tuple[str, ...]:
        """Capabilities this agent needs from an endpoint to run.

        Returns the declared ``requires-capabilities`` list when
        non-empty; otherwise falls back to the universal floor
        (text-generation, instruction-following) — the bilattice
        eligibility-by-capabilities rule cannot resolve a router-side
        endpoint without at least these.
        """
        if self.requires_capabilities:
            return tuple(self.requires_capabilities)
        return tuple(DEFAULT_AGENT_REQUIRED_CAPABILITIES)

    @property
    def system_prompt(self) -> str:
        """Rendered system prompt from frontmatter + body.

        Composes the agent's persona block (title / description / role
        / duties / powers / immunities) followed by the body. The
        result is what a PydanticAI Agent's ``system_prompt`` is set to
        at compile time.
        """
        parts: list[str] = []
        if self.title:
            parts.append(f"You are {self.title}.")
        if self.description:
            parts.append(self.description)
        if self.role:
            parts.append(f"Role: {self.role}.")
        if self.duties:
            parts.append("Duties:\n" + "\n".join(f"  - {d}" for d in self.duties))
        if self.powers:
            parts.append("Powers:\n" + "\n".join(f"  - {p}" for p in self.powers))
        if self.immunities:
            parts.append(
                "Immunities (cannot be required of you):\n"
                + "\n".join(f"  - {i}" for i in self.immunities)
            )
        body = self.body.strip()
        if body:
            parts.append(body)
        return "\n\n".join(parts)

    def can_read(self, predicate: str) -> bool:
        """True iff this agent's jurisdiction permits reading the slug."""
        if not self.jurisdiction.read:
            return True
        return "*" in self.jurisdiction.read or predicate in self.jurisdiction.read

    def can_write(self, predicate: str) -> bool:
        """True iff this agent's jurisdiction permits writing the slug."""
        if not self.jurisdiction.write:
            return True
        return "*" in self.jurisdiction.write or predicate in self.jurisdiction.write

    def has_capability(self, capability: str) -> bool:
        return capability in self.provides_capabilities

    def has_skill(self, skill: str) -> bool:
        return skill in self.skills

    def covers(self, required_capabilities: Iterable[str]) -> bool:
        """True iff this agent's provides-capabilities covers the
        required set — the agent-side reading of the
        eligibility-by-capabilities closure rule."""
        provided = set(self.provides_capabilities)
        return set(required_capabilities) <= provided

    def to_witness(
        self,
        operator: str,
        *,
        details: dict | None = None,
        channel: str | None = None,
        kind: str = "observation",
        target: str | None = None,
    ) -> "Witness":
        """Render an entity-self-witness — this agent was the actor.

        Generic affordance for the agent acting on its own system fiber
        record (status changes, capability updates, witness-chain
        appends). The witness's ``agent`` field is set to this
        agent's slug; ``target`` defaults to the agent's own record
        path under ``governance/agents/``.

        For system-mutation operators (the agent edits a different
        record, sends a message, queues an intent), construct the
        witness via the relevant operator's helper instead — those
        carry before/after hashes that make sense for the target.
        """
        from pyfars.kernel.witness import make_witness

        merged_details = dict(details or {})
        return make_witness(
            operator=operator,
            target=target or f"governance/agents/{self.slug}.md",
            before_hash=None,
            after_hash=None,
            details=merged_details,
            agent=self.slug,
            channel=channel,
            origin=self.slug,
            kind=kind,  # type: ignore[arg-type]
        )


__all__ = [
    "Agent",
    "AgentType",
    "CharterBindings",
    "Jurisdiction",
]
