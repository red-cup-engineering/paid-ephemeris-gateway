---
title: "PyFARS website"
description: "The pyfars-as-polity instance's web surface — homepage, OpenAPI docs, browser-UI over the substrate. Served by the engine's WebService when the polity is running."
kind: website
status: draft
of-polity: pyfars
served-by-app: pyfars.web.app:build_app
default-host: "127.0.0.1"
default-port: 8000
access-policy: public
content-source: pyfars-substrate
---


The web surface of the pyfars-as-polity instance.
When the engine boots, it reads this asset cell and spawns a [`WebService`](../../../../../../../src/pyfars/runtime/services.py) bound to the asset's parameters.
Without this cell, no web service runs.

The website is the *asset* — the substrate-recordable thing the polity holds (its public face, its routes, its access policy).
The web service is the *mechanism* that materializes the asset into a running daemon.
Replacing the runtime, redeploying onto a different host, or running multiple instances does not change the asset; only the deployment-of-the-asset varies.

## Frontmatter

| Key | Meaning |
|---|---|
| `kind: website` | discriminator; the engine picks up cells matching this kind under `governance/assets/computing/web/` |
| `served-by-app` | dotted path to the FastAPI app builder (`module:callable`); the engine imports and calls it |
| `default-host`, `default-port` | binding defaults; CLI flags override |
| `access-policy` | `public` (no auth) or `authenticated` (OAuth / principal-required); future routing decisions read this |
| `content-source` | what the served pages are projecting from; `pyfars-substrate` means the polity's substrate at boot |

## What gets served

The default `pyfars.web.app:build_app(root=<polity-root>)` exposes:

- `/` — the polity's index / status page
- `/docs` — OpenAPI / Swagger documentation
- `/redoc` — ReDoc rendering
- API routes for substrate reads (corpus list, show, search, context, stats)

Routes the polity wants to expose specifically (e.g. `/polity` for a derived homepage view) live in `pyfars.web.app` and are not asset-cell-controlled today; future work may move route declarations into substrate cells.

## What this cell does *not* yet specify

- Per-route auth (the `access-policy` is whole-asset for now)
- Multiple deployments (one cell, one running service); future work for federated or multi-host polities
- TLS / ingress config (this cell describes the binding the engine listens on; reverse-proxy / TLS sit between this binding and the public surface)
