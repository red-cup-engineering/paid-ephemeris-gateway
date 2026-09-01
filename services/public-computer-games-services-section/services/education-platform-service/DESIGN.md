# Design

This service implements two documents nearly verbatim: `self-education-platform-design.md` (the
platform kernel) and `equivo-design.md` (theme #1), both in
`public-web-game-services-section/content/text/documents/articles/notes/`. Read those for the
argued rationale (why the curriculum spine is Candidate C carrying Candidate A's narrative frame
with Candidate B as an internal difficulty axis; why the Lakotaean register is a non-negotiable
structural absence rather than a fallback; why type F/repair has no fair grading rule yet). This
file records the decisions the *build* itself made where the designs left a build choice open.

## Kernel / theme split

`src/` is theme-agnostic: nothing in it imports `@lenticule-science/metrologic` or knows the word "equivo".
`themes/equivo/` is the only place that does. The generalization from Lantern's original
five-module core (frontmatter, FCA, SRS, stability, lightcone-shaped types) is a *declaration*,
not a code move -- `CardKind`'s closed five-value union became `kind: string`, `ReviewCard`
became `CompiledExercise`, everything else kept its logic. Two modules are genuinely new,
because Lantern's `cards.mts` graded by construction (the back of a card is the answer) and
Equivo's exercises grade by running real math:

- `src/checker.mts` -- `Checker<Spec,Answer> = (spec, answer) => {pass, diagnosis}`. Pure,
  synchronous, no I/O, no wall-clock. A theme registers `Record<kind, Checker>`; the platform
  gate runner never hard-codes which kinds exist.
- `src/mastery.mts` -- `recallMastery` (minimum, not mean, R(t) across a room's exercises) gated
  by `roomMastery` (a room-level pass/fail on `recall >= 0.9 AND gated at least once`), with hall
  stability (`stability.mts`'s pebble-game check) kept as an explicit, separate `hallBracing`
  signal the platform doc says must never be conflated with an individual room's mastery.

## Equivo's checker registry

Six kinds (`themes/equivo/registry.mts`), one checker per row of the design's exercise-type
table, every checker calling the real `@lenticule-science/metrologic` pipeline the design's §5 worked examples
were run against:

| kind | real call | what the player supplies |
|---|---|---|
| distinguish (A) | `articulate(utterance)` | the token/claim split, as free text |
| relate (B) | `predicate(articulate(utterance))` | the entity/predicate split, as free text |
| measure (C) | `posit → settle`, reads the settled charge | a `[knowledge, truth]` boolean pair |
| settle (D) | `cohomologyOfRelation(cells)`, `H0.rank === 1` | an equivalent/not-equivalent claim |
| observe (E) | `settling → classify/h1` | a regime (finite/scott/transfinite/aperiodic) + whether H1 vanishes |
| repair (F) | re-run `cohomologyOfRelation` on an edited relation | implemented, tested, **ships in no corpus content** -- see the design's own honesty note in `registry.mts`'s header |

A/B are real checkers here, not the "reuse Lantern's card rules as warm-up" stub the design's MVP
cut allows for, because this kernel doesn't (yet) vendor `cards.mts`'s warm-up rules and wiring
real checkers costs nothing extra to grade correctly.

Distinguish/relate being free-text is a deliberate close-reading design, not an oversight:
`predicate()`'s own source sets `entities = [utterance[0]]`, `predicates = [utterance[1]]` --
the identical split `articulate()` already names `potential`. Both exercise types are really the
same reading-comprehension move (pull the token and the claim out of the prompt's own sentence),
graded by exact structural match against the real function's output, never a hand-authored
answer key.

## Corpus: Unit 1, The Descent

7 rooms (`themes/equivo/corpus/unit-1-the-descent/`), a genuine single hard-door chain
(00-welcome has no exercises, is orientation-only; 01-06 each teach one stage of the
articulate/predicate/posit/settle → observe pipeline and end in one or more
` ```equivo-exercise ``` ` fenced JSON blocks), 30 exercises across five shipped kinds. The
content-validation suite (`themes/equivo/test/content-validate.test.mts`) independently
re-derives every exercise's actual answer straight from `@lenticule-science/metrologic` -- never by asking the
checker what its own answer is -- and asserts the derived-correct answer passes and a
deliberately wrong one fails, for all 30. This is the "wrong content cannot ship" guarantee:
a future corpus edit that produces an ambiguous or malformed spec fails this suite, not a
lesson-author's eyeballs.

## The web face

`web/server.mjs` is a thin `node:http` adapter over `sirv`; `/` real-302-redirects to
`/index.html` (never a same-URL rewrite -- the runbook's own documented sibling bug). Everything
under `web/` is self-contained after `npm run build:web`; the development server never reaches
outside its own root.

The browser needs the kernel/theme `.mts` logic and cannot load `.mts` natively. `web/build/
sync-vendor.mjs` produces `web/js/vendor/**` two ways, both mechanical (not hand-ported, per
house "vendor a copy, not cross-import" doctrine, applied here at the browser boundary):

1. `checker.mts`, `register.mts`, `srs.mts`, `session.mts`, `persistence.mts`, `mastery.mts`, and
   Equivo's registry + four registers, run through Node's own `stripTypeScriptTypes` -- the same
   primitive the server-side `.mts` execution path and `check-mts.mjs` already use. This requires
   Node >=24 (declared in `engines`), where the stripper is a stable public primitive; unlike
   Lantern's original pre-native-stripping `web/js/engine/*.js` hand ports, mechanical stripping
   carries no risk of the vendored copy drifting from its source.
2. `@lenticule-science/metrologic`'s `bilattice` and `obstruction/{settling,cochain}` sources, copied
   byte-identical (already zero-dependency, browser-safe ESM). `index.html`'s own
   `<script type="importmap">` resolves the checker registry's bare `@lenticule-science/metrologic/...`
   specifiers to these vendored files -- no bundler, no CDN, no network origin beyond the page's
   own.

`web/test/vendor-parity.test.mts` proves this mechanical vendoring actually preserves behavior:
it runs all 30 shipped exercises through *both* the real `.mts` registry and the vendored `.js`
copy, using the same independently-derived-from-real-math answers `content-validate.test.mts`
uses, and asserts identical verdicts both directions. `web/test/smoke.test.mts` exercises the
real server over real HTTP (redirect behavior, content types, security headers, path-traversal
refusal, every module the page's import map/app.js references actually serving, POST rejected).

`web/js/state.js` binds the vendored `persistence.js` to `window.localStorage` rather than
hand-porting its logic a second time (unlike Lantern's original `web/js/state.js`, written before
`persistence.mts` existed in a storage-backend-agnostic form) -- `persistence.mts` already takes
its storage boundary as a two-method `StorageAdapter` parameter, and `window.localStorage`
satisfies that shape directly.

Two UX choices the design docs leave to the build, both disclosed in `web/js/app.js`'s own header:
a room's first pass ("gate") is a learning pass with free retries and no SRS write until the
player passes (matching the platform's no-list: no energy/lives gate); a later review pass is a
single-shot honest recall check (a wrong answer records grade 1/Again and moves on, the standard
Anki/FSRS distinction between learning and reviewing a card) -- both passes call the exact same
real checkers, only the retry policy differs.

## What's NOT in this build

- `weiqi-Learn` ("wing one" -- Lantern's own corpus, renamed per the platform doc's placement
  plan) is not ported here. This service is Equivo-only; porting Lantern's wing is a separate,
  later step the platform doc names but this task did not ask for.
- Server accounts/sync, and any ZBD/earn-only wiring for Equivo specifically -- `zbd-
  micropayment-rails.md`'s adoption map does not include Equivo, and neither design doc specifies
  what "earn-only" would mean for a course rather than a game. `src/earn.mts` stubs the adapter
  interface only.
- Deploy: not yet run. See ROADMAP.md.
