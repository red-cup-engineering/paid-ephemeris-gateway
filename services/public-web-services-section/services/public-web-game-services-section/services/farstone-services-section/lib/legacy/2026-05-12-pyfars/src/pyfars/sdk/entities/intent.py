"""Intent records — incoming requests parsed into system form.

A Intent is the system's representation of a request that
arrived from outside the polity's normal work-record hierarchy: a
human filing a request via the CLI / web / MCP surface, a federation
peer requesting work, an external system bridging in via a channel.

The intent's lifecycle is:

    pending → claimed → resolved
                     → rejected
                     → abandoned

When the intent is admitted, it typically resolves into a system
workitem (procedure / derivation / inquiry / process). The
``resolves_to`` field carries the slug of that workitem once the
resolution has been performed.

Theory gap surfaced by Pass 1.5 research: the FARS theory does not
yet have a ``dispatch-intent-record`` object spec. This class is
PyFARS-side scaffolding that we expect the upstream theory to
formalize over time. The frontmatter shape used here follows the
patterns of other governance records (slug, type, status, kind, body).
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


IntentStatus = Literal[
    "pending",
    "claimed",
    "resolved",
    "rejected",
    "abandoned",
]


IntentSurface = Literal[
    "cli",
    "web",
    "mcp",
    "channel",
    "federation",
    "uds",
    "other",
]
"""Surface the intent arrived through. Drives audit and routing
discipline — UDS-bound HTTP intents (Pass 5.G) are routed differently
from federation-peer intents."""


class Intent(BaseModel):
    """One incoming request parsed into system-workable form."""

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    slug: str

    title: str = ""
    description: str = ""

    status: IntentStatus = "pending"

    # --- Provenance --------------------------------------------------

    principal: str | None = None
    """The entity that filed the intent. Examples:
    ``"human:emsenn"``, ``"federation-peer:rsc-quiescent"``,
    ``"external-system:hugo-build-hook"``. May be unknown for some
    surfaces."""

    surface: IntentSurface | None = None

    arrived_at: str | None = Field(default=None, alias="arrived-at")
    """ISO-8601 timestamp the intent was filed."""

    # --- Workflow ----------------------------------------------------

    claimed_by: str | None = Field(default=None, alias="claimed-by")
    """Agent or office slug that took ownership of the intent.
    Null when status is pending."""

    claimed_at: str | None = Field(default=None, alias="claimed-at")

    resolved_at: str | None = Field(default=None, alias="resolved-at")

    resolves_to: str | None = Field(default=None, alias="resolves-to")
    """Workitem slug the intent is resolving into (or has resolved
    into). The runtime creates the workitem record and points back
    via this field once the resolution is performed."""

    resolution: str | None = None
    """Short prose description of how the intent was settled.
    Required when status is resolved or rejected."""

    # --- Payload -----------------------------------------------------

    payload: dict = Field(default_factory=dict)
    """Free-form dict carrying the intent's content. Surface-specific
    schemas (the CLI verb's argv, the HTTP request body, the channel
    message) are stored here; downstream rules pattern-match on the
    payload to decide how to convert into workitems."""

    # --- Body --------------------------------------------------------

    body: str = ""

    @property
    def is_terminal(self) -> bool:
        return self.status in {"resolved", "rejected", "abandoned"}


__all__ = [
    "Intent",
    "IntentStatus",
    "IntentSurface",
]
