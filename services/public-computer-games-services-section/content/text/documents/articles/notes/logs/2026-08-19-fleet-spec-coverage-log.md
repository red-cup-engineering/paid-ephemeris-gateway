---
title: Fleet Spec Coverage Log
description: Status log of documentation coverage across 561 Group game-fleet services, checked against the house specification standard, with the resulting gap list and roadmap.
date: 2026-08-19
keywords: ["gaming", "fleet", "roadmap", "status"]
---


Documentation coverage per lane, checked against
[the house specification standard](../2026-08-19-note-on-house-specification-standard.md).
Crucible, cartridge/energy-bank, the weiqi lane, and the ruinfold lane were mid-build at the
time of this check and were assessed only from their own already-published notes and plans,
not from source.

## Coverage by lane

| Lane | DESIGN.md | ARCHITECTURE.md | README/operability | Status |
|---|---|---|---|---|
| flickering-delve-service | Yes — originates the house doctrine | Yes | README.md + ROADMAP.md; no DEPLOY.md | Playable |
| onestone-service | Yes, inherits doctrine + TILESLOTS-DESIGN.md | Yes | README.md + ROADMAP.md + DEPLOY.md | Playable |
| lantern-service | Yes — adds the load-bearing-vs-flavor convention | Missing | No README.md, no ROADMAP.md | Playable |
| solitaire-service | Yes | Missing | README.md; no ROADMAP.md | Playable |
| play.561.group (storefront) | No DESIGN.md (README + cartridge spec substitute) | Not applicable | README.md, current | Functional static catalog reader |
| crucible-service | Yes, doctrine-conformant | Not assessed (mid-build) | Not confirmed | Mid-build |
| `@561-group/cartridge` + `@561-group/energy-bank` | Yes — full interface spec | N/A, no code yet | N/A | Specification only |
| weiqi lane | Yes — a platform plan plus constitution records | Not assessed (mid-build) | Kernel has its own README | Kernel solid; Play face not admitted |
| ruinfold lane | Yes — an MMORPG plan plus a daily-roguelike reframe | Not assessed (mid-build) | Per storefront catalog: empty test dir | Specification-and-skeleton stage |
| Equivo / self-education platform | Yes — two full specifications | N/A, no service yet | N/A | Specification only, content-blocked |

## Top gaps

1. **lantern-service has no README.md or ROADMAP.md**, despite being one of the fleet's
   best-specified services. Cheapest, highest-leverage fix in the fleet: a README is not a
   design document and needs no new engineering.
2. **Neither flickering-delve-service nor onestone-service has a shipped `replay()`/intent-log
   verifier**, despite both being named by the cartridge spec and the ZBD micropayment rails
   note as the natural first adopters of replay-based reward verification. Both already have a
   pure `applyMove`; only the fold-over-a-log wrapper is missing.
3. **`onestone-service/README.md`'s cascade-termination citation (Knaster-Tarski) has already
   been corrected in `engine.mts`'s source comments but not in the README** — a small,
   concrete two-file inconsistency.
4. **`onestone-service/src/accounts.mts` is dead code** — ported from flickering-delve, never
   wired into `scene.mts` or `server.mts`, which independently reimplement the same identity
   pattern. An undocumented vendored duplicate, the exact failure mode the house standard's
   vendor-not-import rule exists to prevent.
5. **No fleet service currently implements a payout direction on its ledger** — every service
   today only ever posts `income:*`, never `liabilities:*`/`expenses:payout:*` — so the Energy
   Bank spec's `verifyPayoutInvariant` has no service to exercise it against yet. This is not a
   bug in any one service; it is where the fleet actually is on its own staircase (below): every
   game today is pre-payout, by construction.

## Roadmap

Staged against [the gaming enterprises vision note](../2026-08-19-note-on-gaming-enterprises-vision.md)'s
staircase.

**Now** (shipped, spec-covered or in active retrofit):
- flickering-delve-service, onestone-service — playable, tested, spec-covered by a real
  `ARCHITECTURE.md`.
- solitaire-service, lantern-service — playable, well-tested, DESIGN.md-covered;
  ARCHITECTURE.md/README retrofits are the top two recommendations above, not blocking work.
- play.561.group — a real, honest, self-auditing storefront reading real (if
  cartridge-unwrapped) game state.

**Next** (scoped, buildable, no new design decision required):
- Write lantern-service's README.md/ROADMAP.md and solitaire-service's ARCHITECTURE.md/ROADMAP.md.
- Build `defaultReplay`/`replay` for flickering-delve-service and onestone-service — both
  already scoped in the cartridge/energy-bank spec, and both already have a pure `applyMove` to
  wrap.
- Fix the onestone README citation and the dead `accounts.mts` (gaps 3 and 4 above).
- Land `@561-group/cartridge` and `@561-group/energy-bank` as installable packages per their
  existing spec — this blocks the fleet's whole "wrap existing ledgers behind EnergyHooks" story.
- Crucible-service and the weiqi/ruinfold lanes landing (a scheduling matter, not a
  specification gap — both already carry strong design documents for their build stage).

**Later** (blocked on a decision, a dependency, or unauthored content):
- The energy-tiling hinterlands game (Crucible's sibling proposal) — piloted solo-scale once
  the daily-solvability-guaranteed engine in crucible-service's own DESIGN.md is confirmed
  landed and stable.
- Equivo's content-authoring pass and the Lakotaean register — blocked on owner-authored source
  material that does not exist in any surveyed corpus.
- The weiqi Play face — declared-not-admitted pending a board decision.
- The first fleet payout loop (ZBD adoption) — blocked on both the replay-verifier work above
  landing and the Energy Bank package existing, since gap 5 shows no service currently has
  anywhere to post a payout entry to.
- The undersea cooperative MUD / shared-board Commons work — too early to stage against; named
  here only to keep the staircase's top rung visible.
