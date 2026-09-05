// auth — the OAuth gate the rest of the 561 surfaces use to confine themselves
// to the operator's own access.
//
// This is not a new auth scheme. It is the ecosystem's existing Google-IdP
// authorization server (`@emsenn/organizing-with-the-web/oauth-google`), confined
// to a single allowed email (the operator), wired here exactly as the other
// sites wire it: the `/oauth/*` endpoints (dynamic client registration, the
// Google redirect, callback, token exchange/refresh, revoke), the RFC 8414 /
// RFC 9728 well-known metadata, and a bearer guard backed by the server's own
// `validateToken`.
//
// `guard(app)` wraps every resource handler of a protected App so it answers
// only to a bearer token this server issued to the allowed email; everything
// else gets a 401 with the RFC 9728 `resource_metadata` challenge so a client
// (or the WebUX) knows where to authorize. Reads/writes stay in the thin
// transport layer — the guard adds no chain or domain logic.

import process from "node:process";

import {
  OAuthServer,
  oauthApp,
  oauthConfigFromEnv,
  authorizationServerMetadata,
  protectedResourceMetadata,
} from "@emsenn/organizing-with-the-web/oauth-google";
import { authorizeBearer } from "@emsenn/organizing-with-the-web/sync-guard";
import { jsonRepr, type App, type Context, type Handler, type Repr } from "@emsenn/http-server";

/** The operator this platform answers to. Overridable for a different deployer,
 *  but the single-allowed-email confinement is the whole point. */
const DEFAULT_ALLOWED_EMAIL = "morgan.sennhauser@gmail.com";

export interface AagaardAuth {
  readonly oauth: OAuthServer;
  readonly allowedEmail: string;
  readonly publicBaseUrl: string;
  /** The OAuth authorization-server endpoints + well-known metadata (UNGATED). */
  readonly app: App;
  /** Wrap a protected App so every handler requires a bearer token this server
   *  issued to the allowed email. */
  guard(app: App): App;
}

/** Build the auth surface for one deployment. State (clients, tokens) persists
 *  under `${stateDir}/oauth`. Credentials come from the environment
 *  (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`); the allowed email from
 *  `AAGAARD_ALLOWED_EMAIL` (default: the operator). */
export function loadAuth(parts: {
  publicBaseUrl: string;
  stateDir: string;
  env?: Record<string, string | undefined>;
}): AagaardAuth {
  const env = parts.env ?? process.env;
  const allowedEmail = env["AAGAARD_ALLOWED_EMAIL"] ?? DEFAULT_ALLOWED_EMAIL;
  const publicBaseUrl = parts.publicBaseUrl.replace(/\/$/, "");
  const oauth = new OAuthServer(
    oauthConfigFromEnv({ publicBaseUrl, allowedEmail, stateDir: parts.stateDir, env }),
  );

  // The bearer policy IS the OAuthServer: a token is admissible iff the server
  // issued it AND it was minted for the allowed email. authorizeBearer turns
  // that predicate into the 401/403 decision.
  const policy = (token: string): string | undefined => {
    const claims = oauth.validateToken(token);
    return claims && claims.email === allowedEmail ? claims.email : undefined;
  };

  const challenge = `Bearer realm="aagaard", resource_metadata="${publicBaseUrl}/.well-known/oauth-protected-resource"`;

  const guardHandler = (inner: Handler): Handler => async (ctx: Context) => {
    const decision = authorizeBearer(ctx.req.headers, policy);
    if (!decision.ok) {
      const repr = jsonRepr(
        { error: decision.status === 401 ? "unauthorized" : "forbidden", reason: decision.reason ?? "bearer token required", authorize: `${publicBaseUrl}/ui` },
        decision.status,
      );
      return { ...repr, headers: { ...(repr.headers ?? {}), "www-authenticate": challenge } } satisfies Repr;
    }
    return inner(ctx);
  };

  const guard = (app: App): App => ({
    ...app,
    resources: (app.resources ?? []).map((r) => ({ ...r, handler: guardHandler(r.handler) })),
  });

  // The UNGATED auth surface: the /oauth/* endpoints plus the two well-known
  // metadata documents a client probes to discover where to authorize.
  const endpoints = oauthApp(oauth);
  const wellKnown: App = {
    resources: [
      {
        match: "/.well-known/oauth-authorization-server",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr(authorizationServerMetadata(oauth)),
      },
      {
        match: "/.well-known/oauth-protected-resource",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr(protectedResourceMetadata(`${publicBaseUrl}/ops`, publicBaseUrl)),
      },
    ],
  };

  const app: App = {
    resources: [...(endpoints.resources ?? []), ...(wellKnown.resources ?? [])],
  };

  return { oauth, allowedEmail, publicBaseUrl, app, guard };
}
