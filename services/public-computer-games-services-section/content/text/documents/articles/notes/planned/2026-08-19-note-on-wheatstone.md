---
title: Wheatstone
description: "A MUD client supporting telnet, GMCP, MSDP, and MXP protocols."
date: 2026-08-19
keywords: ["gaming", "wheatstone", "mud-client"]
---


A MUD client supporting telnet, GMCP, MSDP, and MXP. It's a client, not a server — it needs a live MUD to connect to.

Two real candidates exist in the active tree today: FeltOS, the current-generation MUD/world kernel, and the active Farstone build, which describes itself as built on current FeltOS. Wheatstone's telnet/GMCP/MSDP/MXP protocol layer would need to be checked against whatever transport either of those actually exposes before assuming compatibility. The Farstone build is the more specific of the two candidates, since it may already expose the protocol surface Wheatstone expects, but this hasn't been verified.
