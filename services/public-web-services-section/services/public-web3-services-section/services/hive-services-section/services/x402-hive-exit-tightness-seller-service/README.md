# x402 Hive Exit-Tightness Seller Service

Re-faces the live HBD-paid `hive-engine-exit-tightness` product (owned by the
sibling `aagaard` package, untouched by this package) as the first x402
`hbd-transfer`-scheme seller: a request without a payment claim returns the
402 `hbd-transfer` payment requirement (`@red-cup-engineering/form-hbd-payment-requirement-service`);
a request with a verified HBD transfer (`@red-cup-engineering/verify-hbd-payment-service`)
settles the sale (`@red-cup-engineering/settle-hbd-purchase-service`) and runs
the existing `aagaard` read-only probe as an external command
(`@red-cup-engineering/execute-javascript-node-command-service`) to produce
the sold report.

This package never holds a Hive key, never signs, and never broadcasts a
transaction — every Hive read is public, and `aagaard`'s own script is
invoked exactly as its own CLI documents, never imported or modified.

- `src/sell-hive-exit-tightness-resource.mjs` — the pure composing logic
  (`sellHiveExitTightnessResource`), fully offline-testable via an injectable
  `runCommand` and `paymentClaim.fixtureResponses`.
- `apps/x402-hive-exit-tightness-seller-cli.mjs` — the real wiring
  (`serveHiveExitTightnessX402Resource`): the live default Hive node pair,
  the real `aagaard` script path, and the real semantic record journal on a
  settled sale.
