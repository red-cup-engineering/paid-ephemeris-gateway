# paid-orphan-patch-triage-gateway

x402 seller wrapping
`@red-cup-engineering/jsnode-package-vulnerability-triage-services-section`'s
deterministic orphan-patch scorer behind a priced HTTP route, mirroring the
transport and payment-boundary shape of `paid-ephemeris-gateway`.

One product: `POST /v1/orphan-patch/score` — send an `OrphanPatchHarvestInput`
JSON body (`advisories`, `maintenance`, `dependents`), pay the x402 exact-EVM
challenge, receive the ranked `OrphanPatchHarvestOutput` candidate list.
Priced at $0.02, inside the $0.01-$0.05 near-zero-marginal-cost band: the
computation is pure and sub-millisecond, but the ranking is a real,
non-trivial infosec judgment (unpatched-severity + maintainer-silence +
dependent-impact) a buyer would otherwise have to reconstruct by hand from
three separate public feeds.

Two entrypoints share one Fetch-native application (`src/application.mjs`'s
`createGatewayApplication`, built on
`@red-cup-engineering/http-server-core-service/fetch`'s `createFetchHandler`
for dispatch and `@red-cup-engineering/x402-services-section/fetch`'s
`createExactEvmFetchPaymentBoundary` for payment) and one route declaration
(`src/route-catalog.mjs`):

- `src/worker.mjs` — Cloudflare Workers `{ fetch }` handler, deployed via
  `wrangler.jsonc`.
- `src/server.mjs` — Node HTTP entry
  (`@red-cup-engineering/http-server-core-service/server`'s `start`), for
  local development and a non-Workers deployment target (e.g. Cloud Run).

`X402_PAY_TO` is a required secret with no default (same rule as
`paid-ephemeris-gateway`): the boundary refuses to construct itself without
an explicit seller payout address, so a misconfigured deploy fails loudly
(HTTP 500 with the missing-variable name) instead of paying out nowhere.

`src/read-json-body.mjs` is a small local Fetch-`Request` JSON body reader
(content-type/size/parse-failure refusal, matching `test/http-application.test.mjs`).
It exists because the pinned `@red-cup-engineering/read-http-request-body-service`
publishes only a Node `http.IncomingMessage` reader — no `/web` (or any other
Fetch-`Request`) export exists on the registry — so this
gateway (Fetch-native end to end) cannot consume it directly. This is a real
gap in that shared package, not a design choice of this gateway; the local
file is a debt to retire if/when a Fetch-native export is published there.

## Base-mainnet settlement

`@red-cup-engineering/jsnode-package-vulnerability-triage-services-section`
is published on `https://registry.561.group`, and this gateway's
`package.json` pins an exact version; a plain `npm install` resolves it
(and every other `@red-cup-engineering`/`@lenticule-science` dependency) from
the house registry with no local/symlinked workaround.

This worker deploys to both the `orphan-patch.561.group` custom
domain and the `paid-orphan-patch-triage-gateway.morgan-sennhauser.workers.dev`
`workers.dev` host, on Base mainnet (`eip155:8453`), settling through
`https://facilitator.payai.network` to `X402_PAY_TO` (a `wrangler secret put`
value; see the `x402.payto-decision` record in
`x402-services-section/data/logs/2026/09/01/`). Whether either host is
actually answering, and what a probe of `/v1/status` or
`/v1/orphan-patch/score` returns, is checked live with `wrangler`/`curl`
against those hosts, per the `whats-live` skill, never asserted here.

## Redeploy

1. `npm install` (resolves cleanly against the published pins).
2. `npm test` (`node --test`).
3. `wrangler secret put X402_PAY_TO` if the secret is ever missing
   (`wrangler secret list` shows whether it is set) and, if a CDP-hosted
   facilitator is wanted instead of the public one, also `CDP_API_KEY_ID` /
   `CDP_API_KEY_SECRET`.
4. `wrangler deploy` — binds both `orphan-patch.561.group` (Custom Domain,
   already on this account's Cloudflare zone) and the `workers.dev` host
   (`workers_dev: true` in `wrangler.jsonc`).
