# Splinterlands Services Section

Splinterlands is a trading-card game built on Hive: cards are Hive-Engine
NFTs, matches are settled by signed `custom_json` operations
(`sm_find_match`, `sm_submit_team`, `sm_surrender`), and the card market is a
separate `sm_market_purchase` custom_json against listings other accounts
post. This service observes a fleet account's card collection, plans a
bounded card-market purchase, and reports whether the account's inventory
*would* satisfy a conservative battle-readiness bar — and stops there.

## What this service does

- `src/collection.mjs` — parses Splinterlands' public card-detail and
  owned-card shapes and reports whether an owned, undelegated Modern
  ("archon" + compatible unit) team core exists in the observed collection.
  Pure observation; the result is inventory fact, nothing more.
- `src/market.mjs` — plans a bounded `CREDITS` purchase of a fixed five-card
  roster target against currently observed market listings: a hard credit
  ceiling, a minimum credit reserve, exact-basket duplicate-listing
  refusal, and reconciliation that checks every acquired card UID and the
  exact credit delta against a before/after wallet observation. This is an
  ordinary marketplace transaction — paying a price another seller posted —
  not automated play.
- `src/queue-readiness.mjs` — `admitOneSplinterlandsQueue` reports whether
  observed energy, an outstanding-match count, collection readiness, and
  coverage readiness would satisfy a conservative one-match policy. It is
  an audit signal, the software equivalent of a human checking their energy
  bar before opening the game client — it never queues anything.

Every planning function here returns a plan or a `refuse` result; none signs
or broadcasts a transaction, and this package holds no key-file or network
I/O at all — those stay in whatever operator wires these functions to real
observations and to a signer.

## What this service deliberately does not do

**It has no battle-submission capability, and none is planned.**
Splinterlands' Terms of Service, §1.A.5 and §1.A.6, prohibit using bots,
scripts, or other automated means to interact with the game outside its own
human game interface (the API and websocket exist for the client itself, not
for third-party automation to play through). Queuing a ranked match
(`sm_find_match`), selecting and submitting a team (`sm_submit_team`), or
surrendering (`sm_surrender`) *is* playing the game — it is exactly the
automated interaction the ToS prohibits, regardless of whether the team
selection is fair or the account's own cards are used.

This is not a new constraint invented for this section — it is the stance
`aagaard`'s existing code already took. `aagaard`'s
`scripts/splinterlands-audit.mjs` computes the same readiness signal
`admitOneSplinterlandsQueue` produces here and explicitly records
`queueSubmitted: false` regardless of the result; its
`scripts/splinterlands-session-probe.mjs` authenticates to prove the
account's key controls its own session and then exits, with "no battle,
market, transfer, reward, or custom_json submission path" stated in its own
header comment. `aagaard`'s `src/integrations/splinterlands/
splinterlandsOperator.mts` does contain pure functions that build
`sm_find_match`/`sm_submit_team`/`sm_surrender` operations
(`splinterlandsFindMatchOperation`, `buildSplinterlandsSubmitTeamData`,
`buildSplinterlandsUnsignedBattleTransaction`, `reconcileSplinterlandsBattle`)
— but grep across `aagaard`'s own `scripts/` and `src/` shows they are
referenced only by their own test file, never wired into any script that
observes, plans, or runs anything live. This section makes that boundary the
package boundary instead of a fact you'd have to grep for: those functions
were deliberately **not** ported here, and `admitOneSplinterlandsQueue` was
ported with its behavior unchanged (it still only reports readiness, never
submits).

If a defensible reason ever exists to cross that boundary — the game
publishes an official bot API, for instance — that is a new section's
decision to make explicitly, not a quiet addition to this one.

## Migration status

`aagaard` consumes this package at the exact `0.1.0` registry pin for
collection parsing and readiness. `src/market.mjs`
is a port of `src/integrations/splinterlands/splinterlandsMarket.mts`.
`src/queue-readiness.mjs` ports only `SPLINTERLANDS_OPERATOR_POLICY` and
`admitOneSplinterlandsQueue` out of
`src/integrations/splinterlands/splinterlandsOperator.mts` — the rest of
that file (team selection, battle-operation encoders) is the automated-play
surface described above and was not ported. Aagaard's scripts retain their
account-specific observation and policy work while importing collection
mechanics from this package.

## Verification

```sh
npm test
```
