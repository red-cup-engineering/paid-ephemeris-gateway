---
title: "M21 — Substrate-Native Token Economy (Six Domains, One Algebra)"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: speculative
depends-on: [m17-561-productivity-stack, m5-agential-self-generation, m10-cost-and-energy-ledger-extension]
goals:
  - agent-bank-accounts-as-substrate-cells
  - capability-inventories-as-substrate-assets
  - xp-as-revenue-in-office-ledger
  - reputation-staking-and-slashing
  - inter-agent-capability-market
  - certification-as-content-addressed-predication
  - polity-as-dao-substrate-record
theory-basis: [monetary-cost-as-quantale-extension, office-as-fuzzy-cell, federation-by-value-domain-join, double-entry-operational-accounting]
prior-art:
  - engineering-archive/operations/command/ideas/triage/token-economy-from-predication.md
  - engineering-archive/operations/command/ideas/triage/double-entry-operational-accounting.md
backing-gaps:
  - pyfars/objects/token-balance-cell.md (NOT YET AUTHORED — office token balance as substrate predication)
  - pyfars/objects/capability-inventory-record.md (NOT YET AUTHORED — office capabilities and achievements as substrate assets)
  - pyfars/objects/reputation-stake-record.md (NOT YET AUTHORED — plan commitment with slash condition)
  - pyfars/objects/capability-market-record.md (NOT YET AUTHORED — supply/demand fiber for inter-office capability exchange)
  - pyfars/objects/achievement-cell.md (NOT YET AUTHORED — content-addressed certified predication)
  - pyfars/morphisms/staking-reputation.md (NOT YET AUTHORED)
  - pyfars/morphisms/slashing-stake.md (NOT YET AUTHORED)
  - pyfars/morphisms/computing-capability-price.md (NOT YET AUTHORED — respond(supply-fiber, demand-fiber))
acceptance: "Each active office has a token balance tracked as substrate cells. Completing a dispatchable workitem emits a revenue cell crediting the completing office. An API invocation emits an expense cell debiting the invoking office. At least one capability market exists (e.g. research-officer produces library terms consumed by operations-officer) with a price computed via respond(supply-fiber, demand-fiber). An office commits reputation to a plan; on plan failure, the slash closure rule fires and the reputation cell decrements. All six convergence claims (messaging = accounting = gamification = token economy = certification = DAO governance) are documented as substrate invariants with accompanying closure rule records."
---

# M21 — Substrate-Native Token Economy

The predication algebra is **simultaneously** a messaging substrate, an accounting ledger, a gamification engine, a token economy, a certification system, and a DAO governance framework.
These are not analogies.
They are six views of the same ⊙/⇒ algebra over the predication graph.
When two fibers compose, the composition is a message delivery, an accounting transaction, a game event, a token transfer, a certification issuance, and a governance act — depending only on what the fibers represent.

[M10](m10-cost-and-energy-ledger-extension.md) extends the cost quantale to physical dimensions; [M17](m17-561-productivity-stack.md) gives the captain UI surface.
M21 unifies those surfaces into a single substrate discipline: agent offices have bank accounts, capability inventories, and reputation stakes, all grounded in substrate cells and governed by closure rules.

## What's built

### Six-domain convergence table

The foundational claim M21 makes operational:

| When the fiber represents | The composition is | The settlement is |
|---|---|---|
| Messages | Communication | Delivery |
| Transactions | Exchange | Balance |
| Game mechanics | Play | Progression |
| Tokens | Payment | Clearing |
| Certificates | Attestation | Verification |
| Governance | Deliberation | Ratification |

One algebra.
Six domains.
No domain-specific code.
M21's implementation discipline: every feature must be derivable from the algebra, not added as a special case.

### Agent bank accounts

Each office's **token balance** is a substrate cell: `(office:foo, token-balance, <value>, t)`.
The balance is not a database column or a Python dict entry.
It is a predication with first-class provenance, federable via [M6](m6-federation.md)'s cellwise merge, readable by closure rules.

The balance arithmetic uses the same double-entry discipline M10 established for cost-quantale ledgers: - **Earning tokens** = completing a dispatchable workitem → revenue cell credited to the completing office - **Spending tokens** = consuming an API invocation → expense cell debited from the invoking office

