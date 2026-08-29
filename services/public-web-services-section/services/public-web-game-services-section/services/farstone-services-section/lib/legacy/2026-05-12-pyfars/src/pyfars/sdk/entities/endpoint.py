"""LLM endpoint records — system-driven inference dispatch.

Endpoints are markdown records under
``governance/assets/computing/endpoints/<slug>.md`` with
``type: llm-endpoint``. Each record describes an outbound-only LLM
inference surface the swarm can dispatch to: a provider, a model
name, a base URL, an env-var-named credential, capabilities, and
rate-limit observations.

This module realizes the **endpoint** concept (see
``concepts/endpoint.md``) and the **eligibility-by-capabilities**
closure rule (see ``objects/eligibility-by-capabilities.md``):
agents do *not* declare the model they run on. The model is
inferred by matching the work's required capabilities against each
endpoint's ``provides-capabilities`` and walking the rate-limit
budget cells to filter out exhausted endpoints. Predication
category theory is the formal basis — capabilities are predicates,
the match is a bilattice-valued cell, and the dispatch decision is
a knowledge-meet across eligibility axes.

Key points:

* Field names mirror the existing system records exactly
  (``model-name``, ``base-url``, ``auth-env-var``,
  ``provides-capabilities``, ``work-types``, etc. — populated via
  Pydantic field aliases).
* No tier scheme — endpoints declare what they *can* do
  (capabilities) and what *kinds* of work they accept (work-types),
  not an abstract size class.
* Credentials live in env vars; the system cell carries only
  the variable's name.
"""
from __future__ import annotations

import os
from typing import Iterable

from pydantic import BaseModel, ConfigDict, Field


class Endpoint(BaseModel):
    """One LLM endpoint declared by the system.

    Mirrors the frontmatter shape used by records under
    ``governance/assets/computing/endpoints/``. Field aliases let
    the Pydantic model accept the hyphenated keys the records use
    while exposing snake_case attribute access in Python.
    """
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    slug: str

    provider: str
    """Provider key (cerebras / groq / nvidia-nim / mistral / huggingface-router / ...)."""

    model_name: str = Field(default="", alias="model-name")
    """Provider-specific model identifier. Empty for router-style endpoints
    (huggingface-router) where the model is chosen per-request."""

    base_url: str = Field(default="", alias="base-url")
    """API base URL (typically OpenAI-compatible)."""

    auth_env_var: str | None = Field(default=None, alias="auth-env-var")
    """Name of the env var carrying the credential. ``None`` for endpoints
    that don't need one (test mocks, future local-LLM hosts)."""

    provides_capabilities: list[str] = Field(
        default_factory=list, alias="provides-capabilities",
    )
    """The capability fiber the endpoint serves (text-generation,
    instruction-following, tool-calling, structured-output, vision, ...).
    Matched against work-record requires-capabilities at dispatch."""

    work_types: list[str] = Field(default_factory=list, alias="work-types")
    """Categories of work the endpoint accepts (generation, summarization,
    derivation, fallback-routing, ...)."""

    grade: str = ""
    """Coarse size hint (small / medium / large / variable). System
    can use this for tie-breaks; not a routing axis on its own."""

    supports_tool_calling: bool = Field(
        default=False, alias="supports-tool-calling",
    )
    supports_structured_output: bool = Field(
        default=False, alias="supports-structured-output",
    )

    context_window_tokens: int | str | None = Field(
        default=None, alias="context-window-tokens",
    )
    """Empty-string in records means "unspecified / variable"."""

    cost_per_token_in: float | str | None = Field(
        default=None, alias="cost-per-token-in",
    )
    cost_per_token_out: float | str | None = Field(
        default=None, alias="cost-per-token-out",
    )

    rate_limit_rpm: int | str | None = Field(
        default=None, alias="rate-limit-rpm",
    )
    rate_limit_rpd: int | str | None = Field(
        default=None, alias="rate-limit-rpd",
    )
    rate_limit_tpm: int | str | None = Field(
        default=None, alias="rate-limit-tpm",
    )
    rate_limit_tpd: int | str | None = Field(
        default=None, alias="rate-limit-tpd",
    )

    @property
    def has_credentials(self) -> bool:
        """True iff the named env var is populated (or no var is needed)."""
        if self.auth_env_var is None or self.auth_env_var == "":
            return True
        return bool(os.environ.get(self.auth_env_var))

    def covers(self, required_capabilities: Iterable[str]) -> bool:
        """True iff this endpoint's ``provides-capabilities`` covers the
        ``required_capabilities`` set — the system's
        ``eligibility-by-capabilities`` closure rule applied to this endpoint.
        """
        provided = set(self.provides_capabilities)
        return set(required_capabilities) <= provided

    @property
    def pydantic_ai_model_string(self) -> str:
        """``provider:model`` form PydanticAI's ``infer_model`` accepts.

        Special-case: ``provider == 'test'`` → bare ``test`` (TestModel,
        no network). Most free endpoints expose OpenAI-compatible APIs;
        their PydanticAI form is ``openai:<model-name>`` with the
        ``base-url`` overriding the OpenAI default.
        """
        if self.provider == "test":
            return "test"
        # OpenAI-compatible providers (cerebras / groq / mistral / nvidia-nim
        # / huggingface-router / openrouter / ollama, ...) all route through
        # PydanticAI's openai provider with a base_url override. The
        # provider's own name is recorded for system-side accounting and
        # can drive a different routing policy when one is added.
        return f"openai:{self.model_name}"


class EndpointRouter:
    """Resolve an agent invocation to a concrete endpoint.

    Implements the dispatch closure-rule chain in code form: capability
    match (``eligibility-by-capabilities``), credential filter,
    record-order tie-break. Rate-limit-budget filtering and Pareto-min
    cost-discipline are next layers; deferred until the engine emits
    rate-limit-budget cells the router can consult.

    System is the source of truth — the router holds an immutable
    snapshot loaded by ``from_polity(root)``.
    """

    def __init__(self, endpoints: Iterable[Endpoint]):
        self._endpoints: list[Endpoint] = list(endpoints)

    @property
    def endpoints(self) -> list[Endpoint]:
        return list(self._endpoints)

    def resolve(
        self,
        required_capabilities: Iterable[str],
        *,
        require_credentials: bool = True,
    ) -> Endpoint | None:
        """Return the first endpoint whose ``provides-capabilities`` covers
        the requested set and whose credentials are present.

        ``required_capabilities`` is the work-record / agent need; the
        match is the eligibility-by-capabilities closure rule applied
        to one endpoint at a time. Record order in the system
        provides the first-match tie-break (the polity's recommended
        dispatch order lives in the index, and discover walks
        alphabetically for now — system-driven ranking is the
        next refinement).
        """
        required = set(required_capabilities)
        for ep in self._endpoints:
            if not ep.covers(required):
                continue
            if require_credentials and not ep.has_credentials:
                continue
            return ep
        return None

    def capabilities(self) -> set[str]:
        """Union of all endpoints' ``provides-capabilities``."""
        out: set[str] = set()
        for ep in self._endpoints:
            out.update(ep.provides_capabilities)
        return out



# A small set of capabilities most LLM-backed agents require; serves
# as the "universal floor" when an agent record doesn't declare a
# specific requirement set. System-extendable: agents can declare
# ``requires-capabilities:`` to widen this beyond the floor.
DEFAULT_AGENT_REQUIRED_CAPABILITIES: tuple[str, ...] = (
    "text-generation",
    "instruction-following",
)


__all__ = [
    "DEFAULT_AGENT_REQUIRED_CAPABILITIES",
    "Endpoint",
    "EndpointRouter",
]
