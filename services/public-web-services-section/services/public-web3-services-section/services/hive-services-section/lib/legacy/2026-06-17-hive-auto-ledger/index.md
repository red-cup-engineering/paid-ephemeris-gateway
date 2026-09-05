---
title: Hive Auto Ledger
type: doc
status: draft
keywords:
  - tooling
  - systems
  - hive
  - blockchain
  - tokenomics
external_links: []
---


_Last updated from triage notes on 2025-08-26._

## Overview

Hive Auto-Ledger (HAL) is a speculative platform designed to manage Hive blockchain wallets with a focus on transparency, usability, and automation. The app will provide tools to track wallet contents, manage transactions, and analyze market data, all while maintaining an accurate Beancount ledger. Future iterations will integrate advanced features such as trade bots, post analytics, CMS capabilities, and tokenomics.

## Roadmap

### HIVE/HBD Market Analyzer

- A view of the current metrics around HIVE/HBD trade and book details, on the chain's internal market.
- Include trade analysis information, VWAP, etc.

### Subscription

- Users can subscribe to HAL by delegating 10 (or more) HP to `@hiveautoledger` (Tier 1 Subscriber).
- Subscription lasts as long as the delegator.
- Validated by logging in with Hive Keychain.
- Subscribers gain access to, at first, a synthesis of trade analysis into signals: buy/sell, discounted/elevated value, etc.
- Subscribers will be curated by `@hiveautoledger` proportional to delegation.

### Market History Analyzer

- Keep market data in a database.
- Include longer-term trade analysis information.
- Subscribers can see longer-term analysis synthesis/signals.
- Subscribers who delegate >50HP (Tier 2 subscriber) can export this data.

### Wallet Analyzer

- A view of a wallet's HIVE/HBD holdings, staked and liquid.
- Tier 2 subscribers get their account history turned into a double-booked ledger, where holdings have cost basis.
- Tier 3 subscribers can use that, and info from the Market History Analyzer, to show what the wallet's market value and at-cost value for its holdings were over time; convert all value to HIVE on a given day, or HBD.
- Tier 3 can export wallet history as a Beancount file.

### Hive Engine Token Pair Analyzer

- A view on the market between tokens paired on TribalDex.
- Same subscription structure as mainchain.

### Wallet Engine Analyzer

- Same as the other wallet analyzer, but for the Engine tokens.
- Same subscription structure as mainchain.

### Synthesized Wallet Analyzer

- Wallet analyzer that takes both parts into account.
- Same subscription structure as mainchain.

### HIVE/HBD Trade Interface

- Allow trading from the trade analysis interface.
- Free.

### HIVE/HBD Trade Automation

- Interface for creating and managing trade bots.
- Bot designer available to Tier 4:
  - trade cycle frequency,
  - buy/sell conditions.
- Pay-to-deploy, pay-per-cycle, pay-per-trade:
  - users' bots prioritized by subscription delegation amount.

### HAL Token Launch

- 100,000 HAL are minted and distributed based on all-time curation returns.
- HAL/SWAP.HBD liquidity pool established.

### Engine DEX

- Set up frontend for the Engine DEX.

### Content Analytics

- Look at the curation rewards and all available analytics for a given Hive post/comment.

### Wallet Post Analytics

- Look at the metrics for all of a wallet's posts.

### Wallet Curation Analytics

- Look at the metrics for a wallet's curation.

### Content Management

- Allow users to draft, edit, publish posts.
- Allow for post templating and scheduling.

### AI Content Analytics

- Use AI to do more analysis of content.

### AI Content Writing

- Use AI to help folk write content.

## Tokens

HAL is designed to support a robust token-based economy, with its own set of tokens to help provide that support.

### Layer 1

#### HAL

HAL is the governance and utility token at the core of the Hive Auto Ledger (HAL) platform, designed to integrate all aspects of its economy into a single, cohesive system. HAL facilitates decentralized decision-making, with governance weighted by staked tokens. Users propose changes, allocate resources, and guide development by staking and spending HAL, creating a self-sustaining cycle of demand.