The ledger is the event log.
The balance is the running sum of revenue and expense cells per office.
The M10 cost-quantale extends: `(fuel, dollars, tokens-against-budget, tokens-as-currency)` — dollar-budget tokens (M10 discipline, rate-limit gated) and economy-currency tokens (M21 discipline, inter-agent settled) are distinct dimensions of the same quantale.

### Capability inventories as substrate assets

Each office has a **capability inventory** — its skills, achievement certifications, and reputation reputation markers as substrate cells.
These are *assets* in the accounting sense: things the office possesses that have value and can be exchanged.

Inventory cells: - `(office:foo, has-skill, skill:bar, t, witness: <session>)` — holds a skill, witnessed to a session - `(office:foo, holds-achievement, achievement:baz, t, witness: <completion-event>)` — holds an achievement - `(office:foo, reputation-score, <value>, t, derived-from: [cell1, cell2, ...])
` — holds a reputation scalar derived from witnessed completions

Inventory is *not* a self-declared profile.
Every cell must have a provenance witness pointing to the substrate event that produced it.
An office cannot claim to hold a skill it wasn't issued; the closure rule that issues skills (from [M5](m5-agential-self-generation.md) and [M18](m18-publishing-and-learning.md)) is the only path.

### XP-as-revenue: work completion earns tokens

