---
type: object
class: channel
status: draft
name: Accounting
kind: operation-typology
emit-policy: any
read-policy: any
retention: durable
ordering: total
depends-on: [channel, witness, ledger]
---

# Accounting channel

Updates a *ledger predication* — resource flow bookkeeping.
Distinct from mutation because the ledger has its own audit discipline (double-entry, balance-preservation, settlement-cell semantics).

Examples: rate-limit-budget consumption, capacity-cell decrements, cost-attribution witnesses.

Accounting witnesses are typically machine-readable and aggregate cleanly: per-axis sums, per-period totals, drift checks.
The ledger's discipline is what makes the polity's resource picture auditable rather than opaque.
