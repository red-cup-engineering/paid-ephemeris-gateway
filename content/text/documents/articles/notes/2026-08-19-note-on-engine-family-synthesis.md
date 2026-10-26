---
title: Engine Family Synthesis
description: "Cross-game duplication map and proposed 12-layer shared-engine consolidation plan for the 561 Group's game estate (math/bilattice kernel, world substrate, automation, capabilities, simulation systems, transport, render kits, ledger, rigidity), with a phased build order and owner-facing open questions."
date: 2026-08-19
keywords: ["gaming", "enterprises", "engines", "architecture", "consolidation", "synthesis"]
---

# The 561-Group Engine Family: Synthesis & Consolidation Plan

> Recovered verbatim from a 2026-08-19/20 ultracode session's 9-subagent
> "engine-family-survey" workflow (10 phase reports, ~1.1M subagent tokens, 311 tool uses).
> The workflow's output was written only to the session's ephemeral scratchpad
> and was never persisted to the repo before that scratchpad was cleared;
> this note reconstructs it in full from the session transcript.
> It directly informed several of that session's later architecture decisions
> (FizzOS as the shared "worlding engine",
> keeping abrash/tsander as separate micro-apps rather than merging them,
> ludics-as-gameplay carried by FizzOS)
> but none of the supporting analysis below was written down anywhere else.

## 1. Dependency & Overlap Map (what exists today)

### 1.1 The four ideas reimplemented independently, more than once

The survey found the same handful of concepts invented from scratch,
independently, across multiple packages in the estate.
The table below lists each concept,
every independent implementation the survey located,
and a verdict on which (if any) implementation should become the canonical one.

**Belnap FOUR bilattice.**
Independent implementations found:
`fizzos/src/four.mjs` (zero-dep, running);
the canonical `voidmath` (broken, missing `ajv`);
the `math-kernel` successor (zero-dep, 41/41 tests, no hyperdoctrine);
`@lenticule-science/metrologic` (published 0.0.1, the one **aletheon** correctly imports);
`tab/value.mjs` (now a thin wrapper *around* `@lenticule-science/metrologic/bilattice/charge`);
`qwzspace-server/existence.mts` (its own copy of the charge idea);
and `abrash`/`tsander` (each with its own per-package FOUR→style table).
That is six to seven parallel copies of the same math.
`@lenticule-science/metrologic` is the only one that is both published
and correctly consumed by a live game (aletheon).
Everything else should point at it.

