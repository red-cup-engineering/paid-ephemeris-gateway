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

Two entrypoints share one route declaration (`src/route-catalog.mjs`):

- `src/worker.mjs` — Cloudflare Workers `{ fetch }` handler
  (`@red-cup-engineering/x402-services-section/fetch`), deployed via
  `wrangler.jsonc`.
- `src/server.mjs` — Express/Cloud Run entry
  (`@red-cup-engineering/x402-services-section/server`), for local
  development and a non-Workers deployment target.

`X402_PAY_TO` is a required secret with no default (same rule as
`paid-ephemeris-gateway`): the boundary refuses to construct itself without
an explicit seller payout address, so a misconfigured deploy fails loudly
(HTTP 500 with the missing-variable name) instead of paying out nowhere.

## Prerequisite: the scorer package is not yet published

`@red-cup-engineering/jsnode-package-vulnerability-triage-services-section`
has not been published to `https://registry.561.group` as of this gateway's
authoring. `package.json` here pins the exact version it expects (`0.1.0`);
until that package is published, `npm install` for this gateway will fail
resolving that one dependency. Local tests in this checkout were run with
that dependency wired via `npm install --no-save <path>` (a local, symlinked
resolution, not a registry fetch and not a persisted `file:` specifier) so
the real scoring code — not a stub — backs the wiring proof. Publishing the
scorer package through the house publish gate is the one remaining step
before a real `npm install` of this gateway resolves cleanly.

## Go live

1. Publish `@red-cup-engineering/jsnode-package-vulnerability-triage-services-section`
   through the publish gate (diff against tarball, fresh-install tests,
   additive-only), so this gateway's pinned dependency resolves for real.
2. `npm install` in this directory against the resolved pins.
3. `wrangler secret put X402_PAY_TO` (the seller EVM payout address) and,
   if a CDP-hosted facilitator is wanted instead of the public one, also
   `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET`.
4. `wrangler deploy` (requires a Cloudflare API token with Workers edit
   permission and, for the `orphan-patch.561.group` custom domain, DNS
   already on that Cloudflare zone).
