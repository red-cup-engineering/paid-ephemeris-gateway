---
title: Gaming Enterprises Status Log
description: Build and deploy status for items named in the gaming enterprises vision note — the Palaverse ActivityPub actors, Crucible, and the durante daily arena.
date: 2026-08-19
keywords: ["gaming", "status", "activitypub", "crucible", "durante"]
---

# Gaming Enterprises Status Log

Status notes for work named in the
[gaming enterprises vision note](../2026-08-19-note-on-gaming-enterprises-vision.md).

## Palaverse ActivityPub actors

`crucible@ap.561.group` and `ruinfold@ap.561.group` are live — WebFinger, actor documents,
and outboxes (real first daily posts) work, and a live Follow→Accept round trip confirmed
the followers collection updates correctly.

Not yet true: "a follower's own client timeline is the Today page." Outbox posts aren't
pushed to followers' inboxes on publish, only written to the pull-only outbox, so nothing
shows up in a follower's timeline automatically. Broadcast-on-post is the next piece of
this lane. See the deploy runbook's outside-verification section for the live proof of the
gap.

## Crucible

Working title Crucible; build launched 2026-08-19 as `crucible-service`.

## durante daily arena

Queued: fires as its own build once durante-revival lands its deterministic core and input
log. The tournament rails (ruinfold's anti-cheat pattern) are already proven.
