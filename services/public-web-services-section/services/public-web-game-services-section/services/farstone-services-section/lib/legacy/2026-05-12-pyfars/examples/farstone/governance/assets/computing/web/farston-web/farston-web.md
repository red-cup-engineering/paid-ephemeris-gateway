---
title: "Farston web"
description: "Farston's HTTP surface — homepage, OpenAPI docs, OAuth Authorization Server endpoints, operator UI. Served by the engine's WebService when Farston is running."
kind: website
status: draft
of-polity: farstone
served-by-app: pyfars.web.app:build_app
default-host: "127.0.0.1"
default-port: 8002
service-kind: web
access-policy: mixed
content-source: pyfars-substrate
---


The web surface of the Farston example polity.
When the engine boots, it reads this asset cell and spawns a `WebService` bound to its parameters.

When `PYFARS_GOOGLE_CLIENT_ID`, `PYFARS_GOOGLE_CLIENT_SECRET`, and `PYFARS_OAUTH_PUBLIC_BASE_URL` are present in `<root>/.pyfars/secrets.env`, the web app additionally mounts the polity's OAuth Authorization Server at `/.well-known/oauth-authorization-server`, `/oauth/authorize`, `/oauth/token`, `/oauth/register`, `/oauth/revoke`, and `/oauth/google/callback`.
The same `PolityOAuthServer` instance is shared with the MCP service via the engine's runtime context.

`access-policy: mixed` — public read endpoints; principal-protected endpoints (operator actions, witness writes) gated by bearer tokens issued by the AS.
