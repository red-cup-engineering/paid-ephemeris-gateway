---
title: Render Substrate
description: "arnold, daleske, tsander, and abrash — the legacy terminal-rendering stack (TUI base, raster, wireframe-3D, and voxel raycaster) that other legacy games are built on."
date: 2026-08-19
keywords: ["gaming", "render-substrate", "arnold", "daleske", "tsander", "abrash", "voxel"]
---

# Render Substrate (arnold, daleske, tsander, abrash)

Four layers, not four independent games: a foundation-to-specialization dependency chain, where recovering any one layer in isolation isn't meaningful — recovering abrash without daleske recovers nothing runnable, and recovering the games built on this stack requires recovering the whole chain underneath them.

## The stack

- **arnold** is a Cell TUI framework, pure Node, doing "settled section" rendering. It's the base every other layer builds on.
- **daleske** is a pixel terminal framework (kitty/sixel) — the raster analogue of arnold, built over arnold.
- **tsander** is a wireframe 3D game engine built over arnold — the engine layer for the Okaga space-flight game.
- **abrash** is a software-3D raycaster game engine built over daleske specifically, not over arnold directly. It renders a federated voxel world — voxel rendering is not an absent concept here; abrash casts rays over a real, working voxel world.

Two rendering specializations (daleske for raster, tsander for wireframe-3D) sit over the shared arnold base; abrash is a further specialization over daleske.
