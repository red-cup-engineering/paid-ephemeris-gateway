# Alpaca Assist Services Section

The app seat of Alpaca Assist at `https://alpaca-assist.561.group`,
Tidepool's (a division of Causeway Services) decision-support assistant
for a retail investor who holds an Alpaca brokerage account, beneath
[public-web-finance-services-section](../../README.md). Founded 2026-09-05
from the program carrier,
[561 Group Investment Services Section](../../../../../../../../../561-group-services-section/services/561-group-operations-services-section/services/561-group-economic-operations-services-section/services/561-group-business-operations-services-section/services/561-group-finance-operations-services-section/services/561-group-investment-services-section/README.md),
one of the assist series beside EVE Assist (live) and Gig Assist
(planned).

## Not built as of 2026-09-05

`alpaca-assist.561.group` has no DNS record (checked 2026-09-05). This
section exists so the app has a seat and so its deploy shape is named
before the app is built.

## The deploy shape it takes

EVE Assist's shape, the live precedent
(`eve-online-services-section/sites/eve-assist.561.group`): a Cloudflare
Worker whose `wrangler.jsonc` binds `public/` as static assets with
`run_worker_first` for `/auth/*`, `/api/*`, and `/mcp`, a custom-domain
route, and a D1 database; `src/index.mjs` is a one-line re-export of the
engine's Worker handler. What differs from EVE Assist:

- **The engine is upstream.** The Worker composes
  `@red-cup-engineering/personal-intelligence-systems-services-section`
  (session cookies, sealing, provider adapters, the analyst loop, the SSE
  codec, the remote MCP server, the tool registry) with the Alpaca tool
  set from `alpaca-engineering-services-section`, by exact pins. No engine
  code is copied here.
- **Login is an EVM wallet.** Sign-In with Ethereum (EIP-4361) verified by
  `verify-evm-signed-message-service`; the session principal is
  `{kind: "evm", address}`. The founder's and the org's wallets, as rows
  in the key-management wallet registry, are house compute and are not
  metered; every other account's compute is quoted and settled through
  `metered-compute-payment-service` under a wallet grant the user sets.
- **Brokerage authority is the user's.** The user connects their own
  Alpaca account through Alpaca's OAuth for third-party apps; the grant is
  sealed at rest and revocable from the settings page; the app never holds
  a key it can use outside the grant.
- **Every number carries its witness.** Positions and fills are shown with
  the venue statement they reconcile against and the reconciliation
  reading (agreed, mismatch, posted-only, asserted-only), the bookkeeper's
  law applied per user.

Deploys run by hand (`npm run deploy`, which syncs `public/` from the
engine and runs `wrangler deploy`) until this app has a CI, the same
operations pattern EVE Assist and the pacing app use.
