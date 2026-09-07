# HoloZing Services Section

HoloZing is a Hive-based game whose ZING token accrues server-side pending
rewards (delegation reward, stake reward, holding-achievement reward) that
a player claims into on-chain staked ZING. Owning an "Alpha Vial" NFT is a
separate, higher-stakes action (opening or transferring one is
consequential and irreversible) that this service treats as strictly out of
scope for a reward claim.

## What this service does

- `parseHoloZingPendingRewards` — parses the three pending-reward
  components at HoloZing's exact 3-decimal ZING precision and totals them;
  refuses on precision drift or duplicate Alpha Vial identifiers rather
  than silently accepting malformed evidence.
- `planHoloZingRewardClaim` — ready/refuse based on whether the total
  pending reward clears a policy minimum. A `ready` result's own reason
  states explicitly that the claim converts pending rewards into staked
  ZING "without opening or transferring an Alpha Vial."
- `reconcileHoloZingRewardClaim` — confirms a claim actually happened by
  requiring the sum of observed on-chain stake events to at least cover the
  planned amount, the staked-balance delta to equal that sum exactly, the
  liquid balance to be unchanged (a stake-only claim must not touch
  liquid), and pending rewards to have strictly decreased.
- `balancesAgree` — confirms two independently observed ZING balances are
  the same evidence.
- `loginMessage` / `keychainLoginEnvelope` — the exact message HoloZing's
  Keychain login flow signs, and the exact Keychain `signBuffer` response
  envelope its login endpoint expects back. Neither function signs
  anything; they only shape the message and the envelope around a signature
  the caller already has.
- `attachHolozingDurableRecord` — attaches a durable settlement record to
  an already-completed claim receipt via a caller-supplied async
  `recorder`. A recorder failure never flips `retryAllowed` back to `true`:
  the claim has already happened by the time this runs, so a witness
  outage is settlement residue to investigate, never grounds to repeat an
  economically effective claim.

## What this service deliberately does not do

It has no Alpha Vial open, transfer, or inventory-mutation path anywhere in
this package — not refused at runtime, simply absent. It also never signs a
login or a claim itself; `keychainLoginEnvelope` only assembles a response
shape around a signature supplied from outside.

## Migration status

`aagaard` consumes this package at the exact `0.1.0` registry pin for its
reward observation, planning, and reconciliation. Its script retains only
the account-specific login, claim, and settlement I/O; this package owns the
shared pure mechanics.

## Verification

```sh
npm test
```
