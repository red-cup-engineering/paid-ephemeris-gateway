# dCity Services Section

dCity was a Hive-Engine city-simulation game: players held CITY NFTs (SIM
job cards, buildings, citizens) and earned a SIM token. Its own game
contract is closed to new play — it accepts no further CITY-affecting
actions from the token itself. The one live economic surface that remains
is the ordinary Hive-Engine SIM/SWAP.HIVE liquidity pool: SIM that already
exists can still be swapped there like any other Hive-Engine token pair.

## What this service does

`src/recovery.mjs`'s `planDCityLiquidSimRecovery` prices one exact
full-balance liquid-SIM exit through the observed SWAP.HIVE:SIM pool: it
applies the deployed 25-basis-point Hive-Engine `marketpools` fee and a
caller-chosen slippage floor using integer/fraction (`BigInt`) arithmetic
throughout, so no rounding step can quietly move value. It refuses (never
throws) on an empty balance, a pool whose token pair or decimal precision
has drifted from what this fleet has previously confirmed on-chain, or an
out-of-policy slippage request. `statesAgree` lets a caller confirm two
independently observed pool states are the same economic evidence before
acting on either.

`swapTokensOperation` only *encodes* the resulting `marketpools.swapTokens`
custom_json; it does not sign or broadcast it.

## What this service deliberately does not do

It never touches CITY NFTs. The plan and its `state` input carry `nftCount`
and `nftLockedSim` fields that pass through completely untouched — a
reminder that historical CITY custody is a separate concern this recovery
pricing does not decide, not something this module could accidentally
liquidate. It also never signs or broadcasts; it only prices and encodes.

## Migration status

Ported from `aagaard`'s `src/integrations/dcity/dcity.adapter.ts`.
`swapTokensOperation` duplicates a small slice of `aagaard`'s shared
`src/integrations/hive-engine/hiveEngineOps.mjs` encoder rather than
depending on aagaard's package from a sibling section — see the parent
section's README for that duplication and the extraction it should
eventually become. `aagaard`'s own `scripts/dcity-recovery.mjs` still
imports its own TypeScript copy of the adapter.

## Verification

```sh
npm test
```
