# @emsenn/gaming

Gaming is **scale-2 playing** — concurrent game systems (CGS) with symmetry.
Where `@emsenn/playing` gives the single-agent ludics cut/interact core, gaming lifts it to the **multi-agent** level: an arena with a symmetry group `FSym(𝔸)` (the finite permutations of names), strategies equivariant under that symmetry, and genuine multi-player interaction (not just a Proponent/Opponent pair).

A game in gaming is a configuration of animating handedness over the `@emsenn/relating` substrate.
It imports `@emsenn/playing/ludics` as the single-agent foundation and adds the social/multi-agent layer above it.

## Carrier Boundary

Gaming publishes carrier identities through action `domainSchema`/`codomainSchema` metadata and the JSON schema assets under `src/carriers/`.
The checked-in `*.schema.types.mts` files are legacy type surfaces consumed by a few internal modules; normal `check` and `build` are read-only and do not regenerate source files.

## The primary carriers

- **Arena** — a concurrent game system: a polarized event structure with symmetry (`FSym(𝔸)`-equivariant) carrying the ⊗/⊕ duality of plays
- **Strategy** — an `FSym(𝔸)`-equivariant subset of plays: closed under symmetry via `closeUnderSymmetry`
- **Design** (from `@emsenn/playing/ludics`) — the single-agent proof-forest the strategy is lifted from

## The morphism surface (25 verbs)

| verb | what it does |
|---|---|
| `arena` | construct an arena from a polarized event structure |
| `strategy` | declare a strategy: a symmetry-closed set of plays |
| `equivariant` | test whether a play-set is FSym(𝔸)-equivariant |
| `sides` | declare the mask's sides (Proponent / Opponent polarity) |
| `mask` | instantiate a participant's mask (its I/O face / morphism shape in the arena) |
| `game` | start a game: an arena × mask configuration |
| `play` | advance the game by one move |
| `interact` | the full play-through: both sides alternate until closure |
| `settle` | settle the game to a verdict (knowledge-join at shared loci) |
| `match` | assert strategy equivariance: composed play = strategy |
| `parallel` | the tensor product ‖: superpose two arenas |
| `lift` | lift a single-agent Design to a strategy via strategyFromDesign |
| `compose` | the HO cut ‖ + interface hiding: compose two strategies |
| `symmetry` | close a play-set under the FSym(𝔸) symmetry group |
| `analyze` | analyse an arena for its closure regime and proof structure |
| `read-strategy` | read the strategic pattern from a game record |
| `read-regime` | classify the arena's regime (strict/scott/transfinite/aperiodic) |
| `read-flow` | read causal flow from the game chronicle |
| `read-deep-play` | read deep-play patterns (Geertz reading) |
| `read-rhetorics` | read rhetorical moves from the game |
| `read-lusory` | classify the lusory attitude: play-as-rule-following |
| `embed-dialectica` | embed a Dialectica pair as an arena (duality-preserving) |
| `embed-nominal` | embed a nominal FSym(𝔸)-symmetric arena |
| `embed-session` | embed a CLL session type as an arena |
| `embed-culture` | embed a cultural/anthropological play-setting |

## Usage

```ts
import { arenaAction, strategyAction, interactAction } from "@emsenn/gaming";
import { designAction } from "@emsenn/playing/ludics";

// Build an arena from playing's ludics
const d = designAction.run({ entries: [{ locus: [], charge: "potential" }] }, {});
const strategy = liftAction.run({ design: d }, {});
```

## Subpaths

```ts
import { ... } from "@emsenn/gaming";     // full surface (imports @emsenn/playing/ludics)
```

## RelMath Realization

Gaming can now distinguish sequential pressure from independent branches with `analysis.causal.orderingFraction` over game histories, and can use `probability.markovStationaryIsClosureFixpoint` to mark stable repeated-play loops.
The strongest concrete follow-up is to enrich `read-flow` and `read-deep-play` with causal ordering fractions and stochastic fixed-point receipts.
