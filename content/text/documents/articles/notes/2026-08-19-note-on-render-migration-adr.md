---
title: Render Migration ADR
description: "PROPOSED, NOT ADOPTED. A per-game survey of the landed web-game fleet against the owner's 2026-08-19 composition-shape doctrine: which surfaces are document-shaped (TUFTE candidates), which are realtime (QwzSpace candidates), which is the board (stays game-owned), what each service's hand-rolled serve/render scaffolding shares with its siblings, and a sequenced migration plan with a named pilot. No migration code was written for this document — it is a survey and a proposal, for the owner to accept, amend, or reject."
date: 2026-08-19
keywords: ["gaming", "render", "tufte", "qwzspace", "adr", "composition"]
tags: ["proposed"]
---

# Render Migration ADR

**Status: PROPOSED. Not adopted. No migration code exists yet** — this is survey-and-plan only,
paired with the composition-shape doctrine folded into
`2026-08-19-note-on-house-specification-standard.md` §2/§5/§8 (see that document's own bullets
for the doctrine this ADR applies).

## Context

The owner's 2026-08-19 standing doctrine (`studio-filing-reflection.md`, "The composition shape")
states plainly: hand-rolled per-game render/serve scaffolding is transitional debt, to be drawn
down by a migration ADR — canvas/SVG game *boards* stay game-owned (they are the game), but the
chrome, panels, pages, and transport around them become house fibers: **TUFTE**
(`@red-cup-engineering/web-tufte-gui-services-section`, confirmed active — v0.2.0, a real,
domain-neutral HTML document renderer over role/lifecycle/confidence/span/side tile records, with
a browser companion (`./browser`) wiring `tufte:action`/`tufte:receipt`/`tufte:refusal`/
`tufte:projection` DOM events over a fetch-based action endpoint) for document-shaped surfaces,
and **QwzSpace** (`@561-group/qwzspace`, confirmed active — v0.0.2, a fixed-tick single-writer
realtime engine composed of `tick-driver`/`intent-queue`/`snapshot-manager`/`broadcast-hub`/
`http-sse-server`/`http-ws-server`/`protocol`, lifted from ruinfold's and a sibling game
("Aletheon")'s own realtime servers) for realtime surfaces.

This document surveys the landed fleet against that split. It does not propose new mechanics, new
game logic, or a timeline commitment — only a classification and a sequencing recommendation.

## Per-game survey

Grounded in direct source reads (flickering-delve, onestone, lantern, solitaire) or
their own `DESIGN.md`/`README.md` (crucible); `gambling-trainer` and
`stoke` are noted with their known shape only, since both trees are under active, unrelated
concurrent development (a "shelf chrome" rollout touching `web/css/shelf-
chrome.css` in several trees simultaneously) and were not read in this pass to avoid
racing that work — their rows should be re-verified before any migration lands.

| Service | Document-shaped surfaces (→ TUFTE) | Realtime surfaces (→ QwzSpace) | The board (stays) | Serve/render scaffolding shared with siblings |
|---|---|---|---|---|
| **flickering-delve** | Nearly the whole UI: the collapsing action bar, standing-orders list, shop sheet, strategy editor, stats/HUD — this game has **no spatial board at all**, only numbers and text, making it (with onestone's chrome) the highest-value early TUFTE target after the pilot. | `GET /stream` SSE state-frame push (`server.mts`) — a real realtime surface today, hand-rolled, not on QwzSpace. | *(none — genuinely document-shaped throughout)* | Native `node:http`, hand-rolled SSE, shared security-header object, bounded-body JSON parsing — the same shape `onestone-service/server.mts` independently re-derived. |
| **onestone (TileSlots)** | Chapter/level map (saga trail), shop sheet, Lattice Garden trophy case, HUD chips, win/loss sheet. | `GET /stream` SSE state-frame push — same hand-rolled shape as flickering-delve. | The match-3 grid itself (inline SVG today, a Canvas2D rewrite specified in `TILESLOTS-DESIGN.md` — either way, game-owned, out of this ADR's scope). | Same native-http/SSE/security-header/bounded-body shape as flickering-delve — confirmed near-identical by direct read of both `server.mts` files. |
| **lantern** | Review modal, kata-run UI, daily-lantern-walk panel, halls tab, streak/state HUD — the whole non-map chrome. | *(none)* — no multiplayer, no live push; `localStorage` only. | The SVG concept map (`map.js`) — the product's core visual metaphor, game-owned. | `web/server.mjs`: plain static-file `node:http` server, no SSE, no app state — the simplest server in the fleet, and the one with the least to migrate on the transport side. |
| **solitaire** | Landing page (variant grid, daily-deal card, seed form), win banner, keymap overlay, move-log export panel. | *(none today)*; `README.md`'s own roadmap names a future daily leaderboard, which would be QwzSpace's first natural entry point for this service. | The card table (`table.html`, inline SVG cards). | `web/server.mjs`: static file server **plus** `node:module`'s `stripTypeScriptTypes`-on-request, so the browser can `import` `src/*.mts` directly — a distinct, real pattern from onestone/flickering-delve's SSE servers, shared instead with crucible's own `web/server.mjs` (confirmed near-identical by direct read of both). |
| **crucible** | Move panel, energy gauge, history/histogram view (per `DESIGN.md`'s module map: `web/js/app.mjs`'s "mounts the move panel and energy gauge"). | *(none today)* — solo daily puzzle; the vision note's own "shared board later" ambition is the natural future QwzSpace entry point. | The lattice-in-crucible SVG renderer (`web/js/render-svg.mjs`), fed by a pure projection (`project.mjs`). | Same `stripTypeScriptTypes`-serving static server pattern as solitaire — both games independently arrived at the identical mechanism for serving real `.mts` kernel source straight to the browser. |
| **gambling-trainer** (Kelly's Wager) | **Not independently re-surveyed** (tree live and under active development) — known from its own `package.json` description: "every spend in the UI is typed on screen as freely-reversible, priced, or terminal, per the house's disclosure discipline." This is coordinator-identified as the **second pilot candidate**: tiles-with-confidence is TUFTE's native vocabulary, and the three-way disclosure typing (also formalized in `2026-08-19-note-on-house-specification-standard.md` §8's Carrier Audit) maps directly onto TUFTE's `confidence`/`lifecycle` tile fields with no invented mapping needed. | Not surveyed (live tree). | Not surveyed (live tree) — likely thin-to-absent, since a bankroll trainer is closer to flickering-delve's numbers-and-panels shape than to a spatial board; to be confirmed once the tree settles. | Known from earlier work: `web/server.mjs`, same house family as the others; not re-diffed here. |
| **stoke** | Not surveyed — tree is mid-build. File names alone (`web/js/{layout.mjs,render-graph.mjs}`) suggest a graph/network visualization, structurally closer to lantern's concept-map board than to a document surface, but this is inference from filenames, not a read, and is flagged as such. | Unknown, not surveyed. | Possibly a graph board (`render-graph.mjs`) — unconfirmed. | Unknown, not surveyed. |
| **play.561.group (storefront)** | The entire product: one catalog card per game (`js/catalog.mjs`, `index.html`) — **literally a TUFTE tile grid already**, per the coordinator's own framing ("the purest TUFTE candidate... they are literally documents"). | *(none)* — a static catalog reader. | *(none)* | Zero-dependency static file server (`serve.mjs`) — the simplest migration target in the fleet: swap `catalog.mjs`'s hand-rolled card-rendering for `renderTufteDocument`, one tile per game, `role` distinguishing "today's featured game" from the rest. |
| **Today page** | **Does not exist yet** (named as a proposed front door in `2026-08-19-note-on-the-suite-and-the-studio.md` directive 2: "every game's daily seed in one place... the ritual"). Named here as pilot-adjacent specifically *because* it doesn't exist: building it directly on TUFTE from day one means it never accrues render/serve debt to migrate away from later. | Plausibly, once daily-seeded games multiply (aggregating today's seed across ruinfold/crucible/solitaire/gambling-trainer) — a read-only aggregation, not itself a realtime surface unless a live "who's playing today" presence feature is added, which would be QwzSpace's entry point if wanted. | *(none)* | N/A — unbuilt. |
| **replay-spectacle lane** | Cited by the coordinator as **already building on TUFTE** — the first native adopter, not a migration target. Not independently verified (a direct grep for `tufte`/`Tufte`/`TUFTE` across every game tree this document could safely read found no matches, consistent with this lane being part of the same live, in-flight work this document deliberately did not chase into — see the survey note above). Recorded here as reported, not as independently confirmed code, and flagged for confirmation in the next revision of this ADR once that tree settles. | Unknown — plausibly relevant, given "replay-spectacle" suggests a spectator/leaderboard-watching surface (the shape ruinfold's own `app-watch.mjs` — a real, read, non-TUFTE, hand-rolled DOM renderer today — already builds a non-TUFTE version of). | Unknown. | Unknown. |

## The candidate "one house serve fiber"

Direct comparison of every `server.mts`/`web/server.mjs` this document could safely read (six of
the eight rows above) shows two, not one, recurring shapes — a real finding, not an assumption:

1. **The SSE-stateful shape** (flickering-delve, onestone): native `node:http`, a shared
   security-header object (CSP/`X-Content-Type-Options`/`X-Frame-Options`/`Referrer-Policy`),
   bounded-body JSON parsing, a `GET /stream` SSE endpoint pushing a per-account state frame. This
   is close to a direct restatement of what `@561-group/qwzspace/http-sse-server` already *is* —
   confirmed by reading qwzspace's own README ("the SSE transport (POST intent + stream),
   zero-dep") against these two services' own route inventories, which are the identical shape one
   level less abstracted. This is the ADR's strongest "candidate for one house serve fiber" claim:
   these two services' SSE servers look like an early, unlifted duplicate of exactly the boundary
   qwzspace already generalizes (the way ruinfold's and Aletheon's own realtime servers were the
   two sources qwzspace itself was lifted from, per its README's own "Lifted from" section).
2. **The type-stripping static-serve shape** (solitaire, crucible): a plain static file server
   plus one extra behavior — any `.mts`-suffixed request is read, run through
   `stripTypeScriptTypes`, and served as `text/javascript`, so the browser imports the real kernel
   source with no build step and no duplicated copy. Both services independently arrived at
   byte-similar implementations (confirmed by direct read of both) — a clean, small,
   real candidate for a shared house utility (a `serve-mts-static.mjs` fiber, analogous in spirit
   to `check-mts.mjs`'s own house-wide vendoring), distinct from the SSE shape above
   and not something QwzSpace's own module list currently names, since it's a dev-serve concern,
   not a realtime-transport one.

Lantern's server is the outlier: plain static serving, no SSE, no type-stripping — already the
simplest possible shape, and arguably needs no fiber at all beyond what a house TUFTE-serving
convenience might eventually standardize (out of scope for this pass; flagged for the next
revision).

## Sequenced migration plan (proposed)

**Pilot — storefront + Today page**, exactly as instructed: `play.561.group`'s catalog is already
structurally a TUFTE tile grid wearing hand-rolled HTML; migrating it is the smallest possible
first cut (one file, `js/catalog.mjs`, no server-side state to touch) and proves the TUFTE seam end
to end before any game's own chrome is touched. The Today page should be **built directly on
TUFTE from its first commit**, never hand-rolled first and migrated later — the one place in this
whole plan where "migration" is the wrong word entirely, because there is nothing yet to migrate
away from.

**Second — gambling-trainer's disclosure panels**, per the coordinator's own framing: tiles with a
`confidence` field are TUFTE's native vocabulary, and this service's own three-way spend-typing
(freely-reversible/priced/terminal) is the exact same classification `2026-08-19-note-on-house-specification-standard.md`
§8's Carrier Audit already formalizes fleet-wide — the disclosure panel migration and the Carrier
Audit discipline are the same move seen from two sides, which makes this a genuinely low-risk
second cut rather than an arbitrary next pick. Deferred to a revision of this ADR once
gambling-trainer's tree settles and its actual current markup can be read directly rather than
inferred from its `package.json`.

**Cited, not scheduled — the replay-spectacle lane.** Per the coordinator: already building on
TUFTE, so it is the fleet's **first native adopter**, not a migration entry. This ADR does not
schedule it because there is nothing to schedule; the next revision should confirm its TUFTE usage
directly (not possible here, per the live-tree caveat above) and record it as precedent for how
a *new* surface should be built from day one — the same posture recommended for the Today page.

**Next, in rough order of value ÷ risk** (not committed, ordered by the survey above): (1)
flickering-delve's chrome — highest document-shaped surface area of any landed game, zero board to
disturb, so a migration here touches nothing but rendering; (2) onestone's map/shop/garden chrome
— same shape, with the one caveat that its board itself is mid-rewrite to Canvas2D per
`TILESLOTS-DESIGN.md`, so sequencing this after that lands avoids two renderer changes landing on
the same surface at once; (3) lantern's review/kata/daily-walk panels — lowest urgency (no SSE
complexity, no board risk) but real value once a house TUFTE-serving convenience exists, since
lantern's server is otherwise already the simplest in the fleet; (4) solitaire's and crucible's
landing/move-panel chrome, alongside a decision on the shared `serve-mts-static.mjs` fiber named
above, since both services' migrations naturally touch that same seam.

**Realtime (QwzSpace) migration is a separate, later track**, gated on the SSE-shape finding
above: flickering-delve's and onestone's existing hand-rolled `GET /stream` servers are real,
working, and not broken — this ADR recommends confirming the qwzspace `http-sse-server`/
`snapshot-manager` boundary is a strict superset of what these two already do (interest-filtered
delta projection, single-writer intent draining) before either service's transport is touched, so
the migration is a like-for-like swap onto a house fiber, never a regression dressed as a
refactor.

## What this document does not do

It does not write a line of migration code, a new `server.mts`, a new render call, or a new
`package.json` dependency in any game tree. It does not commit to a timeline. It does not resolve
whether `gambling-trainer`'s or `stoke`'s trees match the inferred shapes above — both rows are
explicitly marked unverified and gated on those trees settling. It is a survey and a sequencing
proposal, for the owner to accept, amend, or reject before any of it becomes work.
