"""Token shapes issued by the polity's AS.

The OAuth spec's base ``AccessToken`` / ``AuthorizationCode`` /
``RefreshToken`` carry the protocol-level fields (client_id, scopes,
expires_at, resource). The polity additionally carries one identity
field: ``subject`` — the substrate slug the token authenticates as
(the :attr:`Credential.bound_to` of the matched credential record).
The upstream OAuth ``issuer`` and ``oauth_subject`` claims are
recorded for audit; they don't drive authorization (the substrate
subject does, via working-fiber composition).

The MCP adapter (:mod:`pyfars.programs.identity.mcp_provider`) wraps
these in the MCP SDK's ``AccessToken`` Protocol shape; the FastAPI
adapter (:mod:`pyfars.programs.identity.fastapi_router`) reads them
as request-context state.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class PolityAccessToken:
    """An access token issued by the polity's AS."""
    token: str
    client_id: str
    scopes: list[str] = field(default_factory=list)
    expires_at: int | None = None
    resource: str | None = None

    subject: str = ""
    """Substrate subject (the matched Credential's ``bound_to``)."""

    issuer: str = ""
    oauth_subject: str = ""
    email: str | None = None


@dataclass
class PolityAuthorizationCode:
    """A short-lived authorization code minted at /authorize."""
    code: str
    client_id: str
    redirect_uri: str
    redirect_uri_provided_explicitly: bool
    scopes: list[str]
    code_challenge: str
    expires_at: int

    subject: str = ""
    issuer: str = ""
    oauth_subject: str = ""
    email: str | None = None


@dataclass
class PolityRefreshToken:
    """A long-lived refresh token issued alongside the access token."""
    token: str
    client_id: str
    scopes: list[str] = field(default_factory=list)
    expires_at: int | None = None

    subject: str = ""
    issuer: str = ""
    oauth_subject: str = ""
    email: str | None = None
