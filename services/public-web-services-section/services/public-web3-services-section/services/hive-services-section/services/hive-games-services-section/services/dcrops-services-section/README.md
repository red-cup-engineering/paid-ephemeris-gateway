# dCrops Services Section

dCrops is a Hive-Engine farming game: land and seeds are NFTs whose game
state is encoded into their NFT `properties` as embedded JSON, seasons
rotate on a fixed schedule, and planting/harvesting/removing a crop are each
a `dcrops` custom_json action targeting exactly one plot on one land NFT.

## What this service does

- `parseDCropsSeason` / `parseDCropsLand` / `parseDCropsSeed` — decode the
  game's NFT-instance shape (including its embedded-JSON `properties`
  fields) into typed season, land, and seed state, with account ownership
  checked when the caller supplies an expected account.
- `planDCropsPlot` — for one plot on one land, decides whether to
  `remove-expired` (a mismatched or 30-day-expired crop), `plant` (an empty,
  in-season, cooldown-cleared plot), `harvest` (a mature crop still inside
  its harvest window), `wait` (not yet ready, with the exact next-eligible
  timestamp), or `refuse` (foreign assets, a stale season, or a seed that
  cannot mature before the season ends). Every non-`wait`/`refuse` result
  carries an unsigned intent from `dcropsRemoveIntent` /
  `dcropsPlantIntent` / `dcropsHarvestIntent`, each marked
  `approvedForBroadcast: false`.
- `validateDCropsActionJson` — asserts a decoded action body is exactly one
  of the three admitted single-plot shapes, refusing multi-plot or
  multi-land batches and any unrecognized operation.
- `createDCropsClient` — the one I/O boundary, a Hive-Engine `findOne`
  NFT-instance reader with node failover. Exercised in tests only against a
  caller-supplied `fetchImpl`, never a live network call.

## What this service deliberately does not do

It never signs or broadcasts a plot action, and it never plans more than one
plot's action per call — a caller that wants to work an entire land does so
by calling `planDCropsPlot` once per plot and deciding independently how (or
whether) to act on each result.

## Migration status

Ported in full from `aagaard`'s `src/integrations/dcrops/dcrops.adapter.ts`
(fully self-contained; no shared dependency to duplicate). `aagaard`'s own
`scripts/dcrops-cycle.mjs` still imports its own TypeScript copy.

## Verification

```sh
npm test
```