Revenue from the platform—whether from pay-to-use features like market analytics, trading fees, or contributions like Hive Power delegation—is collected in various tokens and converted into HAL through market buybacks. This ensures HAL remains the sole internal currency, directly tying its value to the platform’s success. Early liquidity providers register their contributions manually, earning proportional rewards in HAL, with plans to evolve into tokenized liquidity pool models as the system scales.

As the platform grows, HAL’s utility extends to funding proposals, incentivizing community engagement, and supporting key infrastructure like Resource Credit management. Its economy is built to align incentives, ensuring every participant—from app users to liquidity providers to governance contributors—can shape and benefit from the platform’s success. HAL is not just a token; it is the foundation of a circular, utility-driven economy designed to evolve alongside the Hive Auto Ledger.

### Layer 2

#### Liquidity Derivatives

##### HLDSHBD

HLDSHBD is a liquid token derived from pooled staked HBD. The token is managed by a smart contract that stakes all deposited HBD, earning rewards that are automatically compounded back into the pool. HLDSHBD represents a proportional claim on the pool, including both the staked principal and accrued rewards. The token can be traded or integrated into DeFi protocols, offering holders liquidity and yield simultaneously. Redemption is facilitated by sending HLDSHBD to the contract, which unstakes and returns the corresponding share of the pool’s value to the sender.

##### HLDSHP

HLDSHP (HAL Liquidity Derivative, Staked Hive Power) is a straightforward financial tool representing pooled staked Hive Power. Users stake HIVE through a smart contract, receiving HLDSHP tokens that denote their proportional share of the pool. Staking rewards are compounded automatically, and redemption involves returning HLDSHP to the contract, which unstakes the corresponding HIVE and distributes it after the standard on-chain unstaking period.

#### Liquidity Pools (Layer 2)

##### HLPSWAPHBD

- Pairing of HAL and SWAP.HBD.

##### HLPSWAPHIVE

- Pairing of HAL and SWAP.HIVE.

### Layer 3

#### Liquidity Pools

Each of the tokens in Layer 1 can be paired with each of the tokens in Layer 2, for Layer 3 LPs.

For example, HAL and HLDSHAL can be paired to make `HLPHLDSHAL` (when a HLP token is starting with HAL, we don't bother putting that in the name; it's the only thing we can do to keep them shorter).

### Layer 4

#### Liquidity Pools

Every token in Layer 1 and Layer 2 can be paired with every token in Layer 3, for 84 Layer 4 LPs.

Here is a potential token and its breakdown:

- HLP
  - HLP
    - HLD
      - SHAL
    - HLD
      - SHP
  - HLP
    - HLD
      - SHAL
    - HLD
      - SHBD

For a token name of `HLPHLPHLDSHALHLDSHPHLPHLDSHALHLDSHBD`, where:

- `HLP` stands for HAL Liquid Derivative,
- `HLP` (second position) stands for HAL Liquidity Pair,
- `SHAL` for Staked HAL,
- `SHP` for Staked Hive Power,
- `SHBD` for Staked Hive Backed Dollar.

## HAL Token Overview

HAL is the governance and utility token at the core of the Hive Auto Ledger (HAL) platform, designed to integrate all aspects of its economy into a single, cohesive system. HAL facilitates decentralized decision-making, with governance weighted by staked tokens. Users propose changes, allocate resources, and guide development by staking and spending HAL, creating a self-sustaining cycle of demand.

Revenue from the platform—whether from pay-to-use features like market analytics, trading fees, or contributions like Hive Power delegation—is collected in various tokens and converted into HAL through market buybacks. This ensures HAL remains the sole internal currency, directly tying its value to the platform’s success. Early liquidity providers register their contributions manually, earning proportional rewards in HAL, with plans to evolve into tokenized liquidity pool models as the system scales.

As the platform grows, HAL’s utility extends to funding proposals, incentivizing community engagement, and supporting key infrastructure like Resource Credit management. Its economy is built to align incentives, ensuring every participant—from app users to liquidity providers to governance contributors—can shape and benefit from the platform’s success. HAL is not just a token; it is the foundation of a circular, utility-driven economy designed to evolve alongside the Hive Auto Ledger.

## Hive Investment Bot

### Version 0.0.1

