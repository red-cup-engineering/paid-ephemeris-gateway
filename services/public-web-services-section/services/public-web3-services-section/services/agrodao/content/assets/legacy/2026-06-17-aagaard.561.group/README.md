# @emsenn/aagaard

Autonomous on-chain agentic operations platform for the Hive wallet fleet.

Aagaard orchestrates the accounts in `~/.config/blockchain/hive/` across four capability lanes — two operational, two prepared-but-locked — and exposes a control plane and observability surface over HTTP.
It is built almost entirely by *composing* the upstream Hive computing pipeline; the platform's own code is the orchestration, gating, persistence, and transport around it, plus one frontier overlay (the alpha radar).

## What runs

One process (`src/serve.mts`, port 18807) serves:

1. **The Propolis read surface** — `GET /agents/:account/{curation,market,wallet}`, the upstream read morphisms, unchanged.
2. **The operator WebUX** at `/ui` and **the operations control plane** at `/ops` — both behind the ecosystem Google-OAuth gate (below).
3. **The autonomous orchestrator loop** — every `cadenceSeconds` it plans and (gated) executes the operational lanes per account, scans for incentive offers, composes locked analysis drafts, and records the raw substrate.

### The lanes

| Lane | State | What it does |
|---|---|---|
| **voting** | operational | Claims a share of each block's content-reward mint by curation. Each wallet votes **in character** (Voting v3, below): it assembles its own feed slice, runs the upstream curation knapsack (`fetchCurationRun`) over exactly that assemblage **and the full Voting v2 intelligence**, then broadcasts the funded votes ordered by its own objective-weighted alpha (gated). |
| **trading** | operational | Reads the internal HIVE/HBD book, the Hive-Engine token books, and the AMM pools (`fetchMarketRun`), proposes orders judged on executable edge-vs-slippage (`inferTrades`/`inferLp`/`judgeIntent`), and broadcasts the judged-good ones (gated; live only on the sandbox account). Computes the cross-venue **liquidity map**. |
| **incentive** | operational (gated) | Scans the same feed for "do X, get Y" bounties, values + scam-filters them, and routes each to **auto-execute (opt-in, gated, non-posting only)** or the **human arbitration gate** (ignore / llm-draft / manual). A second reward channel beyond curation. |
| **posting** | **prepared, LOCKED** | Composes complete signable drafts — operations notes, the daily analysis posts, and incentive responses — and refuses to broadcast. `posting` is in `LOCKED_CAPABILITIES`; only a human editing source unlocks it. |
| **gaming** | **prepared, LOCKED** | Detects which on-chain games each account plays (Splinterlands, Rising Star, dCity, Hashkings) from its Hive-Engine balances and plans the routine move, then refuses to broadcast. Same lock. |

### Voting v3 — voting in character

The corpus argues Hive is already a concurrent idle game and that **a small wallet plays a different game than a whale** — it cannot move payouts, so its edge is discovery, conversation, community-fit and early signal, while a specialised wallet hunts mispricing across the whole field (`content/library/arts/ludics/ games/.../hive-as-game.md` §10; the Hivekeeper player fantasies — curator, gardener, archivist, scout, public-interest analyst, steward).
Voting v3 makes each wallet a **player with a strategy aligned to the type of wallet it is** (`src/strategy.mts`).
A strategy is exactly two things:

1. **A feed assemblage** — which slice of the chain the wallet watches: the main
   trending field, its own following feed, specific community feeds (`hive-NNNNN`),
   bare tags, and named users' blogs. These project to the upstream
   `FeedSource[]` that `fetchCurationRun` assembles into one deduplicated
   candidate field, and the alpha radar then scores the **same** field — one
   field for both, no second fetch. (`computing-with-hive/scripts` gained an
   explicit `feeds` assemblage option and now returns the assembled `rawPosts`;
   capability exposed, not re-rolled.)
