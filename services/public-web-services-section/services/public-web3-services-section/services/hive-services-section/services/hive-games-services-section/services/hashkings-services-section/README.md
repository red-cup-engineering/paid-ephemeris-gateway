# HashKings Services Section

HashKings is a Hive-Engine farming game (BUDS, HKWATER, MOTA fungibles;
plot/seed NFTs) whose web client has repeatedly gone dark behind a
client-side redirect to a `/lander` holding page. This service exists to
answer one conservative question from observed evidence: is there any
actual, material reason to move custody of this fleet's remaining HashKings
assets, or should they simply be left alone?

## What this service does

- `quoteHashKingsBudsPoolExit` — prices a BUDS-to-SWAP.HIVE Hive-Engine
  pool exit using integer/fraction arithmetic, given observed pool
  reserves and a fee.
- `assessHashKingsRecovery` — classifies observed wallet and market
  evidence into `preserve-custody` (the default — no material executable
  bid or recent comparable NFT sale exists), `review-recovery` (an actual
  fungible buy order exists, the BUDS pool exit clears a minimum threshold,
  or a recent independently confirmed NFT sale sets a comparable price),
  or `refuse` (malformed evidence, provider disagreement, or a changed
  token precision — refused rather than guessed at). This function only
  classifies; it never itself proposes or encodes a transaction.
- `statesAgree` — confirms two independently observed states are the same
  evidence before either is trusted.
- `classifyDomainResponse` — classifies an HTTP status, redirect location,
  and response body as `parked` (a `/lander` redirect, including a
  client-side `window.location.href` redirect visible only in the response
  body), `operational`, or `unknown`.

## What this service deliberately does not do

It has no purchase, sale, listing, transfer, or claim planner at all — only
observation and a custody classification. Even a `review-recovery` result
is not an action plan; it is a signal that a separate, explicit decision is
warranted, which this service leaves entirely to whatever reads its output.
There is no `custom_json` encoder anywhere in this package.

## Migration status

Ported in full from `aagaard`'s
`src/integrations/hashkings/hashkings.adapter.ts` (fully self-contained),
plus `classifyDomainResponse` and `statesAgree` from `aagaard`'s
`scripts/hashkings-recovery.mjs`. `aagaard`'s own script still imports its
own TypeScript copy of the adapter and performs the actual domain probe.

## Verification

```sh
npm test
```
