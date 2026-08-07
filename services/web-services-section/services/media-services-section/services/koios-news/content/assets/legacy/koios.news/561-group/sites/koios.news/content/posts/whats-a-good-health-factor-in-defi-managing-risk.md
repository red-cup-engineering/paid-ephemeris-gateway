---
title: "What's a Good Health Factor in DeFi? Managing Risk"
date: 2025-02-19
draft: false
author: "Nik Koios"
slug: "whats-a-good-health-factor-in-defi-managing-risk"
description: "Your health factor is the single number standing between your DeFi loan and liquidation. Here's what it means, and what it quietly assumes."
summary: "In DeFi lending, the health factor is the number that decides whether your collateralized position is safe or about to be liquidated. This covers how it works on Aave versus Morpho, what counts as a safe buffer, and why a single tidy metric can hide the messy assumptions that fail in a crash."
keywords: ["health factor"]
categories: ["Economy"]
tags: ["health factor", "lending", "Morpho"]
references:
  - type: "webpage"
    title: "Aave"
    container-title: "Aave"
    id: "aave"
    URL: "https://aave.com/"
  - type: "webpage"
    title: "Morpho"
    container-title: "Morpho"
    id: "morpho"
    URL: "https://morpho.org/"
license: "CC BY 4.0"
license_url: "https://creativecommons.org/licenses/by/4.0/"
syndication_rights: "Licensed under Creative Commons Attribution 4.0 International; Koios.News permits indexing, snippets, large image previews, feed distribution, Google Search/News/Discover surfaces, and other attributed downstream syndication."
koios:
  seo_term: "health factor"
  beat: "crypto-finance"
  tweet: "Your DeFi health factor looks like a safety gauge. It's really a bet that prices move smoothly, oracles stay honest, and liquidations stay orderly. Crash days break all three."
  original_permalink: "https://koios.news/2025/02/19/whats-a-good-health-factor-in-defi-managing-risk/"
---

In the world of decentralized finance (DeFi), maintaining a **good health factor** is crucial to avoiding liquidations and keeping your positions secure. Whether you’re borrowing against stablecoins or more volatile assets like ETH or BTC, understanding what constitutes a **good Aave health factor** or a **good Morpho health factor** can help you optimize risk and returns.

## What Is a Health Factor?

The **health factor (HF)** is a number that represents how safe your collateralized loan is. It’s calculated based on the value of your supplied assets versus your borrowed assets, factoring in the liquidation threshold of each asset.

- **HF above 1**: Your position is safe (for now).
- **HF at 1**: You’re at the edge of liquidation.
- **HF below 1**: Liquidation happens automatically.

### What’s a Good Health Factor?

The ideal **health factor** depends on the assets involved.

#### Stablecoin Positions: Keep It Low but Safe (1.1 - 1.5 HF)

If you’re borrowing against [stablecoins](https://koios.news/tag/stablecoin/) (like [USDC](https://koios.news/tag/usdc/) or [DAI](https://koios.news/tag/dai/)), a **safe health factor** can be relatively low—**1.3 or even lower**—because stablecoins have minimal price volatility. However, keeping it above 1.2 is recommended to avoid liquidations from fees or sudden changes in collateral weight.

#### ETH & BTC as Collateral: Moderate Safety (1.5 - 2.0 HF)

Ethereum ([ETH)](https://koios.news/tag/eth/) and Bitcoin ([BTC](https://koios.news/tag/btc/)) are more volatile than stablecoins, so a **good Aave health factor** or **good Morpho health factor** for these assets should be higher—**1.5 to 2.0**. This gives you some buffer against price swings while still optimizing capital efficiency.

#### Altcoins & High-Volatility Assets: Play It Safe (2.0+ HF)

If your collateral includes high-volatility assets like memecoins, DeFi tokens, or low-liquidity assets, **a safe health factor would be 2.0 or higher**. Sudden drops in value could wipe out your position if you’re too close to liquidation. And the more volatile your assets, the more closely you should be watching your position.

## Health Factors on Aave vs. Morpho

- **Aave [@aave]**: The traditional lending market uses liquidation thresholds and fixed health factor calculations. **A good Aave health factor is usually 1.5+** for ETH and BTC, while **1.3+ is acceptable for stablecoin-backed loans**.
- **Morpho [@morpho]**: As a peer-to-peer optimized lending protocol, Morpho may allow slightly more efficient borrowing with better rates, but **a good Morpho health factor still follows similar risk levels**—**1.5+ for ETH/BTC, 2.0+ for volatile assets**.

## Best Practices for Maintaining a Good Health Factor

1. **Monitor Market Conditions**: If your collateral is dropping, be proactive about repaying debt or adding more collateral.
2. **Set Alerts**: Use automation tools like DeFi Saver to notify you when your HF gets too low.
3. **Use Low-Liquidation-Threshold Assets**: Some assets are riskier due to their liquidation parameters—check Aave or Morpho’s docs before borrowing.
4. **Consider Looping Strategies Carefully**: Borrowing and supplying recursively (e.g., with stETH or rETH) can optimize yield, but always leave room for market swings.

## Final Thoughts

A **good health factor** varies depending on your assets, platform, and risk tolerance. For **stablecoins, 1.3 is often fine**, but **for volatile assets, 1.5-2.0+ is safer**. Whether you're on **Aave, Morpho, or another DeFi lending platform**, understanding these nuances can help you avoid costly liquidations while maximizing your capital efficiency.

## What the Health Factor Hides

A health factor is a comforting number because it is a single number.
One figure, updated live, telling you how far your position sits from liquidation.
But the comfort is partly an illusion of precision, and it is worth understanding what that tidy metric quietly assumes in order to stay tidy.

The health factor is computed from the value of your collateral against the value of your debt, and "value" is where the assumptions hide.
That value comes from a price oracle, and the protocol trusts it implicitly.
On a calm day, the oracle tracks the market and your health factor means what it says.
On a volatile day, prices can move faster than liquidity can absorb, oracles can lag or be manipulated, and the number on your screen can be stale at exactly the moment it matters most.
A health factor of 1.5 feels safe until the asset underneath it drops twenty percent in a span too short for you to react—and the liquidation that the metric was supposed to warn you about has already fired.

Read through collapse, the real fragility is not in any one position but in what happens when everyone's health factor deteriorates at once.
Liquidations are supposed to be orderly: when a position crosses the line, liquidators step in, repay the debt, and take the collateral at a discount.
That mechanism assumes there are willing liquidators, deep enough markets to sell the seized collateral into, and gas cheap enough to make the whole thing worth doing.
In a genuine crash, all three can evaporate together.
Collateral gets dumped into thin markets, prices gap lower, and the falling prices push still more positions underwater—a cascade where each liquidation makes the next one more likely.
So the honest answer to "what's a good health factor" is: higher than you think you need, especially in the assets most likely to gap.
The metric is a useful daily gauge.
It is not a promise, and it is least reliable on the one kind of day it was built for.
