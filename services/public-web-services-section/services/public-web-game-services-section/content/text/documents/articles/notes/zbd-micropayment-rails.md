---
title: ZBD Micropayment Rails
description: "Family-wide specification for a ZBD Lightning payout adapter matching the existing flickering-delve-service PaymentProvider interface, a double-entry-enforced ads-fund-payouts policy engine, and per-game proof-of-play/anti-abuse design."
date-created: 2026-08-19
type: specification
authors:
  - claude-fable-5
---


This is a specification, not shipped code. It reads `flickering-delve-service/src/{ledger,payments,accounts}.mts`
and `DESIGN.md`/`README.md`/`ROADMAP.md`, `onestone-service/ROADMAP.md`, and the ZBD research
memo supplied alongside this task, and proposes how a **rewarded-play → Lightning payout** rail
fits the family's existing double-entry payments architecture without inventing a second one.

## 1. What already exists (read, not re-derived)

`payments.mts` defines one boundary, `PaymentProvider`, with three real implementations
(`mock`, `stripe`, `hive`) already ported to both `flickering-delve-service` and
`onestone-service`. Quoted verbatim from `flickering-delve-service/src/payments.mts`:

```ts
export interface Order {
  readonly id: string;
  readonly actor: string;
  readonly sku: string;
  readonly provider: string;
}

export interface IntentResult {
  readonly provider: string;
  readonly orderId: string;
  /** Provider-specific instructions for the client (client_secret, a memo+account, …). */
  readonly instructions: Record<string, unknown>;
}

export interface SettleResult {
  readonly cleared: boolean;
  readonly detail: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly configured: boolean;
  createIntent(order: Order, sku: Sku): Promise<IntentResult>;
  /** Verify the money moved. `evidence` is a webhook body (Stripe) or unused (Hive polls). */
  settle(order: Order, sku: Sku, evidence?: unknown): Promise<SettleResult>;
}
```

And the ledger primitives from `ledger.mts`:

```ts
export interface Posting {
  readonly account: string;
  /** Signed decimal as a string (e.g. "4.99", "-4.99") — exact, never a float. */
  readonly amount: string;
  readonly commodity: string;
}
export interface LedgerEntry {
  readonly date: string;
  readonly narration: string;
  readonly postings: readonly Posting[];
  readonly ref: string;
}
```

`AuditLedger.record()` refuses any entry whose postings don't net to zero per commodity, and
`AuditLedger.has(ref)` gives idempotency for webhook retries. Everything below is built as a
straight extension of this — not a parallel system.

## 2. Reusing the interface for the opposite direction of money

`PaymentProvider` was built for **charges** (player → game). A reward payout is a **credit**
(game → player). The interface's vocabulary — an `Order` is "the unit of value movement,"
`actor` is "the account it moves for," `sku` is "the priced unit that moves" — is symmetric
enough that a payout is structurally a charge with the ledger postings' sign flipped, so we
reuse `PaymentProvider`, `Order`, `IntentResult`, and `SettleResult` **unchanged**. Two small,
additive, non-breaking fields cover the asymmetry that does exist:

```ts
export interface Order {
  readonly id: string;
  readonly actor: string;
  readonly sku: string;
  readonly provider: string;
  readonly direction?: "charge" | "payout"; // NEW — optional; absent means "charge" (today's behavior, unchanged)
}

export interface Sku {
  readonly id: string;
  readonly name: string;
  readonly blurb: string;
  readonly priceUsd: string;
  readonly priceHive: string;
  readonly priceSats?: string;              // NEW — optional; reward tiers set it, purchase SKUs omit it
  readonly boost?: { readonly kind: "rate" | "offline"; readonly value: number; readonly durationSeconds: number }; // NEW — optional (was required); payout tiers carry no boost
}
```

Nothing in existing `stripeProvider`/`hiveProvider`/`Payments` code reads `direction` or
`priceSats`, and every existing `Sku` in `SKUS` already sets `boost`, so this is a type-level
widening only — `pnpm run check` on the existing files does not need to change to accept it.
We deliberately did **not** repurpose the `boost` field to smuggle payout metadata through
(e.g. `{kind:"rate", value:0}` as a sentinel) — an unused-but-required field masquerading as a
real value is exactly the kind of code-smell shortcut that reads fine until someone reads
`boost.value` for a payout order and gets a silent zero instead of a type error. Making the
field honestly optional is one line and costs nothing.

