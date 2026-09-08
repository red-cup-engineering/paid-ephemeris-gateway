# paid-ephemeris-gateway

An x402-gated seller for calculations of the same exact moment. The
Ephemeris Tracking Team owns the products; this gateway owns HTTP admission,
Coinbase Bazaar discovery, payment enforcement, and the settled boundary
witness. The gateway ships two transports from one shared application
(`src/application.mjs`): a Fetch/Cloudflare-Workers entry (`src/worker.mjs`)
and an Express/Node entry (`src/server.mjs`, `src/deployment.mjs`). They do
not serve the same route set — Precision Moment needs a subprocess and a
local DE440 binary, which a Workers isolate cannot provide, so
`application.mjs` drops that route whenever `dependencies.computePrecision`
is absent.

| Route | Price | Product | Served by |
|---|---:|---|---|
| `GET /v1/ephemeris/moment/:date` | USD 0.04 | Audited deterministic positions for ten bodies, motion, lunar phase, major aspects, and provenance. | Both transports. Served at `https://ephemeris.561.group` (Workers). |
| `GET /v1/astronomy/positions/:date` | USD 0.04 | The same instant's apparent ecliptic longitude/latitude/speed for ten bodies, lunar phase and illuminated fraction, provenance, and accuracy — no signs, no aspects, no astrological interpretation. | Both transports. Served at `https://ephemeris.561.group` (Workers). |
| `GET /v1/ephemeris/precision-moment/:date` | USD 0.32 | The same instant recomputed from pinned JPL DE440 through OxiEphemeris, with observer location, houses, angles, nodes, lots, sect, dignities, expanded aspects, and cross-engine divergence. | Node entry only — **not** served at `https://ephemeris.561.group` (that hostname is the Workers deployment, which drops this route whenever `dependencies.computePrecision` is absent). The Node entry's Cloud Run path is unusable because GCP project `five-six-one-group-dev` has billing permanently disabled by standing house decision, never to be re-enabled. Which transport, if any, is reachable for this route is checked with `gcloud`/`wrangler`/`curl` per the `whats-live` skill, never asserted here. |
| `GET /v1/x402-market/observation` | USD 0.10 | Sampled Base-USDC EIP-3009 `AuthorizationUsed` activity over a recent block range, with provider provenance. | Both transports. Served at `https://ephemeris.561.group`. |

Every response marks astronomical measurements separately from
tradition-dependent astrological interpretations. Payment is evidence that a
priced boundary crossing settled; it is never evidence that an interpretation
is scientific fact.

## Admission

The date is an ISO-8601 UTC instant. A date without a time means midnight UTC.
Moment Essentials admits 1800–2050. Precision Moment admits
1972–2050 UTC because the pinned supplier's leap-second table refuses earlier
UTC instants.

Precision Moment also requires `latitude` and `longitude` query parameters.
Optional parameters are:

- `houseSystem`: `placidus`, `koch`, `whole-sign`, `equal`, `porphyry`,
  `regiomontanus`, or `campanus`;
- `rulership`: `traditional` or `modern`;
- `sidereal`: `fagan-bradley`, `lahiri`, `krishnamurti`, or `raman`.

Invalid dates, locations, and configurations receive HTTP 422 before the
payment middleware. Placidus and Koch are refused at absolute latitudes of 66°
or more.

## Discovery (Bazaar metadata, 402index.io)

Every route this gateway declares — on either transport — carries Bazaar
discovery metadata (`declareDiscoveryExtension` in `route-catalog.mjs` /
`market-observation-route.mjs`). That metadata rides inside every 402
challenge regardless of facilitator; Coinbase's own Bazaar catalog only
ingests it automatically for settlements that clear through the CDP
facilitator. The gateway runs on Base mainnet through
`facilitator.payai.network` (a free, keyless, Base-mainnet-capable facilitator
selected after CDP credentials proved unreachable — see
`cdp-facilitator.mjs` for the still-supported CDP path if
`CDP_API_KEY_ID`/`CDP_API_KEY_SECRET` become available), so it
does not get the automatic CDP-Bazaar listing and needs the explicit
`/api/v1/register` submission to [402index.io](https://402index.io/) that its
sibling `base-chain-data-gateway` already carries in its own
`402index-listing.json`.

The production hostname `ephemeris.561.group` is the Workers deployment (a
Cloudflare Custom Domain route in `wrangler.jsonc`, not a CNAME onto Cloud
Run); it only ever discovers the two routes that transport serves. Precision
Moment's discovery metadata rides only on the Node entry's own challenges,
wherever that entry is reachable (see the route table above for how that
transport's reachability is derived).

Production configuration (`wrangler.jsonc` vars plus the `X402_PAY_TO`
secret, set via `wrangler secret put`):

```text
X402_NETWORK=eip155:8453
X402_FACILITATOR=https://facilitator.payai.network
X402_PAY_TO=<set via `wrangler secret put`, never a source constant>
```

Do not put credentials or the production payout identity in source. The
source law names the provider actor; deployment configuration binds that actor
to the production account — `X402_PAY_TO` carries the single ruled house
payout identity, supplied only through `wrangler secret put`. The CDP path
(`X402_FACILITATOR_PROVIDER=cdp`,
`X402_FACILITATOR=https://api.cdp.coinbase.com/platform/v2/x402`,
`CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`) remains fully wired in
`cdp-facilitator.mjs` and is worth re-selecting if CDP credentials become
reachable, since it is the one path that feeds Coinbase's own Bazaar catalog
automatically.

For Base Sepolia proving, use:

```text
X402_NETWORK=eip155:84532
X402_FACILITATOR=https://x402.org/facilitator
X402_PAY_TO=0xYourTestPayoutAddress
```

## Precision runtime

Set `OXIEPH_BIN` to the pinned `oxieph` 0.1.1 executable and `OXIEPH_DE` to the
official DE440 classic binary whose SHA-256 is
`29915576d0a6555766b99485ac3056ee415e86df4fce282611c31afb329ad062`.
The product refuses to pretend that numerical precision is universal accuracy;
it preserves the supplier values and reports measured divergence from the
independent Essentials engine.

## Durable settlement witness

`npm run start:deployment` starts the separately contracted witness-journal document
provider and points the gateway to its local HTTP boundary. Its immutable document
custody and category index live below `WITNESS_JOURNAL_ROOT`, or below
`PAID_EPHEMERIS_DATA_ROOT/witness-journal` when that variable is omitted. Every
settled crossing becomes a content-addressed document plus indexed assertions.
Startup refuses an absent durable data root, and delivery refuses a failed write.

## Development

```bash
npm install
npm test
```

Dependencies cross settlement membranes only through the exact package contracts in
`package.json`. The implementation is kept open-source-ready: reproducible inputs,
declared third-party licenses, runtime-only identities, and no bundled secrets.

## Ownership

- Product: Lenticule Science / Divination / Ephemeris Tracking Team
- Paid HTTP boundary: RSC Quiescent / paid-ephemeris-gateway
- x402 protocol: Red Cup Engineering / x402 Services Section
- settlement witness: Lenticule Science / witness-journal RDF Services