**EAVT assertion-world.**
Independent implementations found:
`tab` (jsonl-per-entity, on-disk,
the richest ontology/closure-engine/Umwelt projection —
unpublished, currently un-runnable);
`fizzos/src/world.mjs`
(in-memory frozen array, functional/accumulating settlement —
published, running,
**zero import from tab despite docs claiming lineage**);
and `@561-group/computer`
(published; the "lifted" generic fold/row-identity spine
tab's own modules now shim to).
This means there are two live, independent world-kernel designs
(fizzos in-memory vs. tab on-disk)
with no shared code path.
This is the single biggest architectural fork in the whole corpus.

**"Hold both arms of a contradiction" gameplay mechanic.**
Independent implementations found:
`tsander/horsetail-hook.branchOnCharge` (+ consumed by `okaga/ship.mjs`);
`ruinfold/engine/ludics.mjs`
(full Girard/Curien ludics normalization, self-contained, unit-tested);
and aletheon's Ludics Dispute / Parley system.
That is three different-maturity inventions of the same idea:
resolve a ⊤ contested state as a real, non-collapsed gameplay outcome
rather than picking a side.
`ruinfold/ludics.mjs` is the most complete
and the most extractable
(zero coupling to the rest of ruinfold).

**Terminal 3D engine skeleton.**
Independent implementations found:
`abrash`
(voxel-grid, grid-DDA raycaster, pixel framebuffer via `daleske`)
vs. `tsander`
(object-list world, wireframe rasterizer, char-cell via `arnold`).
`world.mjs` and `engine.mjs` are near-byte-identical in structure
between the two —
confirmed, not inferred
(abrash's own report calls this out and proposes the merge).

**Accounts / Ledger / Payments.**
Independent implementations found:
`flickering-delve/{ledger,payments,accounts}.mts` (the original)
and `onestone/{ledger,payments,accounts}.mts`
(a near-verbatim port —
**onestone's own source comments say so**).
Ledger and payments logic is executable-identical between the two games.
`accounts.mts` diverged,
and onestone's own runtime (`scene.mts`)
bypasses its ported `accounts.mts` entirely,
reimplementing a third, simpler token scheme.
So there are three account-identity designs,
one wired per game.

### 1.2 Layers that are *already* correctly extracted (don't re-invent)

- **`@561-group/qwzspace`** — realtime transport
  (fixed-tick driver, intent-queue,
  interest-filtered snapshot/delta,
  SSE + hand-rolled WebSocket)
  is already pulled out of aletheon/ruinfold,
  published, zero-dep,
  and passes 82/82 assertions.
  Both 3D MMORPGs are documented consumers
  (though aletheon's link is currently broken in this checkout).
- **`@561-group/computer`** —
  tab's own EAVT fold/row-identity/canonical-JSON spine
  was already lifted here;
  tab's local copies are thin re-export shims.
  This is a completed precedent for
  "collapse duplicate implementations into one canonical owner."
- **`onestone/validate.mts`** —
  a fully generic 2D pebble-game/rigidity-percolation constraint-graph library
  with zero match-3 coupling;
  already reusable as-is.

### 1.3 Gaps, drift, and things that will block anyone touching this

- **`@561-group/computer` is unresolvable in-place**
  for `abrash`, `tsander`, `okaga`, and `tab` itself
  (hence `ruinfold`, `farstone`-legacy) —
  this one missing/unlinked workspace package
  blocks the largest number of packages in the corpus from running at all.
- **`@561-group/tab` and `@561-group/farstone` are not published**
  to Verdaccio at all,
  despite `@lenticule-science/metrologic`, `/computer`, and `/qwzspace` being published
  (0.0.1 each) —
  the richest world-substrate and the flagship demo game
  exist only as workspace-local or archived code.
- **`fizzos` local (0.2.1) is ahead of published (0.2.0)** —
  minor drift, cheap to fix.
- **Ruinfold's "rebuild from scratch" plan is unaware of ruinfold's own prior archived build** —
  the plan document never references the 8,364-line,
  mostly-generic, mostly-tested `engine/` tree
  that already implements batches 1–4 of its own roadmap.
  This is a planning gap, not a code gap.
- **Farstone's flagship demo world is missing** —
  only a played-through `world/*.jsonl` save survives
  (in a non-canonical archive copy),
  not the game package itself.
- **Zero real tests exist for `abrash`/`tsander`/`durante`/`okaga`**
  despite all four READMEs and package.json test scripts
  claiming specific passing counts —
  `tests/` in all four contains only a shared harness file.
- **Aletheon's README claims "zero-dependency, from-scratch WebSocket server"** —
  false as of the current code,
  which has already migrated onto `qwzspace`
  (own code comments say so);
  README wasn't updated.
- **Aletheon and ruinfold diverge on 3D rendering strategy** —
  hand-rolled WebGL2 (aletheon)
  vs. three.js-from-CDN (ruinfold) —
  a real fork that blocks sharing a renderer layer
  between the family's two MMORPGs.

---

## 2. Proposed Engine Family

The proposed stack has twelve layers,
numbered 0 through 8 with three sub-layers (5b, 6a–6c)
to reflect genuinely parallel, not sequential, alternatives at those points:

```
Layer 0  @lenticule-science/metrologic          logic kernel (bilattice, Klein-four, hyperdoctrine)
Layer 1  @561-group/substrate     world/EAVT layer (assertion log + fold + closure)
Layer 2  @561-group/automation    bounded Lisp + rules-as-data closure engine
Layer 3  @561-group/capabilities  plugin composition idiom
Layer 4  @561-group/mmo-systems   simulation mechanics (combat, death, economy, ludics…)
Layer 5  @561-group/qwzspace      realtime web transport (existing, keep)
Layer 5b @561-group/mud-transport turn-based/polling transport (fizzos http.mjs)
Layer 6a @561-group/terminal-3d   terminal render kit (daleske/arnold + abrash/tsander core)
Layer 6b @561-group/web-3d        WebGL2/3D web render kit
Layer 6c @561-group/board-geom    polygon-board geometry compiler (match-3 generic half)
Layer 7  @561-group/ledger        accounts, ledger, payments (mock/stripe/hive)
Layer 8  @561-group/rigidity      2D constraint-graph / pebble-game validator
```

**Layer 0 — Logic kernel.**
Absorbs fizzos `four.mjs`,
the `abrash`/`tsander` FOUR-style tables,
`qwzspace-server/existence.mts`,
and tab's `value.mjs` shim.
The seed implementation is **`math-kernel`**
(working, zero-dep, 41/41 tests) as the base,
with voidmath's categorical hyperdoctrine
(adjoints/Frobenius/Beck-Chevalley/comprehension)
folded in as an **opt-in extension module**,
published under the existing `@lenticule-science/metrologic` name/version line.
This is the one place the corpus already got it right
(aletheon imports the real published package directly) —
make everyone else do the same.

**Layer 1 — World substrate.**
Absorbs fizzos `world.mjs`,
tab's EAVT+closure+kind-lattice+Umwelt engine,
and `@561-group/computer`'s posix-holography spine.
The seed is **tab** for the rich on-disk/closure/ontology design
and **fizzos world.mjs** for the proven in-memory design —
kept as **two documented backends of one interface**
rather than merged by force
(see Open Question 1).
Both already sit on top of a row/fold contract;
`@561-group/computer`'s already-published spine
should be the shared foundation under both.

**Layer 2 — Automation.**
Absorbs fizzos `lisp.mjs`
and tab's DSL+closure-rule compiler.
The seed is fizzos's **bounded-fuel Lisp**
(player-authored per-tick decisions, proven by flickering-delve)
plus tab's **closure-rule engine**
(world-authored reactive causality),
kept as two distinct, complementary tools, not merged.
They do different jobs:
Lisp asks "what does the player's program do this tick,"
closure-rules ask "what does the world itself do when conditions hold."

**Layer 3 — Capabilities.**
Absorbs fizzos `capabilities.mjs`
and farstone-current's `composeCapabilities` usage.
The seed is **fizzos capabilities.mjs**,
already the house idiom;
it just needs formal promotion to family-wide status.

**Layer 4 — Simulation systems.**
Absorbs ruinfold's ~20 content-free `engine/*` modules,
`ludics.mjs`,
aletheon's `combat/marks/dispute/claims/richness`,
durante's `demon.mjs`,
and okaga's `galaxy.mjs`/`ship.mjs`.
The seed is **ruinfold's `engine/` tree**
(combat, death-as-evidence, threat, effects, movement, items, loot,
progression, stats, ai, quests, vendor, crafting, party, playertrade,
events, perception, skills, ludics) —
the most mature, tested, and least game-specific of anything in the corpus.
Aletheon's parallel systems and the tsander/okaga `branchOnCharge` pattern
should reconcile against this rather than keep diverging
(Open Question 4).

**Layer 5 — Realtime transport.**
Absorbs aletheon's deleted `ws.mjs`/`http.mjs`,
ruinfold's server layer,
and flickering-delve's and onestone's hand-rolled node:http+SSE servers.
The seed is **qwzspace**
(already extracted, published, tested).
flickering-delve and onestone haven't migrated yet —
real duplication (CSP headers, flood control, SSE plumbing)
still sits in both.

**Layer 5b — Turn-based transport.**
No existing duplication to absorb here.
The seed is **fizzos `http.mjs`**
(plain JSON REST polling),
kept separate for MUD-shaped games
that don't need push (farstone).

**Layer 6a — Terminal render kit.**
Absorbs `abrash`, `tsander`, `daleske`, `arnold`.
The seed is **abrash + tsander merged**,
per abrash's own recommendation:
one configurable world/engine core
(voxel-grid vs. object-list reader,
2D-collision-hook vs. Horsetail-hook,
pluggable renderer),
plus a shared "bilattice readout" utility
(charge→style table,
phase-driven shiver/jitter,
salience ordering)
currently hand-duplicated between them.
`daleske` (pixel/kitty-sixel) and `arnold` (char-cell)
stay as the two genuinely-different render targets underneath.

**Layer 6b — Web/3D render kit.**
Absorbs aletheon's `client/gl/*`
(vec3/mat4/quat, shader, mesh, camera, terrain).
The seed is **aletheon's hand-rolled WebGL2 kit** —
*if* the family standardizes on hand-rolled WebGL2 over three.js
(Open Question 3).
Currently the only candidate;
ruinfold's three.js client is architecturally incompatible
with this layer as-is.

**Layer 6c — Board geometry compiler.**
Absorbs onestone's `tiling-core.mts`.
The seed is **onestone's `RawCell → compileGeometry → BoardGeometry`** compiler,
split out from the match-3-specific `engine.mts` consumer.
It is a generic polygon-board adjacency/gravity/rail discovery,
reusable by any future tiling-based game, not just match-3.

**Layer 7 — Ledger/Payments.**
Absorbs flickering-delve's and onestone's near-duplicate
`ledger.mts`/`payments.mts`/`accounts.mts`.
The seed is **flickering-delve's originals**
(onestone's own comments confirm the port is executable-identical).
`accounts.mts` needs a single reconciled design —
see Open Question 5.

**Layer 8 — Rigidity validator.**
Absorbs onestone's `validate.mts`.
The seed is **onestone's `validate.mts`** as-is —
already fully generic
(nodes/edges in, independence/coordination-number out);
no game coupling to remove.

---

## 3. Per-Game Consumption

**fizzos (MUD kernel).**
Consumes Layer 0
(swap in `@lenticule-science/metrologic`, retire local `four.mjs`).
Implied work: formalize fizzos as the "in-memory backend" of Layer 1
rather than a silent parallel design;
fix 0.2.1 vs. published 0.2.0 drift;
chase down the one flaky SIGTERM test.

**farstone, current TS generation (on fizzos).**
Consumes Layers 0, 1 (fizzos backend), 3.
Implied work: low-risk, mostly stable already;
owner call on legacy jsonl/tab lineage
(Open Question 7).

**farstone, legacy jsonl/tab lineage.**
Consumes Layers 0, 1 (tab backend), 2 (closure DSL).
Implied work: only worth reviving
if tab is published/relinked (Phase 2);
otherwise retire in favor of current-gen.

**onestone (match-3).**
Consumes Layer 6c
(extract from its own `tiling-core.mts`),
Layer 7
(swap ports for shared package),
and Layer 8
(promote `validate.mts` as-is).
Implied work: split `tiling-core.mts`;
migrate off its own ledger/payments/accounts copies
onto the shared package;
decide the Stripe-identity question with flickering-delve
(Open Question 5)
before real payments go live.

**flickering-delve (idle roguelike).**
Consumes Layer 0/1/2
(already correctly via fizzos)
and Layer 7
(become the *source* of the shared package, not a parallel copy),
and is a candidate for Layer 5.
Implied work: extract its own ledger/payments/accounts
into the shared package rather than being ported-from;
evaluate whether its hand-rolled node:http server
should move to qwzspace.

**ruinfold (3D MMORPG, "to be rebuilt").**
Consumes Layers 0/1 (tab),
4 (**itself, as seed**),
5 (already wired),
and 6b (currently three.js — a fork).
Implied work: **do not rebuild from scratch.**
Fix workspace linking so `@561-group/tab`/`fizzos`/`qwzspace` resolve;
wire the already-built `ludics.mjs` into a live duel intent;
wire the already-built `perception.mjs` into broadcast;
resolve the render-stack fork with aletheon
(Open Question 3).

**aletheon (3D MMORPG).**
Consumes Layer 0
(already correct, exemplar),
Layer 4
(reconcile against ruinfold),
Layer 5
(already migrated in code, needs linking),
and Layer 6b
(candidate seed).
Implied work: fix workspace links so it runs at all;
write the tests the README claims exist
(currently zero);
correct the stale "zero-dependency WebSocket" README claim;
participate in the Layer 4 reconciliation
with ruinfold's death/ludics model.

**durante (terminal FPS, on abrash).**
Consumes Layer 6a (post-merge)
and, lightly, Layer 4
(`demon.mjs` vitality-as-witness-count,
`arena.mjs` federated-merge level authoring
as candidate Layer 4 contributions).
Implied work: blocked on the abrash/tsander merge (Phase 3)
and on `daleske` relinking;
write the actually-missing tests.

**okaga (terminal space-trader, on tsander).**
Consumes Layer 6a (post-merge),
Layer 4
(`branchOnCharge` reconciled into the shared
"hold-contested-branch" utility),
and carries a standalone "topology-derived economy" candidate module
(`galaxy.mjs`).
Implied work: blocked on the abrash/tsander merge
and on locating/relinking `@561-group/computer`;
write missing tests;
note the rename risk
(Open Question 8).

---

## 4. Sequenced Build Order (multi-agent campaign phases)

**Phase 0 — Recon & registry hygiene** *(single agent, short, blocking).*
Locate/confirm the canonical `@561-group/computer` source
and get it linked into the workspace
(this one gap blocks `abrash`, `tsander`, `okaga`, `tab`,
and transitively `ruinfold` and legacy `farstone`).
Reconcile fizzos 0.2.1 local vs. 0.2.0 published.

**Phase 1 — Logic kernel consolidation (Layer 0)** *(depends on Phase 0).*
Merge `math-kernel`'s zero-dep laws
with voidmath's hyperdoctrine
as an opt-in extension into `@lenticule-science/metrologic`.
Point `fizzos`, `abrash`, `tsander`, `qwzspace-server` at it;
delete their local FOUR copies.
Port over `math-kernel`'s 41 property tests
plus voidmath's proof witnesses
as the regression suite.

**Phase 2 — World substrate decision (Layer 1)** *(depends on Phase 0; needs Open Question 1 answered).*
Owner decides:
fizzos-in-memory and tab-on-disk as two permanent backends,
or converge on one.
Get tab runnable again
(fix the `@561-group/computer` import);
publish it if kept.
Wire `@561-group/computer`'s posix-holography spine
as the shared row/fold foundation under both backends.

**Phase 3 — Terminal engine consolidation (Layer 6a)** *(parallel with 4–7, depends on Phase 0–1).*
Merge `abrash`+`tsander`'s `world.mjs`/`engine.mjs`
into one configurable core;
extract the shared bilattice-readout utility;
relink `daleske`/`arnold`;
write the missing test files
for all four terminal packages
(abrash, tsander, durante, okaga).

**Phase 4 — Simulation systems extraction (Layer 4)** *(parallel with 3, 5–7, depends on Phase 0–1).*
Pull ruinfold's ~20 content-free `engine/` modules
plus `ludics.mjs`
into a standalone package.
Reconcile aletheon's parallel combat/dispute/claims systems against it
(Open Question 4).
Fold okaga's `branchOnCharge`
and durante's `demon.mjs`
into the same shared vocabulary.

**Phase 5 — Transport consolidation (Layers 5/5b)** *(parallel with 3–4, 6–7).*
Migrate flickering-delve and onestone
off their hand-rolled SSE servers
onto `qwzspace`
(or document why not).
Confirm aletheon's `qwzspace` migration actually links and runs.
Fix ruinfold's workspace links
so it runs end-to-end for the first time.

**Phase 6 — Ledger/Payments extraction (Layer 7)** *(parallel with 3–5, 7).*
Pull flickering-delve's ledger/payments
into a shared generics-based package.
Reconcile the three accounts designs into one.
Migrate both games onto the shared package.
Owner makes the Stripe-identity-sharing call
(Open Question 5)
before either game takes real payments.

**Phase 7 — Renderer-kit decisions (Layers 6b/6c/8)** *(parallel with 3–6).*
Owner decides three.js vs. hand-rolled-WebGL2
for the family's 3D games
(Open Question 3).
Extract onestone's `tiling-core.mts` geometry compiler
as standalone Layer 6c.
Promote `validate.mts` as standalone Layer 8.

**Phase 8 — Per-game finishing passes** *(depends on whichever of 3–7 each game needs).*
Ruinfold: wire `ludics`/`perception` into live intents, AoI gating.
Aletheon: write real tests,
fix README,
land the Layer 4 reconciliation outcome.
Durante/okaga: finish once Phase 3 lands.
Farstone: resolve legacy-lineage fate.
Onestone: begin the Cairo/Penrose tiling ladder
once Layer 6c exists.
Flickering-delve: wire the Stripe Elements client confirm step,
add a big-number decimal type.

**Phase 9 — Family-wide documentation & audit** *(final).*
Publish a family README
mapping every layer to seed/consumers
(this document, updated post-implementation);
verify every Verdaccio package version matches local;
note the ~571-package `@red-cup-engineering` sprawl
and cross-generation lineage-mapping backlog
as explicitly out of scope for this campaign.

---

## 5. Open Questions Only the Owner Can Answer

1. **World substrate.**
   Keep fizzos's in-memory design
   and tab's on-disk EAVT design
   as two permanently distinct, documented backends —
   or converge on one canonical implementation
   and port the other's consumers over?
   This is the single highest-leverage decision in the whole plan.
2. Is **`@561-group/tab`** meant to be published
   and actively maintained going forward,
   or formally retired
   in favor of `fizzos` + `@561-group/computer`?
   It's the documented ancestor/substrate
   for ruinfold and legacy farstone,
   but is unpublished and currently un-runnable as checked out.
3. **3D web rendering.**
   Standardize the family's two MMORPGs
   on hand-rolled WebGL2 (aletheon's kit)
   or three.js (ruinfold's current client),
   or accept the fork as permanent
   and never share Layer 6b between them?
4. **Contested-interaction resolution.**
   Converge tsander/okaga's `branchOnCharge`,
   ruinfold's `ludics.mjs`,
   and aletheon's Parley
   into one shared module —
   or are they deliberately different games' takes on the same idea
   that shouldn't be forced together?
5. **Payment identity.**
   Does onestone share one Stripe account/webhook with flickering-delve,
   or run a separate one?
   Onestone's own roadmap already flags this
   as blocking before real payments launch.
6. Should **`@561-group/computer`** be located
   and properly relinked as a real workspace dependency
   across the whole monorepo
   (it's the single most common unresolvable import in this scan),
   or does the pnpm/workspace setup itself
   need rework first?
7. **Farstone.**
   Retire the legacy jsonl/tab/DSL/worldgen lineage
   (richer content pipeline, but unpublished and unrunnable)
   in favor of the current TS "Bible" + FizzOS-capabilities rewrite —
   or invest in reviving the legacy pipeline?
8. Given the naming collision noted in the task framing,
   should the **`okaga` game package** be renamed
   to avoid confusion with the unrelated personal-fiction paracosm
   sharing the name?
9. Is there appetite for a dedicated
   **cross-repo dependency/lineage-mapping pass**
   (already flagged as unfinished work
   in the section's own custody docs)
   before or alongside this consolidation,
   given the scale of duplicate/legacy snapshots found
   even just within this scan?
10. **Priority ordering across the seven games.**
    Which is the actual priority —
    the two with live payment plumbing
    (onestone, flickering-delve),
    the two unfinished MMORPGs
    (ruinfold, aletheon),
    or the smallest-lift terminal games
    (durante, okaga)?
    This should drive which phases above
    get resourced first.
