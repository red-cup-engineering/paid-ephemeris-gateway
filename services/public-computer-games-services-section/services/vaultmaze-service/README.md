# VaultMaze

Digital garden + knowledge vault + spaced repetition, gamified. A directory of frontmattered
markdown ("a wing") compiles into a walkable map: remembering a fact keeps its room lit, and
forgetting fogs the frontier back — nothing is ever deleted, only temporarily unreachable.

**VaultMaze** is the player-facing name and the package and directory identity. The
`localStorage` key prefix (`lantern:<wing>`) retains the historical `lantern` identity so
existing player saves are never orphaned. L-Space consumes this
as a passage engine rather than a competing vault ontology. See `DESIGN.md` for the full design
rationale and `web/README.md` for the browser face's file-by-file map.

## Run it

```
npm run compile:weiqi   # WEIQI_ROOT=<path to a corpus> node src/compile.mts ...
                         # writes data/world-weiqi.json (the compiled World)
npm run build:web       # regenerate web/data/*.json from data/world-weiqi.json
npm run serve:web       # http://127.0.0.1:8080/
```

Env vars: `WEIQI_ROOT` (the corpus directory `compile:weiqi` walks), `PORT`/`HOST` for
`serve:web` (default `8080`/`127.0.0.1`). No accounts, no server-held player state — everything
a player does lives in their own browser's `localStorage`.

### One command, any vault

```
npm run vaultmaze -- <path-to-your-vault>
```

Auto-detects the vault's dialect (an `.obsidian` directory, an `.org` file majority, or house
frontmatter markers — override with `--dialect house|obsidian|org`), compiles it via
`@red-cup-engineering/vault-compiler`, builds the layout, and serves it. `--wing <id>` names the wing
(default: the vault directory's basename); `--port`/`--host` as with `serve:web`; `--exclude
<glob>` adds an exclude glob (repeatable); `--no-serve` compiles without starting the server.
This command only ever reads from the vault directory; every file it writes goes under this
service's own `web/data/`. A vault lacking hard-door or `date-created` conventions degrades
honestly (doors from links only, kata ordering falls back to room-id order), disclosed in a
banner in the web face rather than silently.

## Commands

```
npm run check        # syntax-check every src/*.mts file
npm test              # node --test src/*.mts
npm run test:web      # node --test web/test/*.mts
```

## Architecture — a compiler, not a server

Lantern has no server-held player state: `src/compile.mts` is a deterministic function of a
wing's directory contents (`compileWing(root, config) -> World`), run once or on demand to
produce a JSON `World` snapshot. Everything downstream is a pure reader of that snapshot
(`fca.mts`, `stability.mts`, `lightcone.mts`, `srs.mts`, `kata.mts`, `cards.mts`), or lives
entirely in the browser (`web/js/state.js`'s `localStorage` save). `web/server.mjs` only ever
serves static bytes.

| module | role |
|---|---|
| `frontmatter.mts` | hand-rolled, zero-dependency frontmatter parser (scalars + flat string lists; nested maps recognized and skipped) |
| `compile.mts` | walks `*.md`, builds Rooms, resolves hard/soft Doors by frontmatter/link shape, calls `fca.mts`/`stability.mts`/`cards.mts`, emits a `World` |
| `fca.mts` | Formal Concept Analysis: intersection-closure of object attribute sets to find every closed concept (a Hall), with a capped-greedy fallback past `ATTRIBUTE_CEILING = 500` |
| `stability.mts` | the Hall rigidity criterion — pebble-game independence check vendored from `onestone-service/src/validate.mts`, plus `connectedComponents`/`hallStability` |
| `srs.mts` | FSRS-lite: the published power-law forgetting curve, deterministic (`now` always injected, never `Date.now()`) |
| `lightcone.mts` | revealed territory (monotonic) vs. the light cone (the current walkable frontier, recomputed fresh on every read) |
| `cards.mts` | five rule-based gate-card generators, priority-ordered, no LLM generation |
| `kata.mts` | auto-hall kata paths (deterministic DFS linearization), per-card scoring, belt tiers, kata-ratio-to-SRS-grade mapping |

Door extraction never hard-codes a corpus's field names: any frontmatter value shaped like a
`.md` link becomes a hard door; any body link becomes a soft door; a room with zero hard doors
of its own gets its soft doors promoted to hard. This is what makes a second wing (a player's
own vault) work with zero special-casing.

## The math

Three places run real, cited mathematics as the actual code path:

1. **The forgetting curve is FSRS's own published power-law curve** (`srs.mts`):
   `R(t,S) = (1 + FACTOR*t/S)^DECAY`, `DECAY = -0.5`, `FACTOR = 19/81`. The disclosed
   simplification: real FSRS fits ~19 weights per user from review history; this module hand-sets
   one small fixed constant set ("FSRS-lite") rather than implementing the full optimizer.
2. **Hall stability is a Jacobs–Hendrickson (2,3)-pebble-game independence check** over the Laman
   plane-rigidity matroid (`stability.mts`), vendored verbatim from `onestone-service`'s own
   implementation. The interpretation — "a concept-dependency graph is generically rigid" — is a
   metaphor riding on a real, computable graph property, not a claim about pedagogy or cognition.
3. **Hall computation is genuine Formal Concept Analysis** (`fca.mts`): closed concepts over an
   attribute context, not a clustering label on hand-picked groups.

## Security & fairness

No accounts, no payments, no ledger — there is no adversarial-input surface beyond a malformed
corpus file, which `compile.mts`'s defensive parsing (skip malformed frontmatter lines, log
unresolved links as warnings rather than throwing) is written to handle. `web/server.mjs` sends
standard security headers (CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer`) and refuses path traversal outside its own document root. Every
domain function that reads "now" takes it as an injected parameter (`srs.mts`, `lightcone.mts`,
`kata.mts` never call `Date.now()`), so a compiled `World` plus a sequence of reviews replays
deterministically.

## What this service does not have

No accounts/ledger/payments layer (see `ROADMAP.md`). No LLM-generated content — every card is
rule-generated from the corpus's own text (`cards.mts`). No player writes back to the shared
corpus — reviewing and gating change only a player's own local state; the corpus a wing compiles
from is read-only from this service's point of view, and that boundary is intentional.

## Tests

`npm test` (75 tests in `src/`, plus 1 skipped unless `$WEIQI_ROOT` points at a real corpus) and
`npm run test:web` (10 tests) both pass. `fca.test.mts` includes a worked example against the
weiqi corpus's own `cites` field; `stability.test.mts` covers the bare-chain, disconnected, and
over-braced cases the pebble game needs to distinguish; `web/test/parity.test.mts` asserts the
hand-ported browser engine is bit-identical to the real `.mts` modules across a grid of inputs;
`web/test/smoke.test.mts` simulates 30 days of review to check territory only grows while the
light cone genuinely shrinks on lapse.
