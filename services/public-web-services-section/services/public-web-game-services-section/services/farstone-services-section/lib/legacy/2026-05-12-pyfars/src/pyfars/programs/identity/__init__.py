"""Identity provider — the bridge whose protocol *issues* credentials.

``IdentityProviderBridge`` is a :class:`BridgeProgram` like any other,
but its role is dual to the rest of the bridge family: it serves the
OAuth Authorization Server endpoints so external clients can do the
OIDC dance against Google, receive a polity-issued access token, and
then present that token to other bridges (Web, MCP, A2A). Those
bridges verify the token at their request boundary; this bridge mints
it.

The bridge does not consume credentials — it produces them. As a
result it does NOT call :meth:`BridgeProgram.handle_call` per request
(there's no incoming credential to gate). OAuth's own protocol-level
auth (PKCE, registered redirect URIs, client secrets) governs the AS
endpoints; subject resolution to the substrate happens at the
``/oauth/google/callback`` step where ``find_credential`` looks up
the matching ``kind: credential`` record.

Surface:

- :class:`PolityOAuthServer` — framework-agnostic AS core
- :class:`GoogleFederation` — minimal OIDC relying-party
- :class:`PolityAccessToken`, etc. — token dataclasses
- :class:`IdentityProviderBridge` — long-running BridgeProgram
"""
from __future__ import annotations

from pyfars.programs.identity.bridge import IdentityProviderBridge
from pyfars.programs.identity.google_federation import (
    GoogleClaims,
    GoogleFederation,
)
from pyfars.programs.identity.oauth_server import (
    AccessDenied,
    ClientInfo,
    InvalidClient,
    InvalidGrant,
    InvalidRequest,
    OAuthError,
    PolityOAuthServer,
)
from pyfars.programs.identity.tokens import (
    PolityAccessToken,
    PolityAuthorizationCode,
    PolityRefreshToken,
)

__all__ = [
    "AccessDenied",
    "ClientInfo",
    "GoogleClaims",
    "GoogleFederation",
    "IdentityProviderBridge",
    "InvalidClient",
    "InvalidGrant",
    "InvalidRequest",
    "OAuthError",
    "PolityAccessToken",
    "PolityAuthorizationCode",
    "PolityOAuthServer",
    "PolityRefreshToken",
]
