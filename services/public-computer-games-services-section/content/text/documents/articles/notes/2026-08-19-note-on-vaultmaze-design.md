---
title: VaultMaze Design
description: "Naming, the platform World JSON contract, honest degradation, and the read-only guarantee for VaultMaze — lantern-service's engine pointed at any knowledge vault (house or foreign) via @561-group/vault-compiler."
date: 2026-08-19
keywords: ["gaming", "lantern-service", "vault-compiler", "vaultmaze", "naming", "contract"]
---

# VaultMaze Design

Companion to `lantern-service/README.md` (branding note + `npm run vaultmaze` usage),
`lantern-service/DESIGN.md`/`ARCHITECTURE.md` (the underlying garden/gate/SRS mechanics, unchanged
by this work), and `@561-group/vault-compiler`'s own README (the compiler package this design
depends on, published to Verdaccio, living under the knowledge-vault system home rather than
under `computer-game-system` — see §4). This document exists to record the naming, the contract,
and the read-only guarantee in one place, per the owner's own framing (2026-08-19):

> "I'd love to be able to run MindMaze over a dir on my computer the way Obsidian can run over a
> dir... VaultMaze! MindMaze over a Knowledge Vault. The idea being to let someone turn a
> knowledge vault (org-roam, obsidian, whatever) into a MemeMaze. This is a pretense of getting us
> to a read-access interface with our actual content here, our terms, notes, etc."

---

## 1. Naming

| Name | What it names |
|---|---|
| **VaultMaze** | The player-facing display name of `lantern-service`'s web face, when pointed at any vault (house or foreign). Every player-visible string — `<title>`, header wordmark, tab `aria-label`s, save-file naming, error copy — reads VaultMaze. |
| **lantern-service** | The engineering identity: the package name (`@red-cup-engineering/lantern-561-group`), the directory, every module/export name, the `localStorage` key prefix (`lantern:<wing>`), every internal doc-comment header. **Unchanged, deliberately.** |
| **MemeMaze** | The owner's own riff (not a separate product, not a separate codebase) for *what a compiled vault becomes* once it's playable — a maze of the vault's own memes (in the Dawkins sense: units of the vault's own ideas/terms, not the internet-joke sense) rather than a fixed corpus's terms. Used descriptively, not as a UI string anywhere — VaultMaze is the product name; MemeMaze is what the owner calls the result of running it. |
| **`@561-group/vault-compiler`** | The published package that makes any vault compilable. Not itself branded VaultMaze — it is a general-purpose knowledge-vault compiler with no game-specific code in it (see §4); VaultMaze is one consumer of its output, not the only one the contract is meant to support. |

This is exactly the **TileSlots-over-`onestone-service` precedent**, restated for this service:
`onestone-service/README.md`'s own branding note ("the storefront/marketing display name is
**TileSlots**... that is display-only... 'onestone' stays the engineering identity") is the
template this rename follows line for line. Grep `lantern-service` for `Lantern`/`lantern` after
this change and everything that still says it is either (a) the engineering identity itself
(package name, directory, `STORAGE_PREFIX`, doc-comment headers, `dailyLanternWalk`'s function
name) or (b) prose in `DESIGN.md`/`ARCHITECTURE.md`/`ROADMAP.md`/`web/README.md` describing the
underlying mechanics, which this rename does not touch.

The 🏮 favicon emoji was kept as-is (a judgment call, flagged rather than assumed away, matching
onestone's own treatment of its favicon under the TileSlots rebrand) — it reads equally well as
"a lit lantern in a garden" and "a light source revealing a maze," so there was no clear
in-character reason to change it.

---

## 2. The contract: platform World JSON

Every dialect adapter, house or foreign, compiles down to exactly one shape — the `World`
lantern-service's engine already consumes, unchanged by this work:

```ts
interface World {
  wingId: string;
  rooms: Room[];   // { id, wingId, title, aliases, kind, description?, body, frontmatter, dateCreated? }
  doors: Door[];   // { from, to, weight: 'hard'|'soft', reason }
  halls: Hall[];   // { id, intent, rooms, stable }   — FCA-derived concept groups
  cards: ReviewCard[]; // { id, roomId, kind, front, back, stability, difficulty, lastReviewedAt? }
  warnings: string[];
}
```

`@561-group/vault-compiler/canonical` makes this checkable, not just documented:
`WORLD_JSON_SCHEMA` is a hand-derived structural description of it, `validateWorld` checks a
candidate against that schema (zero dependencies), and `assembleWorld` is the one place every
adapter's output is REQUIRED to pass through before it becomes a returned `World` — a
non-conformant compile throws with every validation error collected, not just the first. The
compiler's own test suite validates every one of its three dialects' output against this schema
as a co-located test, not an assumption.

A second artifact, `Layout` (`{ wingId, width, height, seed, iterations, positions, katas }`), is
produced by the same package's `build-layout` module (vendored from lantern-service's own
`web/build/build-layout.mts`) and is what the browser actually draws from — the compiled `World`
plus this `Layout` are the two files `bin/vaultmaze.mjs` writes under `web/data/` for any vault,
foreign or house.

### The mesh, not a monolith