2. **An objective** — how the wallet re-weights the upstream composite
   `expectedAlpha` toward what it values (underrecognition, community-fit,
   conversation, durability, bridges, quality, cartel-aversion). The knapsack and
   the Voting v2 intelligence stay authoritative; the objective is a bounded
   multiplier on top, so the same field yields a **different ranking per
   character**.
3. **A pacing** — how the wallet spends its scarce, regenerating voting mana. The
   corpus is emphatic that Hive is an idle game where *"doing nothing is a valid
   action"* and one should vote only when *"a high-confidence recommendation is
   available"*, not because the manabar is full (`hive-as-game.md` §4, §10). So a
   wallet casts **at most one vote per tick — the single best opportunity — and
   only if it clears a conviction bar**; otherwise it waits and lets mana
   regenerate. Three gates, in order:
   - **husband mana** — abstain when voting power is below the wallet's floor, so
     every vote it does cast lands at high power and stays HP-meaningful;
   - **dust floor** — abstain when the account's Hive Power is so low that even a
     full vote is dust (earns nothing): tiny wallets wait rather than waste mana;
   - **conviction** — the best candidate must out-score the field's typical
     candidate by the wallet's conviction factor, be a genuine sink with positive
     captured alpha, and not be a cartel/flag-war trap.

Each vote it does cast is **full character weight** — big enough to earn, HP-scaled by construction (rshares ∝ current mana × weight).
Pickier wallets (higher conviction, higher power floor) vote rarely and husband hard; aggressive ones act on the clearest sink most ticks.
The tick readout reports the decision each wallet made — *voted on conviction*, or *waited, and why*.

The fleet's seeded characters (all overridable in `aagaard.config.json`):

| Wallet | Archetype | Watches | Votes for |
|---|---|---|---|
| `sigmund-vexler` | alpha-hunter | the whole trending field | deepest underpriced sinks, bridges, durable edge |
| `help-fund` | patron-steward | LeoFinance/STEMGeeks communities + finance/dev tags | well-sourced, well-discussed work inside them |
| `emsenn0` | curator | own following feed + main field | balanced quality-first read |
| `essiebee` | gardener | gaming communities + gaming tags | durable, well-discussed community posts |
| `marshian` | scout | gaming/art/writing/photography tags | cross-community bridge posts the graph hasn't priced |
| `michael561` | archivist | own feed + trusted authors' blogs | durable, high-provenance work; conservative |

`GET /ops/strategies` returns every wallet's character (static, no chain reads); `GET /ops/strategy/:account` returns one wallet's character plus the live ballot it would cast right now.
A per-account `strategy` block in `aagaard.config.json` retunes any feed-assemblage field or objective weight — redirecting a wallet's votes toward different feeds or values without touching code.

### Voting v2 — the composite intelligence

Curation votes are no longer ordered by flat sink-deficit.
Each candidate post is scored by a composite **expected captured-alpha** that folds in, all in feasible native arithmetic over the raw `active_votes`/reward/tag substrate:

- **spectral decay** (`analysis/spectral`) — the Laplacian Fiedler value λ₂ and mispricing half-life: how fast the edge self-corrects (max-alpha Layer 4);
- **vote-timing diffraction** (`analysis/timing`) — the chain-exact HF25 curation window (full in the first 24h with **no** early-vote penalty, ½ in the 24–72h mid window, ⅛ in the 72h–7d late window, 0 once paid — taken directly from the upstream `curationWindow`/`curationPenaltyDivisor`) × an inter-arrival spectrum that flags automated cartel vote-trains;
- **reward route** (`analysis/reward`) — beneficiary skim + curation saturation: what a marginal vote *actually captures*;
- **cohomology** (`analysis/graph`) — co-vote cycle space b₁: curation cartels;
- **curvature** (`analysis/graph`) — Forman–Ricci bridges: high-reach, low-competition cross-community posts;
- **persistent homology** (`analysis/graph`) — durability of a sink over a reward-threshold filtration;
- **content fitness** (`analysis/content`) — KL topic-novelty gated by focus;
- **signed votes + engagement** (`analysis/signals`) — downvote frustration (a flag-war trap) and comment-tree branching;
- **sheaf layer-disagreement, Kirchhoff optimal weight, reflexive λ₂ discount** (`analysis/intelligence`) — payout-vs-endorsement gluing obstruction, the vote weight that restores ∂f=0, and the discount for taking alpha that closes the gap it harvests.

