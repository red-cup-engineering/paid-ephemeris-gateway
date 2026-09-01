"""Adapt :class:`PolityOAuthServer` to the MCP SDK's authorization Protocol.

The MCP SDK 1.26 expects an ``OAuthAuthorizationServerProvider`` (FastMCP's
``auth_server_provider=`` kwarg) and a ``TokenVerifier`` (FastMCP's
``token_verifier=`` kwarg). Both are Protocols; this module supplies the
adapters that wrap our framework-agnostic :class:`PolityOAuthServer`.

The adapters delegate every decision back to the shared server — clients,
codes, tokens, principals, revocation — so an authentication that succeeds
for the web service succeeds for the MCP service in exactly the same way,
and a revocation kills the token everywhere.

This module is imported lazily — the MCP SDK is only required when the
MCP service runs, not for the web service or the AS itself.
"""
from __future__ import annotations

import time
from typing import Optional

from pyfars.programs.identity.oauth_server import (
    AccessDenied,
    InvalidClient,
    InvalidGrant,
    InvalidRequest,
    OAuthError,
    PolityOAuthServer,
)


def build_mcp_provider(server: PolityOAuthServer):
    """Return an ``OAuthAuthorizationServerProvider`` wrapping ``server``."""
    from mcp.server.auth.provider import (
        AccessToken as SDKAccessToken,
        AuthorizationCode as SDKAuthorizationCode,
        AuthorizationParams,
        AuthorizeError,
        OAuthAuthorizationServerProvider,
        RefreshToken as SDKRefreshToken,
    )
    from mcp.shared.auth import OAuthClientInformationFull, OAuthToken
    from pydantic import AnyUrl

    class _ProviderAdapter(OAuthAuthorizationServerProvider):
        # ----- DCR ----------------------------------------------------------
        async def get_client(
            self, client_id: str,
        ) -> Optional[OAuthClientInformationFull]:
            client = server.get_client(client_id)
            if client is None:
                return None
            return OAuthClientInformationFull.model_validate(client.to_dict())

        async def register_client(
            self, client_info: OAuthClientInformationFull,
        ) -> None:
            metadata = client_info.model_dump(mode="json", exclude_none=True)
            metadata.pop("client_id", None)
            metadata.pop("client_secret", None)
            issued = server.register_client(metadata)
            client_info.client_id = issued.client_id
            client_info.client_secret = issued.client_secret
            client_info.client_id_issued_at = issued.client_id_issued_at

        # ----- /authorize ---------------------------------------------------
        async def authorize(
            self,
            client: OAuthClientInformationFull,
            params: AuthorizationParams,
        ) -> str:
            try:
                return server.start_authorization(
                    client_id=client.client_id or "",
                    redirect_uri=str(params.redirect_uri),
                    redirect_uri_provided_explicitly=params.redirect_uri_provided_explicitly,
                    scopes=list(params.scopes or []),
                    code_challenge=params.code_challenge,
                    code_challenge_method="S256",
                    state=params.state,
                    resource=params.resource,
                )
            except OAuthError as exc:
                raise AuthorizeError(error=exc.code, error_description=exc.description) from exc

        # ----- /token (auth-code grant) ------------------------------------
        async def load_authorization_code(
            self,
            client: OAuthClientInformationFull,
            authorization_code: str,
        ) -> Optional[SDKAuthorizationCode]:
            # The SDK calls this to pre-load the code for handoff to its own
            # PKCE check, then calls exchange_authorization_code below. We
            # implement both for symmetry; the actual PKCE check happens in
            # PolityOAuthServer.exchange_authorization_code.
            with server._lock:
                code = server._codes.get(authorization_code)
            if code is None:
                return None
            if code.client_id != client.client_id:
                return None
            if code.expires_at < int(time.time()):
                return None
            return SDKAuthorizationCode(
                code=code.code,
                scopes=list(code.scopes),
                expires_at=code.expires_at,
                client_id=code.client_id,
                code_challenge=code.code_challenge,
                redirect_uri=AnyUrl(code.redirect_uri),
                redirect_uri_provided_explicitly=code.redirect_uri_provided_explicitly,
            )

        async def exchange_authorization_code(
            self,
            client: OAuthClientInformationFull,
            authorization_code: SDKAuthorizationCode,
        ) -> OAuthToken:
            # The SDK pre-validates PKCE; our server does it again as a
            # belt-and-suspenders. For SDK-driven flow we pass the already-
            # validated verifier through.
            try:
                resp = server.exchange_authorization_code(
                    client_id=client.client_id or "",
                    client_secret=client.client_secret,
                    code=authorization_code.code,
                    code_verifier="",   # SDK already validated
                    redirect_uri=str(authorization_code.redirect_uri),
                )
            except OAuthError as exc:
                # MCP SDK's TokenError shapes the response.
                from mcp.server.auth.errors import TokenError
                raise TokenError(error=exc.code, error_description=exc.description) from exc
            return OAuthToken.model_validate(resp)

        async def load_refresh_token(
            self,
            client: OAuthClientInformationFull,
            refresh_token: str,
        ) -> Optional[SDKRefreshToken]:
            with server._lock:
                rt = server._refresh.get(refresh_token)
            if rt is None or rt.client_id != client.client_id:
                return None
            return SDKRefreshToken(
                token=rt.token,
                client_id=rt.client_id,
                scopes=list(rt.scopes),
                expires_at=rt.expires_at,
            )

        async def exchange_refresh_token(
            self,
            client: OAuthClientInformationFull,
            refresh_token: SDKRefreshToken,
            scopes: list[str],
        ) -> OAuthToken:
            try:
                resp = server.refresh(
                    client_id=client.client_id or "",
                    client_secret=client.client_secret,
                    refresh_token=refresh_token.token,
                )
            except OAuthError as exc:
                from mcp.server.auth.errors import TokenError
                raise TokenError(error=exc.code, error_description=exc.description) from exc
            return OAuthToken.model_validate(resp)

        # ----- Bearer-token validation -------------------------------------
        async def load_access_token(self, token: str) -> Optional[SDKAccessToken]:
            validated = server.validate_access_token(token)
            if validated is None:
                return None
            return SDKAccessToken(
                token=validated.token,
                client_id=validated.client_id,
                scopes=list(validated.scopes),
                expires_at=validated.expires_at,
                resource=validated.resource,
            )

        async def revoke_token(
            self,
            token: SDKAccessToken | SDKRefreshToken,
        ) -> None:
            server.revoke(token=token.token)

    return _ProviderAdapter()


def build_mcp_token_verifier(server: PolityOAuthServer):
    """Return an MCP SDK ``TokenVerifier`` wrapping ``server``.

    Used when the MCP service runs as a *resource server* — the AS lives
    on the web service, the MCP service only validates bearer tokens.
    Both services share the same ``PolityOAuthServer`` instance so a token
    minted by the AS is immediately usable at the MCP tool transport.
    """
    from mcp.server.auth.provider import (
        AccessToken as SDKAccessToken,
        TokenVerifier,
    )

    class _TokenVerifierAdapter(TokenVerifier):
        async def verify_token(self, token: str) -> Optional[SDKAccessToken]:
            validated = server.validate_access_token(token)
            if validated is None:
                return None
            return SDKAccessToken(
                token=validated.token,
                client_id=validated.client_id,
                scopes=list(validated.scopes),
                expires_at=validated.expires_at,
                resource=validated.resource,
            )

    return _TokenVerifierAdapter()
