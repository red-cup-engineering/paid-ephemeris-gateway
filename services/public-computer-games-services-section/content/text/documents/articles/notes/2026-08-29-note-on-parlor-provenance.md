---
title: Parlor Provenance
description: "Pins the verbatim owner message (2026-08-19T20:00:02.539Z) that triggered the Parlor pack (Pig, Farkle, Yacht, Chutes & Ladders, Fair Spin) — its dice/board/slot-games request is quoted nowhere on disk, and its payment-networks-as-regional-servers half, already paraphrased elsewhere, is now also a design input to the casino economy."
date: 2026-08-29
keywords: ["gaming", "parlor", "provenance", "regional-servers", "energy-bank", "casino", "recovered"]
---


Recovered 2026-08-29 from the founding session transcript (session 47cac153, 2026-08-19),
timestamp 2026-08-19T20:00:02.539Z. This is the owner message that started the Parlor pack (Pig,
Farkle, Yacht, Chutes & Ladders, Fair Spin — see `2026-08-19-note-on-games-census.md`'s Parlor
row). The first half of the message — the dice/chance/slot/board-games ask — is quoted nowhere in
the on-disk notes; only its outcome (the shipped Parlor service) is recorded. The second half is
paraphrased in `2026-08-19-note-on-gaming-enterprises-vision.md` ("Payment networks are the
regional servers"), but the verbatim source was not pinned anywhere until now.

## Verbatim, as typed

> Should we get what can get deployed deployed?
>
> I"m also curious about dice games, and other chance games, and slot games, and board games
> (chutes and ladders and silly ones like that)
>
> ---
>
> also, we can wait on ZBD and other payment stuff but remember to build it so that different
> payment networks are seen as different regional servers, because each one (usd fiat, HIVE,
> lightning, EVM) is their own "energy base" to the currency.

(The stray quote mark in "I"m" is in the original message as typed; reproduced here rather than
silently corrected.)

## What each half caused

- **First half** (deploy-what's-ready + dice/chance/slot/board games) → directly caused the Parlor
  pack: Pig, Farkle, Yacht (dice), Chutes & Ladders (board), Fair Spin (slot). All five shipped
  earn-only, no wagering, per the doctrine standing at founding time.
- **Second half** (payment networks as regional servers) → paraphrased into
  `2026-08-19-note-on-gaming-enterprises-vision.md`'s "Payment networks are the regional servers"
  directive: one ledger domain per network (USD fiat, HIVE, Lightning, EVM), no cross-network
  fungibility assumed, a settlement backend as a region, moving value between regions as an
  explicit exchange event.

## Why it matters now

`2026-08-29-note-on-social-casino-direction.md` puts casino.561.group's economy on
`@red-cup-engineering/energy-bank`, with tickets and chips settled through the `SettlementBackend`
interface and real payment networks wired in later. This message's second half is the origin of
that architecture, not just of Parlor's — the regional-server model this message specifies is a
direct design input to the casino economy, not only to the earn-only games it first governed.

## Sources

- Founding session transcript (session 47cac153, 2026-08-19), timestamp 2026-08-19T20:00:02.539Z.
- `2026-08-19-note-on-games-census.md` — the Parlor row this message caused.
- `2026-08-19-note-on-gaming-enterprises-vision.md` — the paraphrase of this message's second half.
- `2026-08-29-note-on-social-casino-direction.md` — where the regional-server model becomes a
  casino-economy design input.
