# TerraCore Services Section

TerraCore is a Hive-adjacent idle/PvP game: an account mines SCRAP over
time, can claim accumulated SCRAP into a Hive Engine token via a
`terracore_claim` custom_json, spend SCRAP on an Engineering upgrade that
raises its mine rate (paid via an on-chain `tokens.transfer` to a null
account), and spend a limited, regenerating attack against another
account's exposed SCRAP stash via a `terracore_battle` custom_json.

## What this service does

- `parseTerraCorePlayer` — parses TerraCore's player-state HTTP response.
  SCRAP and mine-rate are server-emitted as bare JSON numbers; `JSON.parse`
  would silently round them through IEEE-754 double precision before this
  module ever saw them, so the exact source lexeme is recovered by
  re-scanning the raw response bytes instead of trusting the parsed
  `number`. Duplicate top-level fields and quoted/nested lookalikes (a
  `"note"` field containing the text `"scrap":999`) are both refused or
  correctly ignored — see `test/terracore.test.mjs`.
- `terraCoreClaimIntent` / `planTerraCoreActions` — plans moving accumulated
  SCRAP out of the (raid-exposed) in-game stash once it clears a policy
  minimum. `planTerraCoreActions` always returns a `locked: true` plan: a
  battle refusal is included whenever attacks are available, because this
  function alone has no target-selection evidence to act on.
  `terraCoreClaimIntent` truncates, never rounds up, at 8-decimal token
  precision.
- `selectTerraCoreBattleTarget` — given a fresh snapshot of other accounts'
  public battle-relevant stats, selects the highest-scoring in-policy
  target for one already-regenerated attack: no protection buff, bounded
  dodge, defense no more than 2/3 of the actor's effective damage, and a
  minimum stash. Refuses on a stale snapshot, an empty candidate set, or
  malformed evidence — it never throws on bad input.
- `planTerraCoreEngineeringUpgrade` / `reconcileTerraCoreEngineeringUpgrade`
  — prices the one currently supported Engineering-level upgrade (from
  level 14) against the game's own published mine-rate formula, refuses if
  it would breach a liquid-SCRAP reserve or the upgrade's payback exceeds a
  policy bound, and reconciles a before/after observation pair against the
  exact quoted cost and mine-rate increase.
- `createTerraCoreClient` — the one I/O boundary, an HTTP player-state
  reader with a caller-supplied `fetchImpl`. Exercised in tests only
  against a mock implementation, never a live network call.

Every `*Intent`/`plan*`/`select*` function returns an unsigned `custom_json`
intent explicitly marked `approvedForBroadcast: false`, or a `refuse`
result. Nothing here signs or broadcasts a transaction.

## What this service deliberately does not do

It does not select or submit a battle on its own initiative, hold a key
file, or broadcast anything. `selectTerraCoreBattleTarget` proposes one
target from a snapshot an operator supplies; whether and when to act on that
proposal — and the signing and broadcasting that would require — is a
decision this package leaves entirely to its caller.

## Migration status

Ported from `aagaard`'s `src/integrations/terracore/terracore.adapter.ts`
in full (every exported function, including the I/O client). `aagaard`'s
own scripts (`scripts/terracore-cycle.mjs`,
`scripts/terracore-engineering-upgrade.mjs`) still import its own
TypeScript copy; see the parent section's README for the shared migration
debt this leaves.

## Verification

```sh
npm test
```