`GET /ops/intelligence/:account` returns the full read; the headline numbers ride in every tick readout.

### Safety gating (composed by AND)

An op broadcasts iff **live** AND **capability-enabled** AND (for trades) the account is **trading-live**.

- `live` defaults **false**: the platform runs, reads, plans, computes the alpha radar and trade judgments, and records *what it would do* — signing nothing — until a human arms it (`AAGAARD_LIVE=1` or `POST /ops/arm`).
- `posting` and `gaming` are **locked**: never enable-able at runtime; their executors throw by construction.
- Only `sigmund-vexler` carries `tradingLive` — the one account sanctioned for live financial action.
  Every other account is propose-only on the trading lane even when the fleet is armed.

### The OAuth gate and the WebUX

`/ops` and the WebUX at `/ui` are confined to the operator the same way every other 561 surface is: the ecosystem `@emsenn/organizing-with-the-web/oauth-google` authorization server (Google IdP, single `allowedEmail`).
`/oauth/*` and the RFC 8414/9728 well-known metadata are public; `/ui` is a public shell that runs the browser PKCE flow against them; every `/ops/*` call is bearer-gated by the server's own `validateToken` confined to the allowed email — otherwise `401` with the RFC 9728 `WWW-Authenticate` challenge (`403` for a wrong-email token).
The WebUX drives arm/disarm, pause/resume, capability toggles, the alpha radar, and the incentive arbitration queue.

### Control plane (`/ops`, bearer-gated)

```
GET  /ops                      fleet status (live, running, enabled, accounts)
GET  /ops/health               liveness
GET  /ops/capabilities         per-lane state (enabled / locked)
POST /ops/capabilities/:cap/:action   enable|disable an UNLOCKED lane (403 on locked)
POST /ops/arm | /ops/disarm    allow / forbid broadcasts fleet-wide
POST /ops/pause | /ops/resume  stop / start the loop
POST /ops/tick                 run one cycle now, return the readout
GET  /ops/last                 most recent fleet readout
GET  /ops/ticks?limit=N        recent fleet ticks
GET  /ops/alpha/:account       the live alpha radar for one account
GET  /ops/intelligence/:account   the full Voting v2 composite
GET  /ops/liquidity/:account   cross-venue liquidity map
GET  /ops/incentives           the incentive arbitration queue
POST /ops/incentives/:offerId/:choice   disposition (ignore|llm-draft|manual)
GET  /ops/drafts/:account      the LOCKED analysis-post drafts, for review
```

### The historic ledger and analysis posts

Every metric is a function of on-chain state at a moment, so the loop logs the **raw substrate** append-only under `data/history/` (`history.mts`): candidate posts with tags/payouts/beneficiaries, the per-post `active_votes` rows (voter, rshares, timestamp — the diffraction/curvature substrate), the three-venue market microstructure, and per-account stake/mana.
From it, two **locked** daily drafts are composed (never broadcast): `@help-fund`'s Hive-Engine liquidity report and `@sigmund-vexler`'s spectral state of Hive.

## Composition, not reinvention

The intelligence is upstream; Aagaard does not re-roll it.

