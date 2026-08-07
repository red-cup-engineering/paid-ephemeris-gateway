# @emsenn/computing

Computing is the **effective topos Eff = Kl(!)** — the Cartesian-closed category of computable functions, and the **multi-agent (scale-2 / off-diagonal) reading of knowing**.

Where `@emsenn/knowing` is the comonad on one agent's memes (the knowledge order ≤_k, diagonal), computing lifts that comonad to work over full **agents** (from `@emsenn/animating`).
It is multi-agent because animating supplies a complete perceive→act loop to compute over; the lift comes from animating, NOT from the sibling off-diagonal faculties (computing imports none of socializing, gaming, organizing).

The settled-truth structure is **FOUR** (verified / refuted / undecidable / contradictory — the image of Ω_Eff under ¬¬, with ⊥ forced by Rice's theorem): `compute(agent) → FOUR`.

## Dependencies

`@emsenn/relating`, `@emsenn/communicating`, `@emsenn/knowing`, `@emsenn/playing`, `@emsenn/animating`.
Each dependency contributes one piece:

- `relating` — the substrate (carrier, action, EAVT witness)
- `communicating` — the meme transport a program is
- `knowing` — the comonad (≤_k) the Kleisli category is carved from
- `playing` — the *-autonomous CGS (multi-meme) and the `!
  ` exponential
- `animating` — the full agent a running program instantiates

## The morphism surface (24 verbs)

| verb | what it does |
|---|---|
| `compute` | run a program (a Kleisli morphism !A⊸B) on an agent; settle to FOUR |
| `compose` | Kleisli composition: relay the output of one program as input to another |
| `relay` | run a program over a society of agents (the off-diagonal lift) |
| `bang` | the `!` promotion: replicate a resource (the Kleisli comonad unit) |
| `decide` | settle a boolean test over an agent's world-model to FOUR |
| `decide-capabilities` | enumerate the capabilities an agent can exercise |
| `classify-work` | classify a unit of work into the relating four-stage descent |
| `reconstruct-from-hashes` | recover a settled build result from boundary hashes when the build-cover obstruction rank is zero |
| `diff-from-boundary-hashes` | reconstruct two settled build results from boundary hashes and report their shared/added/removed causal coordinates |
| `fold-trace` | fold build/DAP/LSP/action trace tiles into one content-addressed normal-form tiling |
| `derive-provenance` | lift a result through articulating/predicating/positing/settling and fold those stages as trace tiles |
| `project-observation-game` | realize a computing observation arena as a gaming CGS arena/play/strategy report |
| `coordinate-holographic-compute` | fuse build, trace, provenance, game, and society readings into one obstruction spectrum |
| `ecosystem-infotiling` | fold a JS/Node-style workspace package dependency graph into one content-addressed InfoTiling |
| `regulate-ecosystem-causal-width` | plan Ashby/Petri regulation actions for ecosystem causal-width pressure |
| `stabilize-ecosystem-causal-width` | apply immediate regulation actions into a quotient control view and recompute residual Petri pressure |
| `ecosystem-recursive-control` | read stabilized high-pressure quotient places as recursive viable control units with boundary ports |
| `ecosystem-recursive-unit` | open one recursive control unit into raw package hashes, internal transitions, boundary ports, and its reconstruction witness |
| `reconstruct-ecosystem-cone` | recover a package or SCC supertile causal cone from ecosystem boundary hashes |
| `diff-ecosystem-cones` | reconstruct and diff two raw or condensed ecosystem cones from boundary hashes |
| `aperiodic-patch` | check semantic Wang-style local matching over content-addressed boundary incidences, then emit diffraction, contextuality, automaton, and substitution readings |
| `aperiodic-self-organize` | rewrite a defective patch by deterministic Markov/Tsetlin local synchronization until a matching fixed point or step bound |
| `aperiodic-theory-atlas` | activate global historical theory lenses over a patch from measured local matching, diffraction, contextuality, cybernetic, and automata evidence |
| `aperiodic-bridge-plan` | turn potential theory lenses into concrete bridge obligations across repair, trace, reconstruction, diff, coordination, and concurrency verbs |

`eventual-consistency` now also carries a stochastic convergence receipt from `@emsenn/relating`: Markov stationarity is normalized through the root `probability` RMN catalog as a stochastic-closure fixed point.
This turns the package's former bare `converges: true` reading into an inspectable finite RelMath witness (`stochastic.fixedPoint`, `stochastic.equivalent`, `stochastic.regime`, and `stochastic.stationaryExists`).

## The carriers

Computing's carrier boundary is checked in with the package source.
The `*.schema.types.mts` files are ordinary TypeScript surfaces now; normal `check`/`build` does not regenerate them.
Update the carrier type surface in the same change as the schema or move the carrier onto the shared TypeBox/RMN idiom when that slice is rederived.

- `computing/computation` — a running program instance over an agent
- `computing/four` — FOUR: `verified`, `refuted`, `undecidable`, `contradictory`
- `computing/work-closure` and `computing/work-type` — executable task closure and its process/procedure/derivation/inquiry reading
- `computing/capability-request` and `computing/capability-decision`
- `computing/decision-request` and `computing/decision-run`
- `computing/build-derivation`, `computing/settled-build-term`, `computing/light-observation`, `computing/build-reconstruction`, and `computing/build-diff` — Nix-as-settling: derivations as content-addressed tiles, with store hashes as `$id` coordinates and finite boundary reconstruction/diff witnesses
- `computing/trace-event-input`, `computing/trace-tile`, `computing/trace-fold-request`, and `computing/trace-tiling` — trace holography: Merkle-addressed tiles folded by a finite Markov-normal rewrite, with Kolmogorov description-length and Kolmogorov-Uspensky graph-machine readings kept as explicit finite shadows
- `computing/derivation-provenance-input`, `computing/derivation-stage`, and `computing/derivation-provenance-receipt` — the four-stage provenance spine beneath computing results: articulating -> predicating -> positing -> settling, with each stage content-addressed and trace-folded
- `computing/observation-game-request` and `computing/observation-game-projection` — the gaming bridge: computing observations realized through @emsenn/gaming's arena/play/strategy constructors, with charge-as-polarity and moves-as-causality
- `computing/coordination-spectrum-request` and `computing/coordination-spectrum` — the fused holographic compute reading: causal-cover, trace-cover, provenance, game-strategy, and coordination obstructions counted as one content-addressed spectrum
- `computing/ecosystem-package`, `computing/ecosystem-graph`, `computing/ecosystem-infotiling`, `computing/ecosystem-cone-reconstruction`, and `computing/ecosystem-cone-diff` — workspace/ecosystem holography: package facts are settled as content-addressed tiles, dependency edges become causal order, and the ecosystem folds into one trace normal form; nonzero `h1` carries constructive obstruction data (`buildTiers`, `residualHashes`, and `cycleObstructions`) plus a Petri-style non-sequential process reading (`petri.places`, `petri.transitions`, `petri.frontiers`, `petri.concurrencyWidth`, `petri.bottlenecks`, and `petri.pressure`) and a strongly-connected-component condensation (`condensedTiles`, `condensedEdges`, `condensedLight`) whose quotient graph is again causal, and individual package or supertile cones are recoverable and diffable from boundary hashes
- `computing/ecosystem-causal-regulation-request` and `computing/ecosystem-causal-regulation` - Ashby/Petri causal-width regulation over an ecosystem tiling: Petri bottlenecks and cycle obstructions are disturbances; cone audits, contract publication, boundary extraction, and SCC condensation are regulator actions; requisite variety is reported before any width-reduction claim.
- `computing/ecosystem-causal-stabilization-request` and `computing/ecosystem-causal-stabilization` - stabilized control view for immediate regulation: accepted substrate places are removed from the controllable Petri graph, cycle obstructions become SCC supertiles, and residual controllable width/pressure are recomputed without pretending later actions already happened.
- `computing/ecosystem-recursive-control-request` and `computing/ecosystem-recursive-control` - recursive control over stabilized quotient pressure: high-degree places become systems-in-focus with explicit boundary ports and next operators, combining Beer viable-system recursion, Ashby local variety, Ibn Khaldun cohesion, and Kautilya-style neighbor classification.
- `computing/ecosystem-recursive-unit-request` and `computing/ecosystem-recursive-unit` - recursive-unit opening: a selected system-in-focus expands from the quotient view back into raw package hashes, internal dependency transitions, boundary edges, a local Petri pressure reading, and the cone reconstruction witness for its next operator.
  This bridges Beer recursion to Kolmogorov-Uspensky local graph neighborhoods, Markov normal rewrites, and Tsetlin-style boundary actuators.
- `computing/aperiodic-tile`, `computing/aperiodic-patch-request`, and `computing/aperiodic-patch` — executable aperiodic-theory surface: content hashes induce Wang-style colored boundaries, semantic incidences supply complementary dependency colors, local matching defects become a finite sheaf-section obstruction, finite diffraction summarizes the patch spectrum, a Tsetlin-style reward/penalty automaton reads local fit, and a deterministic 2x Robinson-style substitution patch carries the next scale.
  Built+green as an executable reading; Research-grade as a claim about aperiodic order.
- `computing/aperiodic-self-organization-request` and `computing/aperiodic-self-organization` - local adaptation over an aperiodic patch: ordered defect rewrites synchronize one boundary neighborhood at a time, reread the patch after each rewrite, and stop at a reward fixed point or step bound.
  This is the Markov normal-algorithm / Tsetlin automaton operator, not merely the observation.
- `computing/aperiodic-theory-atlas-request` and `computing/aperiodic-theory-atlas` - a global historical theory atlas over a patch: Wang local matching, Robinson substitution, de Bruijn multigrids, mathematical diffraction, sheaf contextuality, Ashby requisite variety, Petri concurrency, Markov normal algorithms, Kolmogorov-Uspensky graph machines, and Tsetlin learning automata are activated from finite measurements and maturity-tagged.
- `computing/aperiodic-bridge-plan-request` and `computing/aperiodic-bridge-plan` - a capability bridge planner over the potential atlas: each measured theory lens maps to a concrete computing verb and operator obligation, with priority, preconditions, expected effect, and maturity.

## Usage

```ts
import { computeAction, composeAction, relayAction } from "@emsenn/computing";

// compute — run a program on an agent and settle to FOUR
const verdict = computeAction.run({ agent, program }, {});

// compose — Kleisli relay of two programs
const composed = composeAction.run({ producer: prog1, consumer: prog2 }, {});
```

## Subpaths

```ts
import { ... } from "@emsenn/computing";    // full computing surface
```