Per the standing directive ("we love meshes of microservices glued together with standard
dataforms... do not build a monolithic new vault-compiler package blind — first learn what the
knowledge-vault system already does"), `@561-group/vault-compiler` is not a new engine: it
**vendors lantern-service's own seven already-dialect-neutral modules**
(`frontmatter`, `fca`, `stability`, `cards`, `kata`, `build-layout`, plus the shared
resolution/promotion pipeline lantern's `compile.mts` already ran) into the knowledge-vault
system home, and adds only what was actually missing: a dialect detector, three small adapters
(house/obsidian/org), wikilink resolution, and the canonical-shape validator above. That system
home (`knowledge-vault-computer-system-services-section`) held only `lib/legacy/*` triage dumps
and a bare, private `package.json` before this work — no live `services/` package tree — so
"extend in place" meant filling it with lantern's own proven engine, not inventing a second one.

Dialect detection (`@561-group/vault-compiler/dialect`) — a `.obsidian` directory anywhere under
root is authoritative for Obsidian; an `.org` file majority is authoritative for org; house
frontmatter marker fields (`type`/`cites`/`date-created`) or a structural default otherwise; an
explicit override always wins. Each adapter exports exactly four functions
(`discoverFiles`/`parseRoom`/`buildIndex`/`resolveLink`) and hands per-file
`{ room, hardCandidates, softCandidates }` to the shared, dialect-neutral pipeline — the SAME
link-resolution, zero-hard-doors-in promotion rule, FCA hall computation, hall-stability check,
and card generation runs for every dialect. "Doors from links only" for a foreign vault with no
hard-door convention is not a special-cased degradation branch; it falls out of the existing
promotion rule for free.

---

## 3. Honest degradation, not silent failure

A vault that lacks house's fields degrades gracefully and **visibly**, per the owner's explicit
instruction ("state the degradations honestly in the UI, not silently"):

- No hard-door convention found → every door comes from links between notes, promoted to hard by
  the same rule house already had.
- No note declares a creation date → kata auto-path ordering falls back to alphabetical room-id
  order instead of chronological order (`kata.mjs`'s own doc comment already covered this case;
  it just needed a dialect that actually exercises it).
- org v1's disclosed scope (no PROPERTY drawers, no `:ROAM_ALIASES:`, no `[[id:...]]` resolution)
  surfaces as its own note.

`bin/vaultmaze.mjs` computes these notes from the COMPILED WORLD, never from the dialect label
alone — a house wing that happens to declare zero `requires:` fields earns the identical note an
Obsidian wing with no `up:`-style fields does; the message describes what happened to this vault's
own content, not a property of its dialect. They are written to `web/data/<wing>-meta.json`, a
NEW artifact the original `compile:weiqi`/`build:web` pipeline never produces and never needs to —
`web/js/app.js`'s `renderVaultMeta()` fetches it optimistically and treats a 404 as "nothing to
disclose," so the weiqi wing (which never gets this file) is completely unaffected. When present
with at least one degradation, a visible banner renders under the wing label in the header
(`#vault-meta` / `.vault-meta` in `style.css`) — not a console log, not a silently-dropped field.

---

## 4. The read-only guarantee

**VaultMaze never writes into the vault it reads.** This is enforced at three layers, not just
asserted once:

1. **`@561-group/vault-compiler` itself** — every adapter's `discoverFiles`/`parseRoom` only ever
   calls `readFileSync`/`readdirSync`/`statSync`. The package's own test suite checks this two
   ways: a before/after size+mtime snapshot of a fixture vault proves compiling never modifies
   it, and a static-source check greps every vault-reading module for write-capable `fs` calls
   (`writeFileSync`, `appendFileSync`, `rmSync`, ...) and fails if any appear.
2. **`bin/vaultmaze.mjs`** — the only `writeFileSync` calls in the whole command target
   `lantern-service`'s own `web/data/` directory, never any path derived from the vault directory
   argument. Verified in practice (not just by reading the code): a size+mtime snapshot of a
   fixture vault taken immediately before and after running the command through its full
   compile→layout→write pipeline is byte-identical.
3. **`teraum` exclusion is absolute** — `@561-group/vault-compiler/walk`'s `isTeraumNamed` check
   is not a configurable `excludeGlobs` entry a caller could accidentally omit; it is
   unconditional, applied at every directory AND file segment, in the one shared file-discovery
   module every adapter calls. A vault containing a `teraum`-named path never has that path
   compiled into a room, and a link pointing at an excluded path is reported as an honest
   "unresolved" warning, not silently dropped or (worse) resolved anyway.

This is what makes "a pretense of getting us to a read-access interface with our actual content
here" true as a guarantee, not an intention: pointing VaultMaze at a real, live notes directory —
the owner's own repo content, per the stated proof target — carries the same never-write
discipline the synthetic fixtures were tested against.

---

## 5. Where things live

| What | Path |
|---|---|
| `@561-group/vault-compiler` (the package) | `.../engineering-services-section/services/computer-services-section/services/computer-systems-services-section/services/computer-knowledge-systems-services-section/services/knowledge-vault-computer-system-services-section/services/vault-compiler/` |
| `lantern-service` (display name VaultMaze) | `.../public-services-section/services/public-computer-services-section/services/public-web-services-section/services/public-computer-games-services-section/services/lantern-service/` |
| The one-command entry point | `lantern-service/bin/vaultmaze.mjs` (`npm run vaultmaze -- <dir>`) |
| The house-dialect acceptance test | `lantern-service/src/vaultmaze-parity.test.mts` |
| This document | `.../public-computer-games-services-section/content/text/documents/articles/notes/2026-08-19-note-on-vaultmaze-design.md` (the games-home notes dir) |
