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
- Gross spread is not profit. Venue fees, native resource costs, and asset
  conversions must be witnessed before a route can be reported as economic.
- Signing stays behind the existing allowlisted broadcaster and cloud key-file
  permissions. Operators and timers invoke bounded code paths; no interactive
  command is an autonomous strategy.

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