| Concern | Upstream surface used |
|---|---|
| Reads, signing, broadcast | `@emsenn/computing-with-hive/client` (`HiveComputer`) |
| Curation knapsack (the vote allocation) | `@emsenn/computing-with-hive/scripts` `fetchCurationRun` → `decide()` |
| Market read + trade inference + execution | `@emsenn/computing-with-hive/scripts` `fetchMarketRun`, `inferTrades`, `inferLp`, `executeTrades`, … (over `@emsenn/trading`'s `judgeIntent`) |
| Per-cycle metrics record | `@emsenn/computing-with-hive/scripts` `appendTickSnapshot` |
| Block-emission model (the resource) | `@emsenn/computing-with-hive/organizing/emission` |

To surface the upstream run functions cleanly, `@emsenn/computing-with-hive/scripts` was extended to export its operations vocabulary (`fetchCurationRun`, `fetchMarketRun`, the trade functions, the tick recorders) rather than keeping them private — exposing existing capability, not duplicating it downstream.

### The one deliberate reimplementation

`src/alpha-radar.mts` computes the mispricing energy `E(r)` and the capturable sinks itself, in native numbers, rather than calling the upstream `computing/analysis` functionals.
Those upstream functionals are exact but run on `@emsenn/relating`'s **unary-Peano** `Rational`; `E(r)` sums tens to hundreds of terms whose denominators multiply, so the value becomes an astronomically large unary natural and the computation never returns.
This is the same infeasibility the `computing/emission` module documents and the same fix it made: keep the formula and meaning verbatim, evaluate it in feasible arithmetic.
The math (Dirichlet energy, Laplacian harmonic deviation) is identical.

## Meeting / beating the class

**vs AI-assisted blockchain trading platforms.** Aagaard reads three venues at once (internal order book, Hive-Engine books auto-detected from real balances, AMM pools), judges every order on the *executable* order-book walk (edge minus realised slippage) rather than a naive mid-price, allocates capital as an exact budgeted knapsack, manages liquidity (HBD→savings, LP compounding), and executes through a hardware-grade signing boundary — all per-account, gated, dry-run by default, and recorded as an auditable JSONL ledger.
The propose/execute split and the live-only-on-sandbox envelope are stronger risk controls than typical retail trading bots ship.

**vs autonomous social-media agents.** Ordinary curation bots score posts in isolation and vote a flat top-N.
Aagaard runs the curation knapsack *and* the **spectral alpha radar** (`max-alpha.md`): it reads the reward field over the attention graph, surfaces posts priced **below their tag-cohort** (capturable sinks), measures the field's total mispricing energy and its fragmentation (durable-alpha signal), and orders the funded votes deepest-sink-first.
It posts nothing autonomously (posting is locked), exactly as required.

**Next-generation edge.** The radar is the scalar shadow of a much larger, corpus-grounded program (see the `Voting v2` task list): a **sheaf Hodge Laplacian** over the multilayer field (attention≠endorsement≠reward≠quality≠ governance≠capital), the **Kirchhoff missing-edge** solve that *derives* the optimal vote, **H¹ cohomology** cartel detection, **Ollivier/Forman–Ricci curvature** for bridge/bottleneck discovery, **persistent homology** for durable vs transient alpha, **vote-timing diffraction** as a bot/cartel authenticity radar, and **stochastic-control/mean-field** mana policy with the reflexive spectral correction.
Each is grounded in a specific `@emsenn/relating` operator (`analysis/laplacian`, `analysis/conservation`, `cohomology`, `sheaf`) and a specific research memo under `content/triage/2026/06/`.

## Configuration

`propolis.config.json` names the fleet (shared with the read surface).
`aagaard.config.json` is the operational overlay: `live`, `enabled` lanes, `cadenceSeconds`, and per-account risk envelopes.
Locked lanes can never be enabled there.
Keys are read from `keyRoot` (`~/.config/blockchain/hive`) and enter the process only in `src/fleet.mts`.

## Run

```sh
pnpm --filter @emsenn/aagaard run check    # typecheck
pnpm --filter @emsenn/aagaard run serve    # dry-run (live=false): reads, plans, records, signs nothing
AAGAARD_LIVE=1 pnpm --filter @emsenn/aagaard run serve   # armed
```
