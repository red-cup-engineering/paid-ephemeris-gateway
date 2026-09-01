# Kelly's Wager — design notes

This file is the target of `DESIGN.md` citations scattered through `src/*.mts` and `web/index.html`
(`types.mts`'s HARD ECONOMY LINE note, `wagers.mts`'s disclosure section, `kelly.mts`/`cartridge.mts`'s
vendoring notes, `paths.mts`'s honest-weaknesses note). It did not exist before — the citations were
dangling — and this file's sections are named to match exactly what each citation says it points at,
so the reference is true going forward.

## HARD ECONOMY LINE

Earn-only, no real wagering, ever. `BankrollState.balance` is a practice-only number that starts
at `STARTING_BALANCE` (1000) each run and is never backed by, converted to, or convertible from
any real-money or real-crypto instrument. There is no `energy` field anywhere in this service, no
import of `@561-group/energy-bank`, and no payment provider of any kind. This is a teaching game:
the mechanic being taught is Kelly sizing under real uncertainty, using numbers that behave exactly
like real odds/probabilities would, against a bankroll that can never leave the practice sandbox.
`engine.test.mts` and `manifest.test.mts` both carry structural (grep-level, not aspirational)
checks that this stays true.

## The disclosure section — three-way spend typing

Per `wilder-conceptions-01.md` item 7 ("Terminal Bets") and the ringleader's adoption of it as a
design directive for the gambling series: every action a player can take is typed on screen as
exactly one of three things, computed by `src/disclosure.mts#classify` and never re-derived
independently by any UI file.

| Intent          | Type               | Rationale |
|------------------|--------------------|-----------|
| `adjust-stake`     | freely reversible  | Sizing a stake touches nothing but a UI-local pending value; `BankrollState.balance` is untouched until commit. |
| `reroll-offer`      | **priced**          | Skipping a wager you don't like moves you to the next offer in the seeded sequence, but at a real, named, disclosed cost: 2% of current balance (`REROLL_FEE_FRACTION`). This is the one deliberately-priced middle case — a real cost, small and always shown as an exact coin amount before you pay it, unlike a predatory catalog's hidden odds or grind gates. It is not free, and the UI never implies it is. |
| `commit-stake`       | **terminal**         | The one place risk becomes real for this run. `ruinDisclosure` is always computable and always shown before this button could do anything, stating both the plain loss probability and, separately, the probability this exact stake causes ruin. |
| `new-run`             | freely reversible  | Starts a fresh run from a new seed generation (`runNumber + 1`). Costs nothing; the old run's `resolutions` are simply not carried forward. |

**Why reroll is priced, not free, on purpose.** An earlier draft of this design considered making
"decline this offer" costless, on the theory that a trap you can always dodge for free is more
honest. The chart-of-accounts exercise (working the mechanic through the freely-reversible/priced/
terminal typing by hand before writing any UI) found that a *free*, unlimited "skip" actually
teaches the wrong lesson: it lets a player avoid ever pricing a wager at all, never exercising the
"read probability minus cost, not the pitch" skill the game exists to build. A small, honestly
disclosed price for skipping keeps declining a bad wager cheap and clearly survivable — see the
README's measured numbers (Kelly-optimal play, rerolling every negative-edge trap, is never ruined
by reroll fees alone; they average 3.8% of the starting bankroll over a day) — without making
"never engage with the math" a zero-cost strategy.

## Vendoring notes

Two different house rules apply to two different dependencies here, for two different reasons,
and this section is what `kelly.mts`'s and `cartridge.mts`'s headers point at:

- **`src/kelly.mts` / `src/odds.mts` are vendored (copied, not imported).** The real
  Kelly/odds math lives in `gambling-services-section/src/kelly.mjs` / `odds.mjs`, published to
  Verdaccio as `@lenticule-science/gambling-services-section`. This service's dependencies are
  restricted to pinned `@561-group/*` packages, and — independent of that — the source package's
  own `exports` map doesn't expose `./kelly` or `./odds` as importable subpaths today. Both facts
  point at the same answer: vendor the specific pure functions in, document the source, and keep a
  vendor-parity test running the same fixture cases as the source's own tests, so a future drift
  between the two copies fails CI here rather than silently.
- **`@561-group/cartridge` is a real, live `npm install` dependency.** It is in-scope for the
  pinned-`@561-group/*`-only rule, and its subpaths (`./manifest`, `./replay`, `./seed`,
  `./intent-log`) are genuinely exported and meant to be imported directly — there is no reason to
  hand-copy a manifest schema or a replay harness this game did not write and should not maintain
  a second copy of. `src/cartridge.mts` wraps `engine.mts`'s already-pure functions into the
  `Cartridge<>` contract; it does not reimplement anything from `engine.mts`, `wagers.mts`, or
  `disclosure.mts`.

## Honest weaknesses

Things this build gets right on purpose, stated instead of quietly worked around:

- **Ruin probability is single-step, not multi-step.** `computeRuinProbability` asks: if this
  proposed stake resolves as a loss, does the balance fall under `RUIN_THRESHOLD`? It is *not* a
  full gambler's-ruin random-walk probability over the rest of the day's remaining offers, because
  that would require assuming a future staking policy the player hasn't chosen yet. Overstating
  precision here would be worse than the honest, narrower claim the UI actually makes.
- **The Kelly counterfactual line plays full, unfractional Kelly** — the theoretically optimal
  policy for long-run growth, and also the highest-variance one. Over a single 6–10 wager day, this
  means the `kelly` path in the four-path chart is not guaranteed to finish above `flat`; simulated
  across 500 seeded `'novice'` days it does so about 62% of the time (73% on the 10-wager `'sharp'`
  track), and is never itself ruined. The run-summary panel says this in plain language rather than
  let a single day's chart imply Kelly always wins visibly.
- **`yours` can be shorter than the other three paths.** Since it is built strictly from
  `state.resolutions` (real commits only), rerolling an offer or ending the run early (ruin, or
  simply not finishing yet) leaves `yours` short of the fixed x-axis every other path always
  reaches. This is documented, not a rendering bug.
- **No in-browser config picker yet.** `web/index.html` always plays the `'novice'` track. The
  `'sharp'` track is fully implemented, tested, and reachable via `createEngine(seed, 'sharp')`
  directly — adding a UI selector for it is real, cheap follow-up work, not done here.
