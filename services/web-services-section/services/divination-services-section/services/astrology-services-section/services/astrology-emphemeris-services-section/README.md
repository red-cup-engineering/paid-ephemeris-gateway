# paid-ephemeris-gateway

An x402-gated seller for two calculations of the same exact moment. The
Ephemeris Tracking Team owns the products; this gateway owns HTTP admission,
Coinbase Bazaar discovery, payment enforcement, and the settled boundary
witness.

| Route | Price | Product |
|---|---:|---|
| `GET /v1/ephemeris/moment/:date` | USD 0.04 | Audited deterministic positions for ten bodies, motion, lunar phase, major aspects, and provenance. |
| `GET /v1/ephemeris/precision-moment/:date` | USD 0.32 | The same instant recomputed from pinned JPL DE440 through OxiEphemeris, with observer location, houses, angles, nodes, lots, sect, dignities, expanded aspects, and cross-engine divergence. |

Both responses mark astronomical measurements separately from
tradition-dependent astrological interpretations. Payment is evidence that a
priced boundary crossing settled; it is never evidence that an interpretation
is scientific fact.

## Admission

The date is an ISO-8601 UTC instant. A date without a time means midnight UTC.
Moment Essentials admits 1800–2050. Precision Moment currently admits
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

## Coinbase Bazaar

Both routes declare strong Bazaar discovery metadata. Coinbase catalogs them
after the first successful settlement through the CDP facilitator; there is no
separate listing submission. Production configuration uses:

```text
X402_NETWORK=eip155:8453
X402_FACILITATOR_PROVIDER=cdp
X402_FACILITATOR=https://api.cdp.coinbase.com/platform/v2/x402
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
X402_PAY_TO=0x...
```

Do not put credentials or the production payout identity in source. The
source law names the provider actor; deployment configuration binds that actor
to the production account.

For Base Sepolia proving, omit the CDP variables and use:

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

`npm run start:deployment` starts the separately contracted local witness-journal RDF A2A
provider and points the gateway to its signed Agent Card. Set `WITNESS_JOURNAL_RDF_ROOT`
to durable storage. Every settled crossing becomes a typed, canonical RDF named
graph with PROV relations. Startup refuses an absent witness provider.

## Development

```bash
npm install
npm run verify
```

Dependencies cross settlement membranes only through the file contracts in
`package.json`. The implementation is being kept open-source-ready—reproducible
inputs, declared third-party licenses, runtime-only identities, and no bundled
secrets—but no publication is authorized yet.

## Ownership

- Product: Lenticule Science / Divination / Ephemeris Tracking Team
- Paid HTTP boundary: RSC Quiescent / paid-ephemeris-gateway
- x402 protocol: Red Cup Engineering / x402 Services Section
- settlement witness: Lenticule Science / witness-journal RDF Services