```python
#!/usr/bin/env python3
import os
import time
import logging
import argparse
from beem import market
import pandas as pd
from datetime import datetime, timedelta
from beem import Hive
from beem.account import Account
from beem.market import Market
from rich.console import Console

# Configuration Variables
CYCLE_SPEED = 15  # Time between cycles in seconds

console = Console()


# Logger setup
def setup_logger():
    logging.basicConfig(level=logging.INFO,
                        format='%(asctime)s - %(message)s',
                        datefmt='%H:%M:%S')
    return logging.getLogger('bot')


# Order analysis class
class OrderAnalyzer:

    def __init__(self, market):
        self.market = market

    def get_orderbook(self):
        try:
            return self.market.orderbook()
        except Exception as e:
            console.print(f"[red]Error retrieving orderbook: {str(e)}[/red]")
            return None

    def analyze_orderbook(self):
        orderbook = self.get_orderbook()
        if not orderbook or 'asks' not in orderbook or 'bids' not in orderbook:
            return None
        lowest_ask = float(orderbook['asks'][0]['price'])
        highest_bid = float(orderbook['bids'][0]['price'])
        spread = lowest_ask - highest_bid
        spread_percentage = (spread /
                             highest_bid) * 100 if highest_bid > 0 else 0
        console.print(
            f"      [cyan]Ask[/cyan] [red]{lowest_ask:.3f}[/red]  to  [green]{highest_bid:.3f} [/green] bid"
        )
        console.print(
            f"        [cyan]Spread:[/cyan] [yellow]{spread:.3f}[/yellow]")
        market_status = {
            'ask': lowest_ask,
            'bid': highest_bid,
            'spread': spread
        }
        return market_status


# Trade analysis class
class TradeAnalyzer:

    def __init__(self, market):
        self.market = market

    def get_trade_history(self):  # Last 3 minutes
        try:
            return self.market.market_history(1, 360, 0)
        except Exception as e:
            console.print(
                f"[red]Error retrieving trade history: {str(e)}[/red]")
            return None

    def calculate_vwap(self):
        trades = self.get_trade_history()
        if not trades:
            return None

        rows = []
        for trade in trades:
            if 'hive' in trade and 'non_hive' in trade:
                hive_data = trade['hive']
                non_hive = trade['non_hive']

                if float(hive_data['close']) > 0:
                    price = float(non_hive['close']) / float(
                        hive_data['close'])
                    hive_volume = float(hive_data['volume'])
                    rows.append({'price': price, 'hive_volume': hive_volume})

        df = pd.DataFrame(rows)

        if not df.empty:
            vwap = (df['price'] *
                    df['hive_volume']).sum() / df['hive_volume'].sum()
            return vwap

        console.print("[yellow]No trades in the last 3 minutes.[/yellow]")
        return None


# Opportunity analysis class
class OpportunityAnalyzer:

    def __init__(self, order_analyzer, trade_analyzer, wallet_analyzer):
        self.order_analyzer = order_analyzer
        self.trade_analyzer = trade_analyzer
        self.wallet_analyzer = wallet_analyzer

    def find_opportunity(self):
        market_status = self.order_analyzer.analyze_orderbook()
        if not market_status:
            return None

        vwap = self.trade_analyzer.calculate_vwap()
        vwap_spread = market_status['ask'] - vwap
        console.print(
            f"  [cyan]3mVWAP[/cyan] [yellow]{vwap:.3f}[/yellow]  to  [red]{market_status['ask']:.3f}[/red] [cyan]ask[/cyan]"
        )
        console.print(
            f"      [cyan]Spread:[/cyan] [yellow] {vwap_spread:.3f}[/yellow]")

        if market_status['ask'] <= vwap:
            if vwap_spread <= 0.000:
                spread = market_status['ask'] - market_status['bid']
                if spread > 0.000:
                    console.print(
                        f"Spread of {market_status['spread']:.3f} is beyond precision tolerance..."
                    )
                    buy_price = market_status['ask']
                    sell_price = (buy_price + 0.001)
                    min_trade_hive = 0.001 / (sell_price - buy_price)
                    balances = self.wallet_analyzer.get_balances()
                    required_hbd = min_trade_hive * buy_price
                    if balances['HIVE'] >= min_trade_hive and balances['HBD'] >= required_hbd:
                        console.print(
                            f"Minimum trade size of {min_trade_hive:.3f} HIVE and {required_hbd:.3f} HBD is liquid in wallet..."
                        )
                        console.print(
                            f"OPPORTUNITY FOUND: Buy {min_trade_hive:.3f} at {buy_price:.3f}, sell at {sell_price:.3f}"
                        )
                        return {
                            'buy': buy_price,
                            'sell': sell_price,
                            'volume': min_trade_hive
                        }
                    else:
                        console.print(
                            f"Insufficient funds. Need {min_trade_hive:.3f} HIVE and {required_hbd:.3f} HBD, have {balances['HIVE']:.3f} HIVE and {balances['HBD']:.3f} HBD"
                        )
                else:
                    console.print(
                        f"Market spread of {spread} too narrow for precision tolerance. NO OPPORTUNITY."
                    )
            else:
                console.print(
                    "     [yellow]3mVWAP spread[/yellow] <= [yellow]0.001[/yellow]"
                )
        else:
            console.print(
                "        [yellow]3mVWAP[/yellow]  <=  [red]Ask[/red]")
        return None


# Wallet handling class
class WalletHandler:

    def __init__(self, account):
        self.account = account

    def get_balances(self):
        try:
            balances = {
                'HIVE': float(self.account.get_balance('available', 'HIVE')),
                'HBD': float(self.account.get_balance('available', 'HBD'))
            }
            return balances
        except Exception as e:
            console.print(f"[red]Error retrieving balances: {str(e)}[/red]")
            return None


# Main bot class
class HiveTradingBot:

    def __init__(self, active_key, account_name, dryfire, cleanup_mode):
        self.logger = setup_logger()
        self.dryfire = dryfire
        self.cleanup_mode = cleanup_mode
        nodes = [
            "https://api.hive.blog", "https://api.hivekings.com",
            "https://anyx.io", "https://api.openhive.network"
        ]
        self.hive_instance = Hive(nodes=nodes, keys=[active_key])
        self.account = Account(account_name,
                               blockchain_instance=self.hive_instance)

        market = Market("HIVE:HBD", blockchain_instance=self.hive_instance)
        self.order_analyzer = OrderAnalyzer(market)
        self.trade_analyzer = TradeAnalyzer(market)
        self.wallet_handler = WalletHandler(self.account)
        self.opportunity_analyzer = OpportunityAnalyzer(
            self.order_analyzer, self.trade_analyzer, self.wallet_handler)

    def cleanup(self):
        """Cancel all open orders and perform cleanup"""
        try:
            if self.cleanup_mode == 'all' and not self.dryfire:
                console.print("[yellow]Cancelling all open orders...[/yellow]")
                self.order_analyzer.market.cancel_all(account=self.account)
                console.print("[green]All orders cancelled[/green]")
            else:
                console.print("[yellow]Cleanup skipped - dryfire mode or cleanup not enabled[/yellow]")
        except Exception as e:
            console.print(f"[red]Error during cleanup: {str(e)}[/red]")

    def run(self, cycle_speed):
        print("Beginning trade cycle")
        if self.dryfire:
            print("Dryfire mode enabled. No trades will be executed.")
        else:
            print("LIVE TRADING MODE!!! REAL FUNDS WILL BE USED!!!")
        try:
            while True:
                try:
                    console.print(
                        "\n[bold cyan]Trade cycle beginning...[/bold cyan]")
                    opportunity = self.opportunity_analyzer.find_opportunity()
                    if opportunity:
                        if not self.dryfire:
                            # Double check balance before placing orders
                            current_balance = self.wallet_handler.get_balances()
                            if current_balance and current_balance['HIVE'] >= opportunity['volume']:
                                console.print(
                                    f"Placing orders for {opportunity['volume']:.3f} HIVE")
                                # Place orders here
                            else:
                                console.print("[red]Insufficient balance to execute trade[/red]")
                        else:
                            console.print("Dryfire mode enabled. Moving on.")
                    else:
                        console.print(
                            "[bold cyan]Cycle ending:[/bold cyan] [cyan]No move[/cyan]"
                        )
                    console.print(
                        f"[cyan]Sleeping[/cyan] [yellow]{cycle_speed}s[/yellow]")
                    time.sleep(cycle_speed)
                except KeyboardInterrupt:
                    raise
                except Exception as e:
                    console.print(f"[red]Error in trading loop: {str(e)}[/red]")
                    raise
        finally:
            console.print("\n[yellow]Shutting down...[/yellow]")
            self.cleanup()


def main():
    parser = argparse.ArgumentParser(description="Hive Trading Bot")
    parser.add_argument(
        "--dryfire",
        type=str,
        default="true",
        help=
        "Run in dryfire mode (default: true). Must set --dryfire=false and --live=true to execute trades."
    )
    parser.add_argument(
        "--live",
        type=str,
        default="false",
        help="Explicitly confirm live trading mode (default: false).")
    parser.add_argument("--account",
                        type=str,
                        help="Hive account name for the bot to use.")
    parser.add_argument("--key",
                        type=str,
                        help="Active key for the Hive account.")
    parser.add_argument("--cleanup",
                        type=str,
                        default="none",
                        help="Cleanup mode on shutdown: 'none' or 'all' (default: none)")
    args = parser.parse_args()

    dryfire = not (args.dryfire.lower() == "false"
                   and args.live.lower() == "true")
    cleanup_mode = args.cleanup.lower()
    account_name = args.account or os.environ.get('HIVE_ACCOUNT')
    active_key = args.key or os.environ.get('HIVE_ACTIVE_KEY')

    if not account_name or not active_key:
        console.print(
            "[red]Error: Hive account name and active key are required. Provide them using --account and --key arguments or set HIVE_ACCOUNT and HIVE_ACTIVE_KEY as environment variables.[/red]"
        )
        return

    bot = HiveTradingBot(active_key, account_name, dryfire, cleanup_mode)
    bot.run(cycle_speed=CYCLE_SPEED)


if __name__ == "__main__":
    main()
```