A parallel manager class, `Payouts` (mirroring `Payments`'s shape but posting the inverted
entries in §3), owns the payout side; it is not a mode flag on the existing `Payments` class,
because a charge and a payout have different idempotency keys, different ledger account
families, and different policy gates (§4) — forcing them through one class would mean every
method grows an `if (direction === "payout")` branch, the exact pattern §1 of the solitaire
design doc (and this family's whole payments boundary) exists to avoid.

## 3. The `zbd` provider

```ts
export function zbdProvider(
  apiKey: string | undefined,
  opts?: { readonly sandbox?: boolean; readonly baseUrl?: string },
): PaymentProvider {
  const configured = typeof apiKey === "string" && apiKey.length > 0;
  const base = opts?.baseUrl ?? (opts?.sandbox ? "https://sandbox-api.zbdpay.com" : "https://api.zbdpay.com");
  return {
    id: "zbd",
    configured,
    async createIntent(order, sku) {
      // order.direction === "payout": look up the actor's on-file gamertag / Lightning
      // Address (accounts.mts extension, §7), call POST v0/gamertag/send-payment with
      // sku.priceSats and order.id as an idempotency key, return the pending ZBD payment id.
    },
    async settle(order, sku, evidence) {
      // evidence: the ZBD webhook body. ZBD's current docs do not publish a webhook signing
      // scheme as concretely as Stripe's `t=…,v1=…` HMAC header (research §12 gap) — until
      // confirmed, settle() falls back to an authenticated poll of the payment-status
      // endpoint by ZBD payment id, the same "we can't trust the push, so we verify by pull"
      // posture the hive adapter already takes for on-chain settle.
    },
  };
}
```

This is intentionally the same three-part shape as `stripeProvider`/`hiveProvider`: a
`configured` flag gated on a credential being present, a `createIntent` that calls out and
returns client-safe instructions, and a `settle` that independently verifies clearance rather
than trusting a caller's assertion. Sandbox base URL and the sandbox-only test-user/KYC-outcome
endpoints from the research (§8 below) let this be exercised in CI without a real ZBD account.

## 4. Double-entry payout flow — the ads-fund-payouts invariant

The task's requirement — payouts can never exceed verified ad revenue — is enforced as **three
separate ledger entries**, each independently balanced, chained through one account,
`income:ads`. Sign convention follows the existing file: an asset increase is posted positive,
an income/liability increase is posted negative (mirroring `assets:cash:stripe +4.99` /
`income:premium -4.99` in the existing purchase flow).

**(a) Ad revenue recognized** (a batch settlement from an ad network, e.g. an AdMob/Unity Ads
payout report landing daily or weekly):

```
2026-08-19 * ad-network settlement: admob batch #4471  ; ref:ad-settle-4471
    assets:cash:ad-network:admob   118.32 USD
    income:ads                    -118.32 USD
```

**(b) Reward accrual** (a player's verified play — see §6 — earns reward-balance; no cash moves
yet, only the obligation is recognized, funded out of the ad-income pool):

```
2026-08-19 * reward accrual: onestone level-clear (actor delver-morgan)  ; ref:accrue-88213
    income:ads                      0.0027 USD
    liabilities:rewards:delver-morgan  -0.0027 USD
```

**(c) Payout clears** (the policy engine's batch sweep, §5, converts accrued liability into an
actual ZBD send once the minimum-batch threshold is met):

```
2026-08-19 * zbd payout: batch #91 (actor delver-morgan)  ; ref:payout-91-delver-morgan
    liabilities:rewards:delver-morgan   0.6800 USD
    expenses:zbd-fees                   0.0068 USD
    assets:cash:zbd                    -0.6868 USD
```

Each entry balances to zero on its own — `AuditLedger.record()` already guarantees that. The
*cross-entry* invariant ("we never accrue more liability than we've recognized in ad income")
is **not** something `record()` can see, since it only ever inspects one entry's postings in
isolation. That invariant is enforced by the **policy engine** (§5), which — before calling
`ledger.record()` on any accrual entry — checks `audit().balances["income:ads"]["USD"]` and
refuses the accrual if posting it would push that balance positive (i.e., would spend ad income
we haven't recognized yet). This is the honest version of "the ledger makes it an invariant":
the ledger makes any *violation* immediately, mechanically visible in the next `GET /audit` call
(a positive `income:ads` balance is definitionally a bug, not a judgment call) — but a human (or
policy-engine) decision still has to consult that fact before every accrual, the same way
`Payments.settle()` already consults `ledger.has(order.id)` before every charge. Double-entry
turns "did we overspend ad revenue" from a question you'd otherwise answer by trusting the
accrual code into a question `GET /audit` answers by arithmetic — that is the concrete, checkable
form of "invariant, not a hope," short of the (stronger, and worth roadmapping) step of making
`AuditLedger` itself refuse an entry that would violate a caller-supplied account-balance
constraint.

## 5. Payout policy engine

One module, `reward-policy.mts`, gates every accrual and every payout batch. It is the only
place that calls `Payouts.accrue()` / triggers a ZBD send — no game calls `zbdProvider` directly.

- **Ads-funded ceiling** — §4's `income:ads`-balance check, per accrual, globally (not just
  per-account): the family-wide reward program literally cannot spend money that hasn't been
  recognized as ad revenue.
- **Minimum-batch threshold** — individual accruals are pennies; a ZBD send per accrual would
  be fee-inefficient and, per the research (§12 gap 1), the exact fee schedule isn't even
  confirmed. Liability accumulates per-actor in `liabilities:rewards:<actor>` until it crosses a
  configurable floor (default proposal: 500 sats-equivalent) or a periodic sweep interval
  (default proposal: daily) fires regardless — mirroring ZBD's own Earn SDK design of
  decoupling *earned balance* from *cashable/paid-out amount* (research §6, §9), which we get
  for free because our accrual/payout split is already two separate ledger entries rather than
  one.
- **Per-account rate cap** — a hard ceiling on sats-equivalent accrual per actor per rolling
  24h, independent of how many accrual events they generate.
- **Per-IP rate cap** — a ceiling on accrual events (and on distinct actors accruing) per
  source IP per rolling window, to blunt one machine running many guest/account identities.
  This needs a field `accounts.mts` doesn't currently carry (it authenticates by handle/secret
  or guest token, never records request IP) — see §7.
