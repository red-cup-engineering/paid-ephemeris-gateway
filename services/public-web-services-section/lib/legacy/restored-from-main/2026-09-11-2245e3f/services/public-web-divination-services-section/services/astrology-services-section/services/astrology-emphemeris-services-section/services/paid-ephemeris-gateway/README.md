# paid-ephemeris-gateway

This seller binds five offer declarations to the shared x402 seller engine.
The declarations in `data/contracts/offers.json` supply prices, schemas,
discovery metadata, market projections, and product identity. The astronomy
package owns numerical computation; Divination adds astrological interpretation.

| Route | Price | Result |
| --- | ---: | --- |
| `GET /v1/astronomy/positions/{date}` | USD 0.04 | Ten-body longitude, latitude and speed; lunar phase; provenance and audited bounds. |
| `GET /v1/astronomy/precision-positions/{date}` | USD 0.32 | DE440 apparent positions, distances, light time, declination, nodes and cross-engine divergence. |
| `GET /v1/ephemeris/moment/{date}` | USD 0.04 | The same numerical positions with signs, motion and major aspects. |
| `GET /v1/ephemeris/precision-moment/{date}` | USD 0.32 | DE440 positions with houses, angles, lots, sect, dignities and expanded aspects. |
| `GET /v1/x402-market/observation` | USD 0.10 | Sampled Base-USDC EIP-3009 activity with provider provenance. |

The shared seller supplies HTTP admission, payment enforcement, status,
a public offer page and an agent card. Node and Workers use the same
application. Node computes both precision products through the astronomy
package's separate Node provider. Workers forwards those products when
`PRECISION_ORIGIN` is configured; that origin owns verification and settlement.
The proxy retains the buyer's public resource URL and settlement receipt.

## Admission and numerical limits

Dates are UTC ISO-8601 instants; a date alone means midnight UTC.
The deterministic positions admit 1800–2050. Precision products admit
1972–2050, subject to the pinned supplier's UTC time support, and require
`latitude` and `longitude`.

Precision astronomy accepts physical coordinates including polar locations.
Precision Moment also accepts `houseSystem` (placidus, koch, whole-sign, equal,
porphyry, regiomontanus or campanus), `rulership` (traditional or modern),
and optional `sidereal` (fagan-bradley, lahiri, krishnamurti or raman).
Placidus and Koch are refused at absolute latitudes of 66 degrees or more.
Invalid requests receive HTTP 422 before payment admission.

Set `OXIEPH_BIN` to OxiEphemeris 0.1.1 and `OXIEPH_DE` to the JPL DE440
classic binary with SHA-256
`29915576d0a6555766b99485ac3056ee415e86df4fce282611c31afb329ad062`.
Supplier numeric resolution is retained; measured divergence from the
independent deterministic engine is reported without inferring universal
accuracy. Payment settlement does not establish an astrological claim.

## Configuration and discovery

Deployments supply `X402_NETWORK`, `X402_FACILITATOR` and `X402_PAY_TO`.
The Worker config declares Base mainnet and the PayAI facilitator. Payout and
domain-claim identity are deployment bindings. CDP remains an optional
facilitator adapter requiring its own credentials.

Each payment challenge carries the declared Bazaar schema and route template.
The declarations also derive 402index and house market representations.
A declaration does not establish an external listing or a completed sale.
The `402index-listing.json` record holds prior external registration evidence.

`npm run assay:public` checks public status and portable offer challenges
without buying. Set `PRECISION_ORIGIN` to the public gateway URL to check
both forwarded precision offers there, or to the Node origin to check it
directly. The assay checks payout, asset, amount, resource URL and route template.

## Durable settlement witness

`npm run start:deployment` starts the witness-journal document provider.
Its data lives under `WITNESS_JOURNAL_ROOT`, defaulting to
`PAID_EPHEMERIS_DATA_ROOT/witness-journal`. Node requires the durable root
and records settlement documents and assertions through that provider.
Offer identity follows the requested route; equal prices do not identify
the same product.

## Development

Run `npm ci` and `npm test`. Dependencies use exact registry versions.
Worker deployment preserves the configured precision origin and secrets.
The cold-red-gate release operator installs the published gateway package,
promotes its release directory and probes the running service.