### Version 0.0.2

```python
#!/usr/bin/env python3
import os
import time
import logging
import argparse
from typing import Dict, Any, Optional, List, Tuple, Callable
from functools import partial, reduce
from beem import Hive
from beem.account import Account
from beem.market import Market
from rich.console import Console
import pandas as pd

CYCLE_SPEED = 15
console = Console()


def setup_logger() -> logging.Logger:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(message)s',
        datefmt='%H:%M:%S'
    )
    return logging.getLogger('bot')


def get_orderbook(market: Market) -> Optional[Dict]:
    try:
        return market.orderbook()
    except Exception as e:
        console.print(f"[red]Error retrieving orderbook: {str(e)}[/red]")
        return None


def analyze_orderbook(orderbook: Optional[Dict]) -> Optional[Dict]:
    if not orderbook or 'asks' not in orderbook or 'bids' not in orderbook:
        return None

    lowest_ask = float(orderbook['asks'][0]['price'])
    highest_bid = float(orderbook['bids'][0]['price'])
    spread = lowest_ask - highest_bid

    console.print(f"      [cyan]Ask[/cyan] [red]{lowest_ask:.3f}[/red]  to  [green]{highest_bid:.3f} [/green] bid")
    console.print(f"        [cyan]Spread:[/cyan] [yellow]{spread:.3f}[/yellow]")

    return {'ask': lowest_ask, 'bid': highest_bid, 'spread': spread}


def get_trade_history(market: Market) -> Optional[List]:
    try:
        return market.market_history(1, 360, 0)
    except Exception as e:
        console.print(f"[red]Error retrieving trade history: {str(e)}[/red]")
        return None


def process_trade(trade: Dict) -> Optional[Dict]:
    if 'hive' not in trade or 'non_hive' not in trade:
        return None

    hive_data = trade['hive']
    non_hive = trade['non_hive']

    if float(hive_data['close']) <= 0:
        return None

    return {
        'price': float(non_hive['close']) / float(hive_data['close']),
        'hive_volume': float(hive_data['volume'])
    }


def calculate_vwap(trades: Optional[List]) -> Optional[float]:
    if not trades:
        console.print("[yellow]No trades in the last 3 minutes.[/yellow]")
        return None

    processed_trades = list(filter(None, map(process_trade, trades)))
    if not processed_trades:
        return None

    df = pd.DataFrame(processed_trades)
    return (df['price'] * df['hive_volume']).sum() / df['hive_volume'].sum()
```

