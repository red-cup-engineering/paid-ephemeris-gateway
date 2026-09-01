# GMX Services Section

GMX protocol integration under DeFi Services Section: perpetual positions on
GMX (Arbitrum). Signs and submits through the sovereign EVM accounts owned by
`blockchain-services-section/services/ethereum-services-section` rather than
carrying its own key handling.

## Current state: Proposed

No code exists yet. Nothing here reads a GMX position, prices a trade, or
holds any execution or custody authority. This README exists so the node is
a legible growth face rather than a bare directory.

Development discipline (matching the [Financial Services Section](../../../../../../../../../../../../561-group-services-section/services/561-group-science-services-section/services/financial-services-section/)'s three states — proposed,
implemented, live): a face moves from proposed to implemented only once it
runs against real GMX contract state and reports its output for observation;
it moves to live only after a consuming enterprise's real decision path
depends on that output and it has been watched and found sane. Execution
(signing, broadcasting, position mutation) is later and separate from
observation, and follows AGRODAO's own stated boundary for anything touching
Yanagi's wallet: no signing, broadcasting, transaction assembly, or secret
access without an explicit execution admission.

## First face to build

Read-only GMX position and market observation — what GMX exposure a given
address holds, priced against live GMX market data — mirroring the pattern
`ethereum-services-section` already runs for `observe-fixed-fork-beefy-vault-exits`
and `observe-fixed-block-contract-identities`: deterministic, deployment-neutral
evidence, never execution authority.

## Customers

AGRODAO's Yanagi wallet (0x224C...078d, per
`agrodao/content/observations/public-accounts/evm-wallet-fleet.json`) holds
staked GMX today and is the first candidate customer, wired as a parameterized
address rather than hand-rolled logic inside AGRODAO. Requires a priced
Internal Market contract before any wiring — not yet in place.

## Org

- **Over**: defi-services-section
- **Owns**: (no child teams yet)