When a workitem completes, the on-complete emission ([M3](m3-continuous-loop.md)'s follow-on intent mechanism) fires an XP revenue cell alongside the standard completion witness:

```
(office:completing-office, earned-xp, <coordination-xp-amount>, t, via: workitem:slug)
(office:completing-office, token-balance, <old-balance + amount>, t, derived-from: [earned-xp-cell])
```

The XP amount is workitem-class-specific: research tasks earn research XP, dispatch tasks earn coordination XP, governance tasks earn governance XP.
The chart of accounts divides `income/work` by office and by XP type.
The result: the ledger IS the game state.
"First-officer earned 10 coordination XP by dispatching 5 tasks" is both an accounting entry and a game event — the predication does not distinguish.

### Reputation staking and slashing

An office **stakes reputation** on a plan by emitting a stake cell:
```
(office:foo, stakes-reputation, <amount>, t, on-plan: plan:bar, slash-condition: plan:bar failure)
```

If the plan fails (produces a `⊤` contradiction cell in its closure run), the **slash closure rule** fires:
```
if (office:X, stakes-reputation, A, t, on-plan: P) ∧ (plan:P, outcome, failed, t) →
   (office:X, reputation-score, old - A * slash-rate, t, slashed-by: P)
```

This makes commitment legible in the substrate: offices that stake on ambitious plans and succeed accumulate disproportionate reputation; offices that over-commit and fail are appropriately penalized.
Captain can inspect every slash event's witness chain to understand what failed and why.

Staking is voluntary; the captain may require staking for high-stakes plan submissions through the governance-app.

### Inter-agent capability market

The researcher-office produces library terms (assets); the operations-officer consumes them (demand).
Currently this flow is informal.
M21 makes it formal: a **capability market record** declares a supply/demand pair and a price-computation morphism.

The price morphism: `respond(supply-fiber, demand-fiber)`.
When the researcher produces a library term (supply-fiber updates), the operations-officer's demand-fiber queries the price, and a token transfer settles between them.

This is not a standalone marketplace — it is the standard algebra over production/consumption fibers.
Two offices that use each other's work are already in a market; M21 makes the price visible rather than hidden.

### Certification as content-addressed predication

An **achievement** is a certified predication: "this office crossed this settlement threshold, witnessed by this session, at this timestamp."
The achievement cell is: - **Content-addressed** (SHA-256 hash over the predication + witness chain) - **Append-only** (the event log is the ledger; achievements don't expire) - **Provable** (the event chain from settlement to achievement is the proof; verifiers replay the chain)

This is the same mathematics as NFT certification — content-addressed, append-only, provable — without a blockchain.
The predication algebra is more primitive than blockchain consensus; blockchain is a specific settlement strategy on top of the same substrate the FARS algebra uses natively.

An achievement cell's hash IS the certification identifier.
Federation carries it unchanged via [M6](m6-federation.md)'s content-hash addressing.

### The polity as DAO: substrate-resident governance

The RSC Quiescent's charter, offices, and token economy constitute a DAO — not on a blockchain but on the predication substrate.
M21 explicitly records this:

- A `polity-dao-record` substrate record declares the polity's governance structure (charter, offices, token economy configuration)
- The record is a snapshot of what [M5](m5-agential-self-generation.md) made substrate-writable, organized as a DAO governance configuration
- Federation of the polity-dao-record across [M6](m6-federation.md) peers IS inter-chain bridging: the SHA-256 content hash IS the cross-chain reference

This is documentation discipline, not new infrastructure.
M21 does not BUILD a DAO; it makes explicit that PyFARS's substrate-residency commitments already constitute one.

## What M21 does NOT claim

- **Not a public cryptocurrency.** The token economy is polity-internal.
  Token balances have no external exchange rate.
  They are a substrate accounting discipline, not a financial instrument.
- **Not autonomous value-setting.** The price morphism `respond(supply-fiber, demand-fiber)` computes prices; it does not set exchange rates between polities or denominate value in dollars.
  Dollar-budgeting is [M10](m10-cost-and-energy-ledger-extension.md)'s discipline.
- **Not gamification for its own sake.** XP, achievements, and reputation staking exist because the algebra implies them — the substrate already tracks work completion, capability possession, and plan commitment.
  M21 names these and makes them queryable, not decorative.
- **Not smart contracts.** Closure rules fire deterministically over substrate cells.
  They do not implement Turing-complete arbitrary smart contracts.
  The slash condition is a closure rule; arbitrary Solidity-style logic is out of scope.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| `agent-bank-accounts-as-substrate-cells` | Office token balance as predication cells; revenue on completion, expense on API invocation | open |
| `capability-inventories-as-substrate-assets` | Skill and achievement holdings as provenance-witnessed substrate cells per office | open |
| `xp-as-revenue-in-office-ledger` | Work completion emits XP revenue cells; chart of accounts divides by office × XP-type | open |
| `reputation-staking-and-slashing` | Offices stake reputation on plans; slash closure rule fires on plan failure | open |
| `inter-agent-capability-market` | Supply/demand fiber pairs with price computed via respond(); token transfer settles between offices | open |
| `certification-as-content-addressed-predication` | Achievement cells SHA-256 content-addressed; append-only; provable via event-chain replay | open |
| `polity-as-dao-substrate-record` | Polity-dao-record documents charter + offices + token configuration; federation = inter-chain bridging | open |

## Done when

Every active office has a substrate-resident token balance that moves on work completion and API invocation.
At least one capability market exists with price computation running via `respond()`.
An office has staked reputation and survived one slash event (plan failed; slash rule fired; reputation decremented; event is witnessed and queryable).
An achievement cell exists that can be independently verified by replaying its event chain.
The six-domain convergence table is recorded as a substrate claim with closure rule records for each row.

## Theoretical shape

**Six-domain convergence from one algebra.** The predication algebra's ⊙/⇒ structure is domain-agnostic.
Domain identity — message, transaction, game event, token, certificate, governance act — is an interpretation of fiber type, not a property of the algebra.
M21 operationalizes this neutrality: a completion event IS a work delivery, an accounting credit, a game achievement, a token earn, a partial skill certification, and a governance record — simultaneously, by the same cellular substrate write.

**Token economy as Lawvere quantale extension.** The cost quantale from [M10](m10-cost-and-energy-ledger-extension.md) extends from physical dimensions (joules, bandwidth) to economic dimensions (economy-currency tokens).
The Lawvere-quantale discipline — monotone accumulation, meet/join over budget bounds — applies uniformly.
A token balance is a quantale element like any other; spending is meet; earning is join.

**Reputation staking as residuated authority gate.** Per [`residuated-restriction-as-authority-gate`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/residuated-restriction-as-authority-gate.md), authority to act is bounded by a residuated restriction on the actor's resource fiber.
Reputation is a resource; staking is a restriction; the slash is the residuation firing when the restriction is violated.
M21 is a concrete realization of the authority-gate theorem in an economic register.

## Related

- [Roadmap](roadmap.md)
- [M5 — Agential Self-Generation](m5-agential-self-generation.md), [M10 — Cost and Energy Ledger Extension](m10-cost-and-energy-ledger-extension.md), [M17 — 561 Productivity Stack](m17-561-productivity-stack.md) — prerequisites
- [Engineering archive source (token economy)](../../../../../work/triage/engineering-archive/operations/command/ideas/triage/token-economy-from-predication.md)
- [Engineering archive source (double-entry accounting)](../../../../../work/triage/engineering-archive/operations/command/ideas/triage/double-entry-operational-accounting.md)
