---
title: Wheatstone — Log
description: "Legacy-archive recovery status, test-suite inventory, and sourcing for the Wheatstone MUD client."
date: 2026-08-19
keywords: ["log"]
---


## Status

Built in the legacy archive; a recovery candidate. Its README claims 116 assertions across 7 proof files, and this is one of the two best-attested assets in the whole legacy archive — proof files fully present, unlike durante/tsander/abrash/okaga, whose proof files were stripped down to a bare harness.

## Where it lives

Read-only archive at `561-group/lib/legacy/2026-08-17-vps-561-group/_archive/from-content-source/apps/tools/wheatstone`. All 7 named proof files are present on disk (`prove-ansi-text`, `prove-commands`, `prove-render`, `prove-scrollback`, `prove-smoke`, `prove-telnet-client`, `prove-worldstate`) — not independently executed as part of this review, since the archive is read-only, but the strongest evidence base of any archived asset in this notes directory.

## Recovery work

Confirm which (if either) of the two active-tree candidates (FeltOS, or the active Farstone build) speaks a protocol Wheatstone's proof suite actually exercises, then re-run Wheatstone's own 7 proofs against real code to confirm the archived claims hold before wiring it to a live server.

## Placement

Not on the planned-game staircase — a recovery item, and the best-evidenced one in the archive: the blocking work is a protocol-compatibility check against a live target, not test reconstruction.

## Sources

`2026-08-19-note-on-built-asset-and-planned-game-inventory.md` §8, tools/ table; direct path verification of FeltOS and the active Farstone build's existence.
