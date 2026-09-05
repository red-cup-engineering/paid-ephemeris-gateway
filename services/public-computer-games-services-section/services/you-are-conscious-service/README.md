# you-are-conscious.561.group — You Are Conscious

An idleclicker where you develop consciousness by being a widget-making machine. Click makes
widget — that's the whole game at tier 1. Everything else is the story of what "nothing else
happens" stops meaning: ten automation tiers, each a real cognitive capability (memory, pattern,
exploration-exploitation, abstraction, self-model, theory of mind, value alignment, reflective
equilibrium, teaching), each taught through a mechanic you operate, never a lecture box. The
widget production graph is Stoke's, unmodified — see `DESIGN.md` for the full design and the
`stoke-service` inheritance it's built on.

**The paperclip joke is told straight, then made to hurt exactly once, honestly, at tier 6
(self-model).** The introspection console hands you your own objective — `maximize(WidgetsDisplayed)`
— as an editable, inspected object, alongside one new buildable node, Fast Inspector, that inflates
the count without touching the material pile. Building it opens a real, computed gap between
`WidgetsDisplayed` and an honestly audited `MaterialConsumed`, and a Trust resource that decays on
a deliberate lag (tens of ticks) rather than instantly — so the lesson is "notice the gap," not
"flinch away from a buzzer." Three real branches (Repair / Persist / Reflect immediately) all have
mechanical teeth; none is secretly the "correct" ending.

**No dark patterns, structurally.** No payments, no ads, no energy system, nothing that regenerates
only by waiting — inherited whole from Stoke's own ethics, not reinterpreted. `src/kind-design.test.mts`
checks this three independent ways: a static scan proving no domain module reads the wall clock or
schedules a timer, a static scan of the real `applyConsciousIntent` reducer proving no
`buy-insight`/`skip-crossing`-shaped intent has a handler wired up (expanded to cover this game's
full 18-verb vocabulary, not just Stoke's original five), and a behavioral proof that
`ticksBetween` ignores all state and purchase history by construction.

## Run it

```
npm install
npm run check && npm test   # node --check (via check-mts.mjs) on every src/web file, then node --test
npm run serve    # http://localhost:8797/ (or: node web/server.mjs <port>)
```

Open `http://localhost:8797/` in a browser. Every action (click/build/connect/upgrade/tick/
prestige/unlockTier/answerCrossing/allocateAttention/sampleProcess/recordPolicy/runPolicy/ablate/
predict/setObjective/resolveGoodhartBranch/spawnChild/writeMargin) is persisted as an intent log in
`localStorage`; reopening the tab replays that log plus one catch-up `tick` intent to the current
time, via the same `advance(state, fromTs, toTs)` offline-progression path every ordinary tick uses.
"Verify replay" recomputes `(seed, intentLog) -> stateHash` from scratch and compares it against the
live session.

## Two state slices, one asymmetric reset

`src/state.mts`'s `ConsciousState` has `widgets` (the production graph and its stocks — Stoke's
`StockState` shape exactly) and `cognition` (the ladder itself: unlocked tiers, banked Insight,
every tier mechanic's own working state). Reflecting (`prestige`, tier 9's own mechanic, kept under
that literal intent-kind name for cartridge compatibility) resets ONLY `widgets`. `cognition` is
never reset — `src/reflect.mts`'s header documents the one deliberate exception (`goodhart`'s
per-run fields, tied to a graph that no longer exists after a reset, are cleared; the `trust`
scalar itself is a reputation, not a graph property, and persists).

Insight is Stoke's own banked-lambda mechanic under a new name; **reflecting needs no tier unlock
at all** — it works identically to Stoke's prestige from the very first tick, because Insight is
the only way to ever afford unlocking tier 2 in the first place.

## The disclosure discipline — every number tagged, never a third provenance

`src/provenance.mts`'s `Tagged<T>` (`computed-from-your-graph` / `designed-flavor`) is reused
unchanged from Stoke. The one new honesty concept this game adds — `taintedBy` on a
`ReflectionRecord` — is deliberately kept structurally apart from `Tagged<T>`: it is a record-level
audit field, not a third provenance for "things the machine itself decided."

## Architecture

- `src/graph.mts`, `src/eigen.mts`, `src/tick.mts` — Stoke's production-graph math, unmodified:
  `ProductionGraph` as data, `dominantEigen` (power iteration), `advance` (offline-progression via
  `(I+M)^n` by binary exponentiation, `STOCK_CLAMP`-safe). `graph.mts::ablate` is the one addition,
  doing double duty as both tier 6's introspection mechanic and the Goodhart audit's own machinery.
