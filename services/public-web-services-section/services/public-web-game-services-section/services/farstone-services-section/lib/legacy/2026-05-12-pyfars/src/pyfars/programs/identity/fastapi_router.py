"""Mount the polity OAuth Authorization Server's endpoints on a FastAPI app.

Routes mounted (per RFC 7591 / RFC 8414 + the federation callback):

- ``GET  /.well-known/oauth-authorization-server`` — discovery metadata
- ``POST /oauth/register``                         — DCR (RFC 7591)
- ``GET  /oauth/authorize``                        — start auth flow → 302 Google
- ``GET  /oauth/google/callback``                  — return from Google → 302 client
- ``POST /oauth/token``                            — code/refresh exchange
- ``POST /oauth/revoke``                           — revoke token

Plus a request-scoped dependency :func:`require_principal` that other
routers (operator UI, control-plane endpoints) use to assert that a request
carries a valid bearer token bound to a substrate user-account principal.
"""
from __future__ import annotations

from typing import Any

from pyfars.programs.identity.oauth_server import (
    AccessDenied,
    InvalidClient,
    InvalidGrant,
    InvalidRequest,
    OAuthError,
    PolityOAuthServer,
)
from pyfars.programs.identity.tokens import PolityAccessToken


def install_oauth_routes(
    app: Any,
    *,
    server: PolityOAuthServer,
    public_base_url: str,
) -> None:
    """Mount the AS endpoints on ``app`` (a FastAPI instance).

    Idempotent for the route paths it owns; calling twice will register
    duplicate routes (FastAPI doesn't dedupe). Don't.
    """
    from fastapi import HTTPException, Request
    from fastapi.responses import JSONResponse, RedirectResponse

    def _error_response(exc: OAuthError) -> JSONResponse:
        body = {"error": exc.code}
        if exc.description:
            body["error_description"] = exc.description
        status = 401 if exc.code == "invalid_client" else 400
        return JSONResponse(body, status_code=status)

    @app.get(
        "/.well-known/oauth-authorization-server",
        tags=["auth"],
        include_in_schema=True,
    )
    async def authorization_server_metadata() -> dict[str, Any]:
        return server.authorization_server_metadata(public_base_url=public_base_url)

    @app.post("/oauth/register", tags=["auth"])
    async def register(request: Request) -> JSONResponse:
        try:
            body = await request.json()
        except Exception:
            return JSONResponse({"error": "invalid_request"}, status_code=400)
        try:
            client = server.register_client(body)
        except OAuthError as exc:
            return _error_response(exc)
        return JSONResponse(client.to_dict(), status_code=201)

    @app.get("/oauth/authorize", tags=["auth"])
    async def authorize(
        request: Request,
        client_id: str,
        redirect_uri: str,
        response_type: str = "code",
        scope: str | None = None,
        state: str | None = None,
        code_challenge: str | None = None,
        code_challenge_method: str = "S256",
        resource: str | None = None,
    ):
        if response_type != "code":
            raise HTTPException(400, f"unsupported response_type: {response_type}")
        if not code_challenge:
            raise HTTPException(400, "code_challenge is required (PKCE)")
        if code_challenge_method != "S256":
            raise HTTPException(400, "only S256 PKCE is supported")
        scopes = scope.split() if scope else []
        try:
            google_url = server.start_authorization(
                client_id=client_id,
                redirect_uri=redirect_uri,
                redirect_uri_provided_explicitly=True,
                scopes=scopes,
                code_challenge=code_challenge,
                code_challenge_method=code_challenge_method,
                state=state,
                resource=resource,
            )
        except OAuthError as exc:
            return _error_response(exc)
        return RedirectResponse(google_url, status_code=302)

    @app.get("/oauth/google/callback", tags=["auth"])
    async def google_callback(
        state: str | None = None,
        code: str | None = None,
        error: str | None = None,
        error_description: str | None = None,
    ):
        if error:
            return JSONResponse(
                {"error": error, "error_description": error_description or ""},
                status_code=400,
            )
        if not state or not code:
            return JSONResponse({"error": "invalid_request"}, status_code=400)
        try:
            redirect_url = server.complete_authorization(
                google_state=state, google_code=code,
            )
        except OAuthError as exc:
            return _error_response(exc)
        return RedirectResponse(redirect_url, status_code=302)

    @app.post("/oauth/token", tags=["auth"])
    async def token(request: Request) -> JSONResponse:
        form = await request.form()
        # Client auth: prefer Basic (RFC 6749 §2.3.1), fall back to body.
        client_id, client_secret = _extract_client_credentials(request, form)
        grant_type = form.get("grant_type")
        try:
            if grant_type == "authorization_code":
                code = form.get("code")
                code_verifier = form.get("code_verifier")
                redirect_uri = form.get("redirect_uri")
                if not code or not code_verifier or not redirect_uri:
                    raise InvalidRequest("missing required parameters")
                resp = server.exchange_authorization_code(
                    client_id=client_id,
                    client_secret=client_secret,
                    code=code,
                    code_verifier=code_verifier,
                    redirect_uri=redirect_uri,
                )
            elif grant_type == "refresh_token":
                refresh = form.get("refresh_token")
                if not refresh:
                    raise InvalidRequest("missing refresh_token")
                resp = server.refresh(
                    client_id=client_id,
                    client_secret=client_secret,
                    refresh_token=refresh,
                )
            else:
                raise InvalidRequest(f"unsupported grant_type: {grant_type}")
        except OAuthError as exc:
            return _error_response(exc)
        return JSONResponse(resp)

    @app.post("/oauth/revoke", tags=["auth"])
    async def revoke(request: Request) -> JSONResponse:
        form = await request.form()
        token = form.get("token")
        if not token:
            return JSONResponse({"error": "invalid_request"}, status_code=400)
        token_type_hint = form.get("token_type_hint")
        server.revoke(token=token, token_type_hint=token_type_hint)
        # RFC 7009 §2.2: always 200, even for unknown tokens.
        return JSONResponse({"revoked": True})


def _extract_client_credentials(
    request: Any, form: Any,
) -> tuple[str, str | None]:
    """Read client credentials from Basic auth header or form body."""
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("basic "):
        import base64 as _b64
        try:
            decoded = _b64.b64decode(auth.split(" ", 1)[1]).decode("utf-8")
            cid, _, csec = decoded.partition(":")
            if cid:
                return cid, csec or None
        except Exception:
            pass
    cid = form.get("client_id")
    if not cid:
        raise InvalidClient("client_id is required")
    csec = form.get("client_secret")
    return str(cid), str(csec) if csec else None


def make_require_principal(server: PolityOAuthServer):
    """Build a FastAPI dependency that 401s without a valid bearer token,
    or returns the :class:`PolityAccessToken` on success.

    Use as ``token: PolityAccessToken = Depends(require_principal)`` on
    operator-protected routes.
    """
    from fastapi import Header, HTTPException

    async def require_principal(
        authorization: str | None = Header(default=None),
    ) -> PolityAccessToken:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(
                401, "missing bearer token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = authorization.split(" ", 1)[1].strip()
        validated = server.validate_access_token(token)
        if validated is None:
            raise HTTPException(
                401, "invalid or expired bearer token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return validated

    return require_principal
