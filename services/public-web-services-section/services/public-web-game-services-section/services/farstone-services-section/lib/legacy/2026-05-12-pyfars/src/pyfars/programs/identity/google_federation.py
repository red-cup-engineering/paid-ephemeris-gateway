"""Google OIDC relying-party for the upstream identity leg.

The polity's OAuth Authorization Server is *federated*: it issues its own
access tokens to clients (Claude.ai, ChatGPT, MCP Inspector, the operator
UI) but it does not own user passwords or 2FA. Instead, when a user lands
at ``/oauth/authorize`` we redirect their browser to Google. Google
authenticates the user, redirects back to ``/oauth/google/callback`` with
an authorization code, we exchange it for an ID token, validate the
signature + claims, and use the (issuer, subject) pair to look up the
matching :class:`Credential` record in the system (the substrate's
auth surface uses Credential records as the binding from external
proof to substrate subject).

This module wraps the upstream Google leg. Construction does OIDC
discovery once at startup; each authorize/exchange is a fresh round-trip
to Google.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode


@dataclass
class GoogleClaims:
    """The three claims we trust from a validated Google ID token."""
    issuer: str
    subject: str
    email: str | None


class GoogleFederation:
    """Upstream OIDC relying-party for Google.

    Constructor performs OIDC discovery once and caches the JWKS.
    :meth:`build_authorize_url` produces the Google URL we redirect the
    user's browser to. :meth:`exchange_code` posts the auth code back to
    Google's token endpoint, decodes and validates the ID token, and
    returns a :class:`GoogleClaims` triple.
    """

    DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

    def __init__(
        self,
        *,
        client_id: str,
        client_secret: str,
        callback_url: str,
        scopes: tuple[str, ...] = ("openid", "email"),
        leeway_seconds: int = 30,
    ) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.callback_url = callback_url
        self.scopes = scopes
        self.leeway = leeway_seconds
        self._authorization_endpoint: str | None = None
        self._token_endpoint: str | None = None
        self._issuer: str | None = None
        self._jwks: Any | None = None
        self._discover()

    def _discover(self) -> None:
        import httpx
        with httpx.Client(timeout=10.0) as client:
            doc = client.get(self.DISCOVERY_URL).raise_for_status().json()
        self._authorization_endpoint = doc["authorization_endpoint"]
        self._token_endpoint = doc["token_endpoint"]
        self._issuer = doc["issuer"].rstrip("/")
        jwks_uri = doc["jwks_uri"]
        from authlib.jose import JsonWebKey
        with httpx.Client(timeout=10.0) as client:
            payload = client.get(jwks_uri).raise_for_status().json()
        self._jwks = JsonWebKey.import_key_set(payload)

    @property
    def issuer(self) -> str:
        assert self._issuer is not None
        return self._issuer

    def build_authorize_url(self, *, state: str, nonce: str | None = None) -> str:
        """Return the Google authorize URL to redirect the user's browser to."""
        assert self._authorization_endpoint is not None
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.callback_url,
            "response_type": "code",
            "scope": " ".join(self.scopes),
            "state": state,
            "access_type": "online",
            "prompt": "select_account",
        }
        if nonce:
            params["nonce"] = nonce
        return f"{self._authorization_endpoint}?{urlencode(params)}"

    def exchange_code(self, *, code: str) -> GoogleClaims:
        """Exchange an authorization code for an ID token; return claims."""
        import httpx
        from authlib.jose import jwt
        from authlib.jose.errors import JoseError

        assert self._token_endpoint is not None
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                self._token_endpoint,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.callback_url,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
            )
            resp.raise_for_status()
            payload = resp.json()

        id_token_str = payload.get("id_token")
        if not id_token_str:
            raise RuntimeError("Google token response missing id_token")

        try:
            claims = jwt.decode(id_token_str, self._jwks)
            claims.validate(now=int(time.time()), leeway=self.leeway)
        except JoseError as exc:
            raise RuntimeError(f"Google id_token validation failed: {exc}") from exc

        iss = str(claims.get("iss", "")).rstrip("/")
        if iss != self.issuer:
            raise RuntimeError(
                f"Google id_token issuer mismatch: got {iss!r}, expected {self.issuer!r}"
            )
        sub = str(claims.get("sub") or "")
        if not sub:
            raise RuntimeError("Google id_token missing sub claim")
        # Google returns aud == client_id for direct ID tokens.
        aud = claims.get("aud")
        if isinstance(aud, list):
            if self.client_id not in aud:
                raise RuntimeError(f"Google id_token audience mismatch: {aud}")
        elif aud != self.client_id:
            raise RuntimeError(f"Google id_token audience mismatch: {aud}")

        return GoogleClaims(
            issuer=iss,
            subject=sub,
            email=claims.get("email"),
        )
