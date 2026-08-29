# DeFi Services Section

Parent home under Red Cup Engineering for every third-party DeFi protocol
integration the Union trades against. Sibling to `blockchain-services-section`:
that section carries the Union's own chain infrastructure (sovereign EVM
accounts, signing, consensus primitives); this section carries integrations
with protocols the Union does not control — GMX, and whatever follows it —
built on that infrastructure rather than duplicating it.

## Holdings

- `services/gmx-services-section` — GMX perpetuals on Arbitrum, the first
  protocol-specific section seated here. Proposed stage: no execution or
  custody code yet.

Protocol-specific work seats under `services/` as its own section, the same
way `blockchain-services-section` seats chain-specific work.

## Shared core

Protocol sections sign and submit through the Union's sovereign EVM accounts
in `blockchain-services-section/services/ethereum-services-section` and the
cryptographic primitives in the sibling `cryptographic-services-section`,
rather than re-deriving key math or account abstraction.

## Customers

A protocol section is admitted here to be hired through the Internal Market,
not to run as any one enterprise's private code. A wallet an enterprise
already holds (for example AGRODAO's Yanagi wallet, which carries staked GMX
exposure today, tracked ad hoc in AGRODAO's own capital-action-register)
becomes a parameterized customer of the relevant protocol section rather than
having that logic re-derived inside the enterprise. This requires a priced
customer contract before any wiring — see `capability-pricing-service` under
`capability-services-section` — not a subsidized captive rate.

## Org

- **Over**: red-cup-engineering (Internal Market)
- **Owns**: services/gmx-services-section
