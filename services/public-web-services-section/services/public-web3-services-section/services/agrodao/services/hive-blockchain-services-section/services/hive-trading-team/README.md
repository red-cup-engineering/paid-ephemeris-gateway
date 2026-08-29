# Hive Trading Team

A xiaowei (RenDanHeYi micro-enterprise) inside AGRODAO. Its order — the need
that constitutes it, per `emsenn/schema/micro-enterprise` — is not a budget
line or a manager's assignment. It is Hive's own market, which continuously
manufactures the imbalances this team exists to close: a curation reward
minted every block and allocated to whoever votes early and well on the
right posts, and a lattice of cross-venue and cross-token prices (internal
HIVE/HBD, Hive-Engine markets, AMM pools) that drift out of mutual agreement
faster than anyone arbitrages them back. Both are the same shape of thing —
a nonzero holonomy around a cycle of otherwise-locally-valid prices — and
this team's job is to find that holonomy and discharge it, converting a
coordination failure the market already prices in money into HIVE, HBD, and
Hive-Engine tokens actually held.

## Two levers, one law

- **Voting** — curation reward is a fixed pool of new tokens minted each
  block and split pro-rata among whoever voted early enough, on posts
  under-priced relative to their own attention-graph neighborhood. This is
  competition over a mint, not investment in a static asset. The Voting v2
  analysis math (spectral mispricing, Forman-Ricci bridges, cycle-space
  cartel detection, HF25-exact timing, KL content novelty) lives in
  Aagaard's `src/analysis/` and is this lever's realization.
- **Trading** — cross-venue and cross-token price divergence is arbitrage in
  the literal cohomological sense the firm's own Distal Bypass note names:
  log-prices around a market form a 1-cochain, no-arbitrage means that
  cochain is a coboundary, and a nonzero circuit integral around a cycle of
  prices *is* the arbitrage profit. Aagaard's `src/analysis/holonomy.mts` is
  this lever's realization: it builds the cross-venue price graph and
  computes the holonomy of every fundamental cycle directly, rather than
  only checking pairwise corridors.

## The one hard constraint

Posting and gaming are never automated by this team, full stop — not a
policy this team enforces by discipline, but a lock the code already
carries (`LOCKED_CAPABILITIES` in Aagaard's core adapter). This team's
charge is "make our existing Hive holdings earn more," restricted
categorically to voting and trading. A locked draft is as far as a posting
or gaming opportunity ever gets without a human's own hand on it.

## Realization

This directory is the team's organizational and design home — its office
seats in AGRODAO's own roster (`content/offices/hive-trading-team-lead.json`),
scoped here by jurisdiction. The executable realization of both levers lives
in Aagaard's own `src/analysis/`, a sibling sovereign node this team's
strategy is delivered through rather than a separate codebase this team
maintains in parallel — module-developer's own rule that a unit's design and
its code are one act, not two.

## Capital mandate split

This team no longer acts as a direct allocator or executor. The
`sigmund-hive-arbitrage-enterprise` owns liquid-capital arbitrage and produces
the reserve declaration. The `help-hive-liquidity-enterprise` owns pool
deployment and may consume only the exact surplus that remains after that
declaration. AGRODAO's treasury steward admits the combined capital decision;
Aagaard consumes only its expiring execution envelopes. Voting analysis remains
here until a dedicated curation enterprise succeeds it.

## Theory basis

- The agentic-metro-enterprise / RenDanHeYi xiaowei model: a unit constituted
  by the user (here, a market) it faces at zero distance, not a department
  wearing the name.
- The Distal Bypass (2026-07-16): coordination failure as measurable,
  priced, thermodynamic obstruction; arbitrage as holonomy on a cycle of
  prices; no-arbitrage as a coboundary condition.
- The Fundamental Theorem of Asset Pricing (Delbaen-Schachermayer): no
  arbitrage is equivalent to the existence of an equivalent martingale
  measure — the classical form of the same coboundary condition, arrived at
  independently of the firm's own cohomology corpus.
- HF25 ("Equilibrium", 2021-06-30): the chain-exact curation reward window
  this team's voting lever is measured against.
