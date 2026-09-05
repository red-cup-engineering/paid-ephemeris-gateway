"""Polity-side OAuth Authorization Server, framework-agnostic core.

Implements the polity's federated AS: clients (Claude.ai, ChatGPT, MCP
Inspector, the operator UI) speak OAuth to *us*; we redirect the user's
browser to Google for identity; on return we look up the (issuer, subject)
pair against the substrate's user-account records, mint our own opaque
authorization code, then access+refresh tokens.

Per the wiring-protocols spec §4.3 / §4.4, the AS is shared across protocol
surfaces — both the web service's authenticated routes and the MCP service's
tool transport authenticate against the same provider.

This module is intentionally framework-agnostic: it doesn't import FastAPI
or the MCP SDK. The two adapters in this package — :mod:`fastapi_router`
and :mod:`mcp_provider` — wrap this core for each protocol's expected shape.

Persistence:

- DCR client registry → ``<state_dir>/clients.json`` (survives restart)
- Authorization codes (5 min TTL) — in memory; restart forces re-authorize
- Access + refresh tokens — in memory; restart forces re-authorize

In-memory state on the access/refresh side is acceptable because OAuth
clients always have a refresh-then-reauthorize fallback; persisting them
would invite stale-token-after-revocation hazards.
"""
from __future__ import annotations

import hashlib
import json
import secrets
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from pyfars.kernel.store import System
from pyfars.programs.identity.google_federation import GoogleFederation
from pyfars.programs.identity.tokens import (
    PolityAccessToken,
    PolityAuthorizationCode,
    PolityRefreshToken,
)
from pyfars.sdk.entities.credential import find_credential


_DEFAULT_ACCESS_TTL = 3600                      # 1 hour
_DEFAULT_REFRESH_TTL = 60 * 60 * 24 * 30        # 30 days
_DEFAULT_CODE_TTL = 300                         # 5 minutes
_DEFAULT_PENDING_TTL = 600                      # 10 minutes (browser federation)


# ---------------------------------------------------------------------------
# Errors — opaque to callers; adapter layers translate to protocol-specific
# error responses (HTTP 4xx with OAuth error JSON, MCP SDK AuthorizeError,
# etc.).
# ---------------------------------------------------------------------------


class OAuthError(Exception):
    """OAuth-protocol error suitable for translation to RFC 6749 error responses."""
    def __init__(self, code: str, description: str = "") -> None:
        super().__init__(f"{code}: {description}")
        self.code = code
        self.description = description


class InvalidRequest(OAuthError):
    def __init__(self, description: str) -> None:
        super().__init__("invalid_request", description)


class InvalidClient(OAuthError):
    def __init__(self, description: str) -> None:
        super().__init__("invalid_client", description)


class InvalidGrant(OAuthError):
    def __init__(self, description: str) -> None:
        super().__init__("invalid_grant", description)


class AccessDenied(OAuthError):
    """Returned via redirect (RFC 6749 §4.1.2.1) — the caller renders the redirect,
    not a 4xx response."""
    def __init__(self, description: str) -> None:
        super().__init__("access_denied", description)


# ---------------------------------------------------------------------------
# Client metadata — DCR (RFC 7591) shape, polity-side dataclass.
# Mirror the MCP SDK's OAuthClientInformationFull fields the AS uses; the
# adapter layers translate to/from the SDK's Pydantic model when needed.
# ---------------------------------------------------------------------------


