# Tidepool — the world

A tidal shore, three registers, only some verbs and some tide phases connect them: **shore**
(always walkable), **pools** (their own always-walkable rooms — low tide doesn't hide a room, it
changes what `tend`/`harvest`/`dive` mean there), **underwater** (reachable only by `dive`, only
when the tide is high or rising, and never by an `exit:` edge — a structural guarantee checked by
`src/tidepool-game.test.mts`).

## Rooms (15)

| id | register | notes |
|---|---|---|
| `drift-line` | shore | **start room** — high-tide wrack line, driftwood, kelp litter |
| `tern-bluff` | shore | overlook, nesting terns — a good place to `listen` |
| `shingle-beach` | shore | pebbles, paths fan out |
| `sand-flat` | shore/pool | buried clams — a `harvest` cell |
| `the-spring` | shore | freshwater seep — **contradiction #2**: `water-quality` |
| `mussel-shelf` | pool | rocky shelf, dense mussels — a `harvest` cell |
| `anemone-pool` | pool | shallow, anemones, sea-glass |
| `hermit-hollow` | pool | sheltered overhang, hermit crabs |
| `kelp-fringe` | pool/underwater | the `dive` gate into `deep-channel` |
| `deep-channel` | underwater | only enterable via `dive` when tide is high/rising |
| `the-reef` | underwater | a second `harvest` cell |
| `eelgrass-meadow` | underwater | nursery meadow — leave the fry be |
| `the-weir` | shore | fish-weir — **contradiction #1**: `harvest-rights`; also the `propose`/`support`/`enact` polity |
| `the-landing` | shore | dock/jetty — `trade` hub, market |
| `driftwood-shed` | shore | `build`/`craft` site |

## The two contradictions

Both are the SAME `(subject, predicate, object)` triple asserted once `true`, once `false`, by
two different sources — exactly how `joinKnowledge` (feltos's `world.mjs`) produces FOUR `both`:

1. **`the-weir` / `harvest-rights`** — `shore-families`' customary claim vs. `landing-guild`'s
   purchased lease. Ages toward settlement, not just sits: gather quorum with
   `propose`/`support`/`enact` and settle it to a new common law (`law:shared-harvest-rights`).
   The *original* dispute stays in the trace, immutable, forever — enacting a law never rewrites
   it (feltos's assertions are an immutable trace by kernel law).
2. **`the-spring` / `water-quality`** — one faction claims `pure`, another `fouled`. Tied to
   `world-clock.mjs`'s real `dry-streak` field via a separate, functional `spring-reading` gauge
   (`cap-governance.mts`'s `onTick`): drought concentrates the dispute (the reading degrades
   toward `fouled-looking`), rain resets `dry-streak` and the reading recovers. The reading is an
   honest derived signal, never a rewrite of the immutable `water-quality` `both` cell itself.

## Ecology & economy

Three harvest cells (`mussel-shelf` → mussels, `the-reef` → fish, `sand-flat` → clams), each a
real `ecologyOf`/`harvestFish` stock that regrows logistically via feltos's own `ecologyCapability`
tick. `tend` reduces a cell's pollution. Six wares trade at `the-landing`
(`fish`/`mussel`/`clam`/`driftwood`/`kelp`/`sea-glass`), priced with a real distance markup
(`regionalPrice`) anywhere off-market. Three recipes at `driftwood-shed`
(`mend-weir`/`raise-stall`/`kelp-line`).

## Tick model

Request-driven, not `setInterval` — see the README's "why the world sometimes seems to sleep"
section and `src/tidepool-runtime.mts`. Default pace: `tickIntervalMs = 300_000` (5 real
minutes/tick — `TIDE_LENGTH = 8` ticks puts a dive window at ~40 minutes, a full day at ~2 hours).

## Functional predicates

Ecology (`fish-stock`/`capacity-fish`/`pollution`), market (`price:*`/`base-price:*`/`stock:*`),
clock (`tide`/`weather`/`world-time`/`dry-streak`), economy/crafting (`ware-type`/`owner`/`coin`),
governance (`proposal:*`/`law:*`/`spring-reading`), discourse (`knowledge`), predication
(`playing-as`). `harvest-rights` and `water-quality` are DELIBERATELY non-functional — declaring
them functional would make the second assertion silently win instead of settling to `both`,
destroying the contradiction (see `src/tidepool-game.mts`'s own comment on this).
