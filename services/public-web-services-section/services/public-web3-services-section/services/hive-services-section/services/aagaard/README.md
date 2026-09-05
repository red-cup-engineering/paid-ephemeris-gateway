# Aagaard

Autonomous Hive wallet operations with chain evidence as the only economic
truth. The service never treats a local report, cache, or prior plan as proof
of a balance, fill, fee, reward, or profit.

## Operating rules

- A route is admitted only from fresh, independently agreeing public-chain or
  Hive Engine observations.
- Amounts, prices, and resource costs use exact integer/fraction arithmetic.
- A submitted transaction is never retried automatically. It is reconciled by
  transaction identity and observable post-state before another action can be
  considered.
- Gross spread is not profit. Venue fees and host overheads must be priced and
  witnessed, and Hive RC capacity must clear its reserve, before a route can
  be reported as economic.
- Signing stays behind the existing allowlisted broadcaster and cloud key-file
  permissions. Operators and timers invoke bounded code paths; no interactive
  command is an autonomous strategy.

## Resource cost model

An autonomous cycle's real per-cycle SWAP.HIVE cost is the signer host share
plus the runner/paymaster host share (`src/core/resourceCostModel.mjs`,
`priceResourceCosts`), each amortized from the 561-group machines record when
it carries a monthly figure, otherwise a named declared default
(`AAGAARD_SIGNER_SWAP_HIVE_PER_CYCLE`, `AAGAARD_RUNNER_SWAP_HIVE_PER_CYCLE`).
A cycle is trusted net-positive only once its certified worst-case profit
clears that priced total plus `NET_FLOOR_MARGIN_SWAP_HIVE`.

Hive Resource Credits are a capacity floor, never a price: RC regenerates
fully over five days and is never spent as HIVE, so it costs a
well-provisioned account nothing to hold. A cycle instead checks the
account's current RC against the RC each of its operations actually needs
(`rc_api.get_rc_operation_stats`, at least two independent providers,
judged by the more conservative reading) and refuses `rc-capacity-insufficient`
when meeting that need would eat into a declared reserve fraction of the
account's total RC capacity (`RC_CYCLE_RESERVE_PERCENT`, default 20%) kept
free for the account's other duties.

## Verification

```sh
npm test
npm run check
```

The repository deliberately has no separate settlement database. Historic
episodes are reconstructed from Hive/Hive Engine transaction history and the
relevant contract post-state.

## Native HIVE/HBD market

`scripts/native-market-cycle.mjs --account <fleet-account>` performs one
read-only cycle by default. It obtains independently agreeing order-book,
five-minute history, balance, open-order, and account-history observations,
then emits a bounded plan. `--watch-seconds 15` repeats the observation.

Live mode requires the existing allowlisted broadcaster and active-key root.
The acquisition is fill-or-kill and capped at 1.000 HIVE. The contingent
maker exit is not submitted until a fresh complete chain observation proves
the acquired HIVE balance and the acquisition order's disappearance. Use
`--live --cancel-all` to cancel every currently observed native order for the
selected account. Local logs and transaction submissions are never treated as
fill, proceeds, or profit evidence.