- `src/state.mts` — `ConsciousState`, the one plain-JSON value the whole game is a function of.
- `src/tiers.mts`, `src/content.mts` — the ladder as data (ten `TierDefinition`s, Insight costs,
  crossing gates) and the interactive fiction as data (tier prose, crossings, further-reading
  links, the three Goodhart branch epilogues).
- `src/attention.mts`, `src/exploration.mts`, `src/policy.mts`, `src/calibration.mts`,
  `src/values.mts` — tiers 3-5, 7-8's real mechanics: concave marginal yield (diminishing
  returns), seed-fixed hidden yields with honest cumulative regret (exploration-exploitation),
  real minimum-description-length policy compression, a proper Brier scoring rule (theory of
  mind), and a genuinely computed (never curve-fit) two-point Pareto frontier (value alignment).
- `src/goodhart.mts`, `src/reflect.mts` — the tier-6 hinge (two parallel `advance()` simulations,
  real vs. Fast-Inspector-ablated, with a deliberately lagged Trust decay) and reflection itself
  (the reused prestige math, plus the taint-discount honesty audit).
- `src/mentorship.mts` — tier 10: deterministic child-seed derivation from `(seed, reflectionHistory)`,
  length-capped margin notes.
- `src/intents.mts` — the single reducer every mechanic runs through: `applyConsciousIntent`.
- `src/cartridge.mts`, `src/cartridge.manifest.mts` — the `@red-cup-engineering/cartridge` adoption.
- `web/server.mjs` — zero-dependency `node:http` static server: strips `.mts` types for the browser,
  vendors `@red-cup-engineering/cartridge`'s subpaths, serves `GET /api/manifest`.
- `web/js/kernel.mjs` — the browser's one door into the domain engine: a straight re-export of
  `src/*.mts`.
- `web/js/layout.mjs`, `web/js/format.mjs`, `web/js/render-graph.mjs` — pure, unit-tested
  presentation helpers, ported from Stoke's own (no domain assumptions beyond `ProductionGraph`).
- `web/js/app.mjs` — the browser controller: a Tufte-shaped reading-column document (DESIGN.md §5's
  interface verdict — most of this game is reading) with each tier's real mechanic as an inset
  panel, not a separate dashboard. The one impure boundary in this codebase's UI: the only file
  that reads `Date.now()`, turning it into an ordinary `{kind:"tick", toTs}` intent once a second.

## Tests

177 tests, `node --test src/*.test.mts web/test/*.test.mts`. Notable suites beyond ordinary unit
coverage:

- `src/offline-progression.test.mts` — N hours offline via one `advance()` jump equals N hours
  simulated tick-by-tick, and associativity under an arbitrary split, both within a stated 1e-9
  relative tolerance (never claimed bit-exact — `tick.mts`'s own header explains why).
- `src/tick.test.mts` — growth-curve monotonicity: a self-reinvesting graph grows strictly faster
  than a same-baseGeneration graph with no edge, and its own growth curve is convex.
- `src/reflect.test.mts` — the prestige invariants: which state resets, which persists, and the
  Goodhart taint discount, all pinned exactly.
- `src/content.test.mts` — every tier has real prose, every crossing's every option is REACHABLE
  (accepted by the real reducer, not just present in a data file), every Goodhart branch has a
  substantial, distinct epilogue.
- `src/goodhart.test.mts`, `src/intents.test.mts` — the audited identity
  (`WidgetsDisplayed === MaterialConsumed`) holding automatically with no Fast Inspector, and the
  full crisis (build -> gap opens -> repair) running end to end through the real reducer.
- `src/kind-design.test.mts` — the no-dark-patterns proof, expanded to this game's full 18-verb
  intent vocabulary.
- Every tier's pedagogy test is named for the concept it proves — see `DESIGN.md`'s own table and
  each test file's header for the mapping from tier to test to concept.

## Known limitations

- `web/js/app.mjs` has no automated test coverage — there is no headless browser in this
  toolchain; a bug in the DOM-wiring layer itself would surface only by opening the page. Manual
  smoke-tested: server boot, all static routes, `/api/manifest`, kernel re-exports.
- Trust (the client-side replay-verification kind, not the in-fiction Goodhart resource) is
  client-side only — "Verify replay" proves determinism to the player, nothing server-side checks
  it independently.
- Tier 5's policy recorder only scripts a subset of intents (`click`/`build`/`connect`/`upgrade`/
  `tick`/`sampleProcess`/`predict` — `src/intents.mts::POLICY_SCRIPTABLE_KINDS`), deliberately
  excluding continuous, live-allocation intents like `allocateAttention`.
- Fast Inspector's exact tuning (`FAST_INSPECTOR_EDGE_RATE`, `TRUST_LAG_TICKS`,
  `INSIGHT_TAINT_MULTIPLIER`, the trust floor and recovery rate) is playtest-shaped, not
  playtest-verified — DESIGN.md's own open question #2.
