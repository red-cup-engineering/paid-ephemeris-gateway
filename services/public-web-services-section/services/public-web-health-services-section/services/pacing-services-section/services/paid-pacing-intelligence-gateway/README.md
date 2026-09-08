# paid-pacing-intelligence-gateway

An x402-gated seller for infection-associated chronic illness (ME/CFS,
long COVID, and related post-exertional malaise conditions) pacing
intelligence. Personal Health Computer Systems Engineering owns the pacing
math; this gateway owns HTTP admission, Coinbase Bazaar discovery, payment
enforcement, and the settled boundary witness — the same split
`paid-ephemeris-gateway` uses.

| Route | Price | Product |
|---|---:|---|
| `POST /v1/pacing/analysis` | USD 0.05 | The full `analyzePacing` report over caller-submitted biometric observations: rolling baselines, morning deviation, resting-heart-rate threshold estimate, and conservative PEM risk flags, each with citations and epistemic labels. |
| `POST /v1/pacing/heart-rate-threshold` | USD 0.01 | The Workwell Foundation resting-heart-rate+15bpm pacing-ceiling heuristic alone, labeled an unvalidated clinical rule of thumb. |
| `GET /v1/status` | free | Liveness check. |

## Privacy stance: stateless, no storage

**This API analyzes what the caller submits and stores nothing.** The
submitted biometric observations and the computed analysis exist only for
the duration of the request; neither is written to disk, logged, or
retained anywhere by this gateway. State custody for a caller's pacing
history stays entirely with the caller. The only thing this gateway
persists is the x402 settlement itself — network, transaction hash, payer
address, amount, and price tier — never the biometric payload or the
analysis result. See "Durable settlement witness" below.

Every output carries the same never-diagnostic epistemic labels the
compute layer attaches: no response from either route diagnoses, predicts,
or confirms post-exertional malaise, and the heart-rate-threshold route's
formula is explicitly labeled an informal clinical heuristic, never a
validated instrument.

## Admission

`POST /v1/pacing/analysis` expects a JSON body `{ observations, windowDays?,
metricIds? }`. `observations` must be a nonempty array of
`biometric-observation-v1`-shaped records (owned by
`health-services-section`, the general health-science biometric
observation schema; the nutrition-domain profile
`nutrition-biometric-observation-v1` is accepted too, same fields): each
needs a nonempty `metric`, a `measuredAt` or `enteredAt` ISO timestamp, and
— unless `missingness.status` is `"missing"` — a `measurement.value`.

`POST /v1/pacing/heart-rate-threshold` expects `{ restingHr }`, a finite
positive number of beats per minute.

Malformed bodies for either route receive HTTP 422 before the payment
middleware runs.

## Coinbase Bazaar

Both routes declare Bazaar discovery metadata (`bodyType: "json"`, since
both are POST-with-body products, unlike the ephemeris gateway's GET/path
products). That metadata rides inside every 402 challenge regardless of
facilitator.

Production settles through `facilitator.payai.network`, not the CDP
facilitator (see `wrangler.jsonc`'s `X402_FACILITATOR` var — the same
non-CDP facilitator `paid-ephemeris-gateway` runs on). Coinbase's own Bazaar
catalog only ingests a listing automatically for settlements that clear
through the CDP facilitator, so that automatic-catalog claim does not hold
for this gateway's production configuration; discovery here is through
[402index.io](https://402index.io/) and the challenge's own Bazaar extension,
the same as `paid-ephemeris-gateway`. Production configuration is:

```text
X402_NETWORK=eip155:8453
X402_FACILITATOR=https://facilitator.payai.network
X402_PAY_TO=<set via `wrangler secret put`, never a source constant>
```

`X402_PAY_TO` carries the single ruled house payout identity (record:
`x402.payto-decision`, 2026-08-31, in
`x402-services-section/data/logs/2026/09/01/semantic-record-content.jsonl`);
it is never invented per-gateway and is never a source constant or a literal
in this document — it is supplied only through `wrangler secret put`. The
CDP path (`X402_FACILITATOR_PROVIDER=cdp`,
`X402_FACILITATOR=https://api.cdp.coinbase.com/platform/v2/x402`,
`CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`) remains available in
`cdp-facilitator.mjs` and is the one path that would feed Coinbase's own
Bazaar catalog automatically, if CDP credentials become reachable.

For Base Sepolia proving, omit the CDP variables and use:

```text
X402_NETWORK=eip155:84532
X402_FACILITATOR=https://x402.org/facilitator
X402_PAY_TO=0xYourTestPayoutAddress
```

## Workers-compatible on every route

Unlike `paid-ephemeris-gateway` (whose Precision Moment tier needs a
subprocess and a local DE440 binary, so it cannot run in a Cloudflare
Workers isolate), this gateway's compute —
`@red-cup-engineering/pacing-intelligence-services-section` — is pure JS
with no filesystem, network, clock, or subprocess dependency. Both priced
routes ship identically on the Express/Cloud Run transport (`src/server.mjs`)
and the Fetch/Workers transport (`src/worker.mjs`); neither excludes a tier
the other serves.

## Durable settlement witness

Wire `WITNESS_JOURNAL_DOCUMENT_AGENT` (or `WITNESS_JOURNAL_RDF_AGENT`) to
a hired witness-journal document provider's Agent Card and
`PAID_PACING_DATA_ROOT` to its local durable data plate (the same pattern
`paid-ephemeris-gateway` uses via `PAID_EPHEMERIS_DATA_ROOT`). Every
settled crossing becomes a content-addressed document plus indexed
assertions recording the settlement only — never the caller's biometric
payload or computed analysis, per the privacy stance above.

## Seating: public custody, not nested under the compute section

The suggested seat for this gateway nested it as a child directory of
`pacing-intelligence-services-section` itself. That does not match how
`paid-ephemeris-gateway` actually seats: the ephemeris gateway lives under
**public custody**
(`public-web-services-section/services/public-web-divination-services-section/services/astrology-services-section/services/astrology-emphemeris-services-section`),
as a section entirely separate from the science/engineering team that owns
the compute it sells (`@lenticule-science/divination-services-section`),
consuming that compute as an ordinary pinned dependency rather than
hosting the gateway inside the compute package's own directory. This
gateway follows that actual precedent: it is seated under public custody,
in a new `public-web-health-services-section/services/pacing-services-section`
pass-through pair (mirroring `public-web-divination-services-section` /
`astrology-services-section`, both of which are themselves pure pass-through
directories with no README or package.json of their own), rather than
nested inside `pacing-intelligence-services-section`.

## Development

```bash
npm install
npm test
```

Dependencies cross settlement membranes only through the exact package
contracts in `package.json`, save the one workspace debt noted above.

## Ownership

- Product compute: Personal Health Computer Systems Engineering /
  Pacing Intelligence Services Section
- Paid HTTP boundary: Public Web Services / Pacing Services /
  paid-pacing-intelligence-gateway
- x402 protocol: Red Cup Engineering / x402 Services Section
- settlement witness: Lenticule Science / witness-journal RDF Services