@dataclass
class ClientInfo:
    client_id: str
    redirect_uris: list[str]
    client_secret: str | None = None
    token_endpoint_auth_method: str = "client_secret_basic"
    grant_types: list[str] = field(default_factory=lambda: ["authorization_code", "refresh_token"])
    response_types: list[str] = field(default_factory=lambda: ["code"])
    scope: str = ""
    client_name: str | None = None
    client_id_issued_at: int = 0
    client_secret_expires_at: int = 0  # 0 = never expires

    def to_dict(self) -> dict[str, Any]:
        out = {
            "client_id": self.client_id,
            "redirect_uris": list(self.redirect_uris),
            "token_endpoint_auth_method": self.token_endpoint_auth_method,
            "grant_types": list(self.grant_types),
            "response_types": list(self.response_types),
            "scope": self.scope,
            "client_id_issued_at": self.client_id_issued_at,
            "client_secret_expires_at": self.client_secret_expires_at,
        }
        if self.client_secret is not None:
            out["client_secret"] = self.client_secret
        if self.client_name:
            out["client_name"] = self.client_name
        return out

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ClientInfo":
        return cls(
            client_id=data["client_id"],
            redirect_uris=list(data.get("redirect_uris") or []),
            client_secret=data.get("client_secret"),
            token_endpoint_auth_method=data.get("token_endpoint_auth_method", "client_secret_basic"),
            grant_types=list(data.get("grant_types") or ["authorization_code", "refresh_token"]),
            response_types=list(data.get("response_types") or ["code"]),
            scope=data.get("scope") or "",
            client_name=data.get("client_name"),
            client_id_issued_at=int(data.get("client_id_issued_at") or 0),
            client_secret_expires_at=int(data.get("client_secret_expires_at") or 0),
        )


# ---------------------------------------------------------------------------
# Persistent DCR client store.
# ---------------------------------------------------------------------------


class ClientStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.Lock()
        self._data: dict[str, ClientInfo] = {}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        for cid, blob in raw.items():
            try:
                self._data[cid] = ClientInfo.from_dict(blob)
            except Exception:
                continue

    def _flush(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        out = {cid: c.to_dict() for cid, c in self._data.items()}
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(json.dumps(out, indent=2, sort_keys=True), encoding="utf-8")
        tmp.replace(self.path)

    def add(self, client: ClientInfo) -> None:
        with self._lock:
            self._data[client.client_id] = client
            self._flush()

    def get(self, client_id: str) -> ClientInfo | None:
        with self._lock:
            return self._data.get(client_id)

    def all(self) -> list[ClientInfo]:
        with self._lock:
            return list(self._data.values())


# ---------------------------------------------------------------------------
# Pending authorization — parked /authorize while the user is at Google.
# ---------------------------------------------------------------------------


@dataclass
class PendingAuthorization:
    client_id: str
    redirect_uri: str
    redirect_uri_provided_explicitly: bool
    scopes: list[str]
    code_challenge: str
    code_challenge_method: str
    original_state: str | None
    resource: str | None
    created_at: float = field(default_factory=time.time)


# ---------------------------------------------------------------------------
# The server.
# ---------------------------------------------------------------------------


class PolityOAuthServer:
    """The polity's OAuth Authorization Server — framework-agnostic core.

    Owns the AS state (clients, pending auths, codes, tokens). Federates
    user authentication to Google. Resolves the upstream (issuer, subject)
    claim pair to a substrate subject by looking up the matching
    ``kind: credential`` record (``kind: oauth-account``); tokens carry
    that substrate subject.

    The :mod:`fastapi_router` adapter mounts this on a FastAPI app for HTTP
    transport. The :mod:`mcp_provider` adapter wraps it as an MCP SDK
    ``OAuthAuthorizationServerProvider`` for the MCP HTTP+SSE transport.
    """

    def __init__(
        self,
        *,
        federation: GoogleFederation,
        substrate_root: Path,
        state_dir: Path,
        scopes_supported: list[str] | None = None,
        access_token_ttl: int = _DEFAULT_ACCESS_TTL,
        refresh_token_ttl: int = _DEFAULT_REFRESH_TTL,
        code_ttl: int = _DEFAULT_CODE_TTL,
    ) -> None:
        self.federation = federation
        self.substrate_root = substrate_root
        self.scopes_supported = scopes_supported or []
        self.access_token_ttl = access_token_ttl
        self.refresh_token_ttl = refresh_token_ttl
        self.code_ttl = code_ttl

        self._clients = ClientStore(state_dir / "clients.json")
        self._pending: dict[str, PendingAuthorization] = {}
        self._codes: dict[str, PolityAuthorizationCode] = {}
        self._access: dict[str, PolityAccessToken] = {}
        self._refresh: dict[str, PolityRefreshToken] = {}
        self._refresh_to_access: dict[str, str] = {}
        self._lock = threading.Lock()

    # ----- DCR (RFC 7591) ----------------------------------------------------

    def register_client(self, metadata: dict[str, Any]) -> ClientInfo:
        """Register a new client per RFC 7591. Returns the issued credentials.

        The metadata dict is the request body sent to the /register endpoint.
        ``redirect_uris`` is required; everything else has defaults.
        """
        redirect_uris = metadata.get("redirect_uris")
        if not redirect_uris or not isinstance(redirect_uris, list):
            raise InvalidRequest("redirect_uris is required")

        token_endpoint_auth_method = metadata.get(
            "token_endpoint_auth_method", "client_secret_basic"
        )
        is_public = token_endpoint_auth_method == "none"
        client = ClientInfo(
            client_id=secrets.token_urlsafe(24),
            client_secret=None if is_public else secrets.token_urlsafe(32),
            redirect_uris=[str(u) for u in redirect_uris],
            token_endpoint_auth_method=token_endpoint_auth_method,
            grant_types=metadata.get("grant_types") or ["authorization_code", "refresh_token"],
            response_types=metadata.get("response_types") or ["code"],
            scope=metadata.get("scope") or "",
            client_name=metadata.get("client_name"),
            client_id_issued_at=int(time.time()),
        )
        self._clients.add(client)
        return client

    def get_client(self, client_id: str) -> ClientInfo | None:
        return self._clients.get(client_id)

    # ----- /authorize → Google redirect -------------------------------------

    def start_authorization(
        self,
        *,
        client_id: str,
        redirect_uri: str,
        redirect_uri_provided_explicitly: bool,
        scopes: list[str],
        code_challenge: str,
        code_challenge_method: str = "S256",
        state: str | None = None,
        resource: str | None = None,
    ) -> str:
        """Park the /authorize request, return Google authorize URL.

        The caller (FastAPI route or MCP adapter) issues an HTTP 302 to the
        returned URL. When Google calls our /oauth/google/callback we re-find
        the parked request via the state we encoded.
        """
        client = self._clients.get(client_id)
        if client is None:
            raise InvalidClient("unknown client_id")
        if redirect_uri not in client.redirect_uris:
            raise InvalidRequest(f"redirect_uri not registered: {redirect_uri}")

        google_state = secrets.token_urlsafe(24)
        with self._lock:
            self._pending[google_state] = PendingAuthorization(
                client_id=client_id,
                redirect_uri=redirect_uri,
                redirect_uri_provided_explicitly=redirect_uri_provided_explicitly,
                scopes=list(scopes),
                code_challenge=code_challenge,
                code_challenge_method=code_challenge_method,
                original_state=state,
                resource=resource,
            )
            self._gc_pending()
        return self.federation.build_authorize_url(state=google_state)

    def complete_authorization(self, *, google_state: str, google_code: str) -> str:
        """Finish the federated leg: validate Google's response, mint our code,
        return the URL to redirect the browser back to the original client.

        Called by the /oauth/google/callback route handler.
        """
        with self._lock:
            pending = self._pending.pop(google_state, None)
        if pending is None:
            raise InvalidRequest("unknown or expired state")

        claims = self.federation.exchange_code(code=google_code)

        system = System.from_root(self.substrate_root)
        credential = find_credential(
            system.store,
            kind="oauth-account",
            issuer=claims.issuer,
            subject=claims.subject,
        )

        if credential is None:
            return _construct_redirect(
                pending.redirect_uri,
                error="access_denied",
                error_description="not a recognized principal",
                state=pending.original_state,
            )

        code = secrets.token_urlsafe(32)
        with self._lock:
            self._codes[code] = PolityAuthorizationCode(
                code=code,
                client_id=pending.client_id,
                redirect_uri=pending.redirect_uri,
                redirect_uri_provided_explicitly=pending.redirect_uri_provided_explicitly,
                scopes=pending.scopes,
                code_challenge=pending.code_challenge,
                expires_at=int(time.time()) + self.code_ttl,
                subject=credential.bound_to,
                issuer=claims.issuer,
                oauth_subject=claims.subject,
                email=claims.email,
            )
        return _construct_redirect(
            pending.redirect_uri, code=code, state=pending.original_state,
        )

    # ----- /token (auth code grant) -----------------------------------------

    def exchange_authorization_code(
        self,
        *,
        client_id: str,
        client_secret: str | None,
        code: str,
        code_verifier: str,
        redirect_uri: str,
    ) -> dict[str, Any]:
        """Exchange auth code → access + refresh tokens. Returns the OAuth
        token response body."""
        client = self._authenticate_client(client_id, client_secret)
        with self._lock:
            authcode = self._codes.pop(code, None)
        if authcode is None:
            raise InvalidGrant("unknown or expired authorization code")
        if authcode.client_id != client.client_id:
            raise InvalidGrant("authorization code was issued to a different client")
        if authcode.redirect_uri != redirect_uri:
            raise InvalidGrant("redirect_uri mismatch")
        if authcode.expires_at < int(time.time()):
            raise InvalidGrant("authorization code expired")

        # PKCE verification (RFC 7636) — S256 only, matching what we accept.
        verifier_hash = hashlib.sha256(code_verifier.encode("ascii")).digest()
        import base64 as _b64
        expected_challenge = _b64.urlsafe_b64encode(verifier_hash).rstrip(b"=").decode("ascii")
        if expected_challenge != authcode.code_challenge:
            raise InvalidGrant("PKCE verifier does not match challenge")

        return self._mint_tokens(authcode=authcode)

    # ----- /token (refresh grant) -------------------------------------------

    def refresh(
        self,
        *,
        client_id: str,
        client_secret: str | None,
        refresh_token: str,
    ) -> dict[str, Any]:
        client = self._authenticate_client(client_id, client_secret)
        with self._lock:
            refresh = self._refresh.get(refresh_token)
        if refresh is None:
            raise InvalidGrant("unknown refresh token")
        if refresh.client_id != client.client_id:
            raise InvalidGrant("refresh token was issued to a different client")
        if refresh.expires_at and refresh.expires_at < int(time.time()):
            raise InvalidGrant("refresh token expired")

        # Revoke the previous access token bound to this refresh token, then
        # mint fresh ones (rotating the refresh token too — strict RFC 6749 §6
        # rotation).
        with self._lock:
            old_access = self._refresh_to_access.pop(refresh_token, None)
            if old_access:
                self._access.pop(old_access, None)
            self._refresh.pop(refresh_token, None)
        return self._mint_tokens_from_principal(
            client=client,
            scopes=refresh.scopes,
            subject=refresh.subject,
            issuer=refresh.issuer,
            oauth_subject=refresh.oauth_subject,
            email=refresh.email,
        )

    # ----- /revoke ----------------------------------------------------------

    def revoke(self, *, token: str, token_type_hint: str | None = None) -> None:
        with self._lock:
            self._access.pop(token, None)
            ref = self._refresh.pop(token, None)
            if ref is not None:
                bound = self._refresh_to_access.pop(token, None)
                if bound:
                    self._access.pop(bound, None)

    # ----- Validation -------------------------------------------------------

    def validate_access_token(self, token: str) -> PolityAccessToken | None:
        with self._lock:
            tok = self._access.get(token)
        if tok is None:
            return None
        if tok.expires_at and tok.expires_at < int(time.time()):
            with self._lock:
                self._access.pop(token, None)
            return None
        return tok

    # ----- Discovery metadata -----------------------------------------------

    def authorization_server_metadata(self, *, public_base_url: str) -> dict[str, Any]:
        """Return the document served at /.well-known/oauth-authorization-server."""
        base = public_base_url.rstrip("/")
        return {
            "issuer": base,
            "authorization_endpoint": f"{base}/oauth/authorize",
            "token_endpoint": f"{base}/oauth/token",
            "registration_endpoint": f"{base}/oauth/register",
            "revocation_endpoint": f"{base}/oauth/revoke",
            "grant_types_supported": ["authorization_code", "refresh_token"],
            "response_types_supported": ["code"],
            "code_challenge_methods_supported": ["S256"],
            "token_endpoint_auth_methods_supported": [
                "client_secret_basic", "client_secret_post", "none",
            ],
            "scopes_supported": list(self.scopes_supported),
        }

    # ----- Internals --------------------------------------------------------

    def _authenticate_client(
        self, client_id: str, client_secret: str | None,
    ) -> ClientInfo:
        client = self._clients.get(client_id)
        if client is None:
            raise InvalidClient("unknown client_id")
        if client.token_endpoint_auth_method == "none":
            return client  # public client; PKCE is the binding
        if not client.client_secret:
            raise InvalidClient("client has no secret but auth method requires one")
        if client_secret != client.client_secret:
            raise InvalidClient("client_secret mismatch")
        return client

    def _mint_tokens(self, authcode: PolityAuthorizationCode) -> dict[str, Any]:
        client = self._clients.get(authcode.client_id)
        assert client is not None  # checked at exchange entry
        return self._mint_tokens_from_principal(
            client=client,
            scopes=authcode.scopes,
            subject=authcode.subject,
            issuer=authcode.issuer,
            oauth_subject=authcode.oauth_subject,
            email=authcode.email,
        )

    def _mint_tokens_from_principal(
        self,
        *,
        client: ClientInfo,
        scopes: list[str],
        subject: str,
        issuer: str,
        oauth_subject: str,
        email: str | None,
    ) -> dict[str, Any]:
        now = int(time.time())
        access_value = secrets.token_urlsafe(48)
        refresh_value = secrets.token_urlsafe(48)
        access = PolityAccessToken(
            token=access_value,
            client_id=client.client_id,
            scopes=list(scopes),
            expires_at=now + self.access_token_ttl,
            subject=subject,
            issuer=issuer,
            oauth_subject=oauth_subject,
            email=email,
        )
        refresh = PolityRefreshToken(
            token=refresh_value,
            client_id=client.client_id,
            scopes=list(scopes),
            expires_at=now + self.refresh_token_ttl,
            subject=subject,
            issuer=issuer,
            oauth_subject=oauth_subject,
            email=email,
        )
        with self._lock:
            self._access[access_value] = access
            self._refresh[refresh_value] = refresh
            self._refresh_to_access[refresh_value] = access_value

        return {
            "access_token": access_value,
            "token_type": "Bearer",
            "expires_in": self.access_token_ttl,
            "refresh_token": refresh_value,
            "scope": " ".join(scopes),
        }

    def _gc_pending(self) -> None:
        cutoff = time.time() - _DEFAULT_PENDING_TTL
        stale = [k for k, v in self._pending.items() if v.created_at < cutoff]
        for k in stale:
            self._pending.pop(k, None)


# ---------------------------------------------------------------------------
# Helper: build a redirect URI with query params (auth-code or error response).
# ---------------------------------------------------------------------------


def _construct_redirect(
    base_uri: str,
    *,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
) -> str:
    from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl

    parts = urlsplit(base_uri)
    existing = dict(parse_qsl(parts.query, keep_blank_values=True))
    if code:
        existing["code"] = code
    if error:
        existing["error"] = error
    if error_description:
        existing["error_description"] = error_description
    if state is not None:
        existing["state"] = state
    return urlunsplit((
        parts.scheme, parts.netloc, parts.path,
        urlencode(existing), parts.fragment,
    ))
