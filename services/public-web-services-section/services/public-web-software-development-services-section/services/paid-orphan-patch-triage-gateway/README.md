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
It exists because the pinned `@red-cup-engineering/read-http-request-body-service@0.1.1`
publishes only a Node `http.IncomingMessage` reader — no `/web` (or any other
Fetch-`Request`) export exists on the registry as of 2026-09-08 — so this
gateway (Fetch-native end to end) cannot consume it directly. This is a real
gap in that shared package, not a design choice of this gateway; the local
file is a debt to retire if/when a Fetch-native export is published there.

## Live: Base-mainnet settlement

`@red-cup-engineering/jsnode-package-vulnerability-triage-services-section`
is published at `0.1.0` on `https://registry.561.group`, and this gateway's
`package.json` pins that exact version; a plain `npm install` resolves it
(and every other `@red-cup-engineering`/`@lenticule-science` dependency) from
the house registry with no local/symlinked workaround.

This worker is deployed live at both the `orphan-patch.561.group` custom
domain and `paid-orphan-patch-triage-gateway.morgan-sennhauser.workers.dev`,
on Base mainnet (`eip155:8453`), settling through
`https://facilitator.payai.network` to `X402_PAY_TO` (a `wrangler secret put`
value; see the `x402.payto-decision` record in
`x402-services-section/data/logs/2026/09/01/`). Verified live 2026-09-08: on
both hosts, `GET /v1/status` answers `200` and `POST /v1/orphan-patch/score`
with a valid `OrphanPatchHarvestInput` body answers `HTTP 402` with a decoded
`payment-required` payload whose `accepts[0].payTo` is
`0x32886f6f361c1d570255c2762967a2e41d0e9b1a`, `network` is `eip155:8453`, and
`amount` is `20000` (USDC, 6 decimals — the declared $0.02 price).

## Redeploy

1. `npm install` (resolves cleanly against the published pins).
2. `npm test` (`node --test`).
3. `wrangler secret put X402_PAY_TO` if the secret is ever missing
   (`wrangler secret list` shows it today) and, if a CDP-hosted facilitator
   is wanted instead of the public one, also `CDP_API_KEY_ID` /
   `CDP_API_KEY_SECRET`.
4. `wrangler deploy` — binds both `orphan-patch.561.group` (Custom Domain,
   already on this account's Cloudflare zone) and the `workers.dev` host
   (`workers_dev: true` in `wrangler.jsonc`).
