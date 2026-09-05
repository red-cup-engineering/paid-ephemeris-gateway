***Vexler's Liquid Vault*** (VLV) is an private investment portfolio on [Hive](Hive) managed by [Sigmund Vexler](Sigmund Vexler) open to members of the [Turntide Islands](Turntide Islands) and [AGRODAO](AGRODAO).

## Principles
- Hive is messy
	- the rate of technical debt outpaces the rate of repair & development.
	- Yield comes from odd places
- No Tribe is good enough to beat the messiness
- Keep value within Hive liquid, diversified, and as de-coupled from HIVE as possible.
- If a token doesn't have a liquidity pool, swap it for one that does
## Strategies
- Focus on providing liquidity to bridge tokens
	- SWAP.BTC, SWAP.ETH
- Limit positioning within any tribal tokens to 0.1% share of pool.
- Shares may be redeemed for HIVE, HBD, or in-kind

## Administration

- Weekly:
	- Process deposits:
		- Calculate shares based on USD value of deposit
		- Update Vault documentation
	- Move Hive rewards to Hive-Engine
	- allocate any unpositioned tokens:
		- into their liquidity pool if possible
		- otherwise swap half for HIVE and half for a bridge token:
			- If BTC Vault position < 0.1% of pool total: BTC
			- Else if ETH Vault position < 0.1% of pool total: ETH
			- Else if BNB Vault position <0.1% of pool total: BNB
			- Else if SOL Vault position < 0.1% of pool total: SOL
			- else BTC
	- Process withdrawals:
		- if the value of shares being redeemed is greater than the value of shares at deposit, then 10% of that difference, as shares, is transferred to the [Turntide Islands DAO](Turntide Islands DAO).
		- The remaining shares total value is calcuated as a % of the total value value
		- That % is withdrawn from each liquidity pool
		- depending on redemption choice:
			- send all redeemed tokens
			- swap non-HIVE tokens for HIVE and send HIVE
			- swap non-HIVE tokens for HIVE and HIVE for HBD and send HBD
## Overview

*This section was updated on [2025-03-25](2025-03-25)*

A complete rendering of the vault's activity is available on-chain, and the account posts routine updates on-chain as well.

This section is limited to the most relevant information: current depositors, holdings, and the key information that can be synthesized from that:

| Shares | NAV at Deposit | Nav at Update | Δ%   |
| ------ | -------------- | ------------- | ---- |
| 33.81  | 0.4141         | 0.4437        | 7.15 |

### Depositors

Depositors must be active members of either [Turntide Islands](Turntide Islands) or [AGRODAO](AGRODAO).
Deposit and redemption is done manually through communicating with Sigmund Vexler.

| Depositor      | Sum Deposit Value (USD) | Shares | Average NAV (USD) |     |
| -------------- | ----------------------- | ------ | ----------------- | --- |
| Michael Marmot | 7.34                    | 1      | 7.34              |     |
| TOTAL          | 7.34                    | 1      | 7.34              |     |

## Holdings

### Liquidity Pool Positions

The `Value` of liquidity positions is reported from TribalDex's interface.

| Pool               | Token 1     | Token 2    | Value (USD) | % of Pool |
| ------------------ | ----------- | ---------- | ----------- | --------- |
| SWAP.HIVE:SWAP.BTC | 16.95533879 | 0.00004526 | 7.332       | 0.004     |
| TOTAL              |             |            | 7.332       |           |
## History
### 2025
- [2025-03-24](2025-03-24)
	- [Sigmund Vexler](Sigmund Vexler) has the idea to set up a separate account for his investment portfolio on Hive.
- [2024-04-03](2024-04-03)
	- [Sigmund Vexler](Sigmund Vexler) sets up the [HELP Fund](HELP Fund)
	- [Michael Marmot](Michael Marmot) delegates 3 [HIVE](HIVE) to [HELP Fund](HELP Fund)
	- [Michael Marmot](Michael Marmot) makes the first deposit to [HELP Fund](HELP Fund), \$7.44 for 1 share.