- **Payout curve, diminishing** — reward-per-verified-play-unit is *not* flat; it decays as an
  actor's rolling accrual volume rises (a concrete shape: `reward(n) = base · n^-0.3` for the
  n-th unit in a rolling window, front-loaded per ZBD's own guidance in research §9). A human
  playing a normal session sits in the flat, generous part of the curve; a farm trying to
  maximize sats-per-hour by maximizing session count runs straight into the decaying tail —
  the curve's shape, not a blocklist, is the primary defense against volume botting (§6).
- **Country allow-list, separate from KYC** — checked at **accrual** time, not just at
  cash-out. The research is explicit (§7) that ZBD's Payments-API-ineligible country list (~99
  countries) is broader than its Earn-eligible list, and that geography can disqualify a player
  before any identity check even starts. Accruing sats-denominated reward-balance for a player
  in a country where they can never redeem it is a worse outcome than not accruing it — it's a
  liability we'd carry forever with no valid discharge path. For a player in a
  Payments-API-ineligible or unconfirmed region, accrual happens in a **non-convertible
  `POINTS` commodity** instead of `SATS` (same `liabilities:rewards:<actor>` account family, a
  different `commodity` string on the posting — the ledger already supports multiple
  commodities per account, per `imbalances()`'s per-commodity grouping), matching ZBD's own
  documented SATS-vs-POINTS per-project currency toggle (research §7).

## 6. Proof-of-play, per game — and why we skip a Quago-equivalent vendor

The ZBD research is blunt that ZBD does not solve gameplay-integrity itself and its own
integration guide treats a third-party vendor (Quago) as close to mandatory: reject any reward
if `inauth_playtime_percentage` or `emu_playtime_percentage` is nonzero (research §11). We do
not adopt an equivalent vendor, for a house-doctrine reason, not a cost-cutting one: **zero
external npm dependencies** means no new vendor SDK gets pulled into any of these services
regardless of how well-regarded it is, and — more importantly — every family game already
generates a deterministic, replayable record for reasons that have nothing to do with rewards:

| game | replay artifact (built for a non-reward reason) | what it proves |
|---|---|---|
| solitaire | the move-log (`solitaire-service/DESIGN.md` §"Move-log as the undo/redo stack") | replaying `log` from `deal(seed, variant)` reproduces the exact claimed final state — a win claim is either reproducible from legal moves or it's rejected, no client assertion trusted |
| onestone | cascade/validate logs already shipping in v1 (`onestone-service/ROADMAP.md`'s `validate.mts`/pebble-game machinery) | a level-clear replays deterministically from the level's seed + the player's move sequence; the same machinery that proves a level is *solvable* at generation time proves a claimed clear is *real* at reward time |
| weiqi | **not yet a family service** — named in this spec only because the task cited it as an example proof-of-play source. Prospective shape: a semantic event stream (move, capture, pass, scored-territory) that a Tromp–Taylor-style deterministic scorer replays independently of the client's claimed score, same pattern as the other two. Do not build against this row until a weiqi service actually exists. | (prospective) |
| flickering-delve | the world's event-sourced fact-trace (`DESIGN.md`: "State = world... exact snapshotWorld/restoreWorld documents round-trip it") | technically replayable — but see the adoption-order caveat in §8, this game is the wrong first candidate regardless |

Because each of these logs already has to be exact and replayable for a reason the game would
need *anyway* (undo/redo, deterministic level replay, save/restore), proof-of-play is a **free
rider** on infrastructure that already exists, verified server-side by the same replay function
the game uses for its own correctness, not a bolted-on fraud-detection subsystem with its own
false-positive/false-negative tuning problem. This is strictly narrower than what Quago promises
(it says nothing about device rooting, emulator detection, or motion-sensor humanness) — we are
explicitly trading vendor breadth for house-doctrine independence and accepting the gap that
leaves, closed instead by rate caps and the payout curve (§5) rather than device attestation.

## 7. Anti-abuse, assembled

```
verified ad-network SSV/settlement (§4a)
   -> gameplay event (a move-log entry / a cascade result / a semantic event) submitted server-side
   -> replay-verify against the game's own deterministic engine (§6) — reject if the log doesn't
      reproduce the claimed outcome
   -> reward-policy.mts: country allow-list -> per-account rate cap -> per-IP rate cap ->
      payout-curve reward calculation -> income:ads ceiling check (§4)
   -> ledger.record() the accrual entry (§4b)
   -> periodic sweep: minimum-batch threshold crossed? -> zbdProvider.createIntent/settle,
      ledger.record() the payout entry (§4c)
```

Why botting is unprofitable under this shape specifically: a farm's marginal cost per session
(device/emulator time, IP rotation, human-operator time to defeat any interactive gate) is
roughly constant per session, while its marginal *revenue* per additional session strictly
decays (the payout curve, §5) and is hard-capped per account and per IP regardless of curve
position. A legitimate player's small number of daily sessions sits entirely in the curve's
flat, generous region; a farm's whole value proposition is running *many* sessions, which is
exactly the region the curve punishes hardest. This is the same shape the solitaire daily-deal
gives for free (`solitaire-service/DESIGN.md`: one shared seed per UTC day is a natural,
zero-code-required rate boundary — there are only as many distinct daily deals per day as there
are variants, independent of any farming behavior).

`accounts.mts` needs one additive change to support the per-IP cap: it currently authenticates
by handle/secret or guest token only and records no request metadata. Proposal: the server
transport (`server.mts`, already the impure layer that terminates HTTP) passes the source IP
into `reward-policy.mts` alongside the authenticated actor id on any reward-eligible request —
this stays out of `accounts.mts`/`Accounts` entirely (identity and abuse-rate-limiting are
different concerns) and out of the pure engine modules, consistent with the existing split
between pure domain modules and the "one stateful/impure piece" (`scene.mts` in
flickering-delve, the transport in every service).

## 8. Regional and KYC constraints (from the research, carried forward)

- **KYC is deferred to first cash-out**, not to earning — a player accrues reward-balance
  freely; ZBD's own hosted flow (widget/SDK) handles identity verification only when a payout
  actually needs to clear, so our accrual path never has to build or hold KYC UI/data itself.
- **US: all states except New York.** A New York-resident player (or a player whose account
  region resolves there) accrues in `POINTS`, never `SATS`, per §5's non-convertible fallback.
- **International: Earn/App operate in 49+ countries**; the broader Payments-API-ineligible
  list (~99 countries, sanctions-adjacent) is the one that actually gates whether §4c's payout
  entry can ever clear, so §5's allow-list check must use the **Payments-API** list, not the
  narrower Earn list, or we'll accrue `SATS` liability for a player ZBD's own payout rail can
  never actually pay.
- **Withdrawal-limit tiers are not published** (research §7/§12) — treat the minimum-batch
  threshold in §5 as a value we tune empirically against real ZBD dashboard limits once an
  account exists, not a number this spec can finalize.
- **Fee schedule is unconfirmed** (research §5/§12) — the `expenses:zbd-fees` posting in §4c
  uses a placeholder rate; do not hardcode a fee percentage into `zbdProvider` without a current
  quote from ZBD, and keep the fee as a computed value read from the actual settle response
  where ZBD's API surfaces it, rather than an assumed constant.

## 9. Sandbox and testing

`zbdProvider(apiKey, { sandbox: true, baseUrl: "https://sandbox-api.zbdpay.com" })` exercises
the full flow against ZBD's documented sandbox: a sandbox API key distinct from production
credentials, a sandbox KYC-outcome endpoint that can force a guaranteed-approved test identity,
and a widget sandbox for the cash-out UX we don't build ourselves. Per the research, sandbox
Lightning payments are fully simulated at ZBD's platform layer (no real Lightning routing to
flake in CI) and webhook payload shapes match production, so `settle()`'s webhook path is
testable end-to-end without touching mainnet — the same "mock the boundary honestly" posture the
existing `payments.test.mts` already takes for Stripe's HMAC verification and Hive's RPC replay.
Tests for `reward-policy.mts` run entirely against `AuditLedger`/mock provider fixtures and need
no network at all: the ads-ceiling check, rate caps, and payout curve are pure functions of
ledger state and are unit-tested the same way `ledger.test.mts` tests `imbalances()`.

## 10. What we will NOT do

- **No wagering, ever, regardless of jurisdiction legality.** No chance-based payout
  multipliers, no RNG-outcome-scaled rewards, no "double or nothing" mechanic anywhere near this
  rail. A cascade's or a deal's own randomness (present in onestone and solitaire for reasons
  that have nothing to do with money) must never itself scale a payout — reward amount tracks
  *verified ad revenue share of verified play*, never a lucky outcome. This is a hard line, not
  a tuning knob.
- **No purchasable sats.** `payments.mts`'s existing charge flow (Stripe/Hive, boosts) and this
  payout flow never share a commodity a player can move between them. A player who wants to
  spend real money buys a bounded boost, in USD/HIVE, as today. A player who wants sats earns
  them through verified play. There is no exchange rate between "money I paid" and "sats I can
  claim" — collapsing that distinction is what turns a rewards program into a wagering product.
- **Earn-only, non-transferable.** No player-to-player transfer of accrued reward-balance
  inside the family surface. Concentrating many small legitimate accruals from many
  identities into one cash-out identity (payout laundering) is exactly what a P2P transfer
  primitive would enable for a Sybil farm; we simply don't build one.
- **No pre-KYC dollar-value framing.** We don't headline "worth $X" before a payout has
  actually cleared identity/verification — reward balance displays as a count (sats or points),
  not as a promised cash value, to avoid characterizing an unrealized liability as a settled
  asset the player already owns.
- **No custody claim beyond ZBD's own licensed rail.** ZBD holds the FinCEN MTL/MiCAR
  licensing (research §1); this family does not independently custody player funds. The
  `liabilities:rewards:<actor>` account is an **internal accounting obligation** ("we owe you
  this, and will initiate a ZBD send for it"), not a claim of holding funds in trust outside
  ZBD's own systems. This spec flags that boundary; it does not resolve the compliance question
  of whether an accrued-but-unpaid liability itself needs separate regulatory treatment — that's
  a real open item for whoever signs off on shipping this, not something this document can
  settle.

## 11. Family adoption map

1. **onestone-service — first, and the natural flagship.** It already ports `mock`/`stripe`/`hive`
   `PaymentProvider` (per its own `ROADMAP.md`), already has deterministic per-level replay and a
   validate/pebble-game machinery well-suited to proof-of-play (§6), and its own roadmap
   *explicitly* lists "Rewarded ads (post-v1)... requires an ad-network integration decision"
   as deferred work. This spec's §4/§5/§6 is precisely that decision. Needed before it can adopt:
   the ad-network SSV wiring (`ROADMAP.md` doesn't yet specify which network), `reward-policy.mts`,
   and `zbdProvider`.
2. **solitaire-service — second, close behind.** Its move-log (doc: `solitaire-service/DESIGN.md`)
   was designed from the start to double as proof-of-play evidence, and the daily-deal seed gives
   a free, code-free rate boundary (§7). It needs the same three new modules as onestone plus, since
   it doesn't exist yet, the base service itself (see the companion design doc). Per-session value
   is small, so it leans hardest on the minimum-batch-threshold accrual model (§5).
3. **flickering-delve-service — deliberately not yet, and possibly not as-is.** This is the
   honest, non-obvious finding of this spec: flickering-delve's entire design thesis is that
   *legitimate automation is the endgame* ("the interface stopped being about playing the game;
   it became about strategizing the play" — its own `README.md`). A bot farm running an idle
   loop unattended and a legitimate player running their own tuned standing-order Lisp program
   unattended produce **structurally identical event streams** — the exact signal
   (`inauth_playtime_percentage`, session-timing regularity) that other games' anti-abuse
   sections lean on doesn't discriminate here, because the thing anti-bot systems normally flag
   (long unattended automated play) is this game's stated selling point. Adopting the rail here
   without addressing that would either (a) reward idle/automated ticks and hand a farm a script
   that's indistinguishable from a "good" player's automation by design, or (b) exclude idle
   ticks from reward eligibility entirely and restrict accrual to genuinely-interactive moments
   (manual delve clicks, live strategy edits) — which is workable but shrinks the reward surface
   to a small slice of the game's actual playtime and needs its own design pass, not a checkbox
   on this spec. Recommendation: skip flickering-delve in the initial rollout; revisit only with
   an explicit interactive-moments-only reward-eligibility design.
4. **weiqi — prospective only.** No such service exists in the family today (confirmed by
   directory listing at time of writing). Included in §6's proof-of-play table only because the
   task named it as an example event source; nothing here should be read as weiqi being planned
   or scheduled — it's a placeholder for what "semantic events" would need to mean if and when a
   weiqi service is proposed.

## 12. Open gaps to close before any of this ships (carried and extended from the research)

1. Exact ZBD fee schedule (§8) — the `expenses:zbd-fees` computation in §4c needs a real number.
2. Numeric withdrawal-limit tiers by KYC level (§8) — needed to set §5's minimum-batch threshold
   sanely rather than by guess.
3. ZBD's actual webhook signing scheme for payout-status pushes — §3's `settle()` currently
   defaults to poll-based verification because the research could not confirm a Stripe-equivalent
   HMAC header exists; confirm directly with ZBD before relying on push webhooks in production.
4. Whether `AuditLedger` should grow a caller-supplied balance-constraint check (§4's closing
   note) so the ads-funded invariant is enforced by the ledger itself rather than by every caller
   remembering to check `audit()` first — worth a follow-up design, not required for v1.
5. Who signs off on the custody/compliance boundary in §10's last bullet before `liabilities:rewards`
   accounts are allowed to hold real, non-trivial balances in production.
