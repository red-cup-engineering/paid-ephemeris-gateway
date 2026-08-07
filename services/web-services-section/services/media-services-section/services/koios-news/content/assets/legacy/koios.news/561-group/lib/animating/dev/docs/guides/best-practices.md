# @emsenn/animating - best practices

A how-to for consuming `@emsenn/animating` well.
The package is one descent of module subpaths over the `@emsenn/relating` charge substrate; consume it through the named subpaths, keep I/O at your edge, and let the bilattice do the settling.

## Import the named subpaths, not deep dist paths

Import from the published subpaths declared in `exports`.
Never reach into `dist/`, `.mjs` files by path, or any internal module - those are not part of the contract and will move.

```ts
// good
import { articulating, settledCharge } from "@emsenn/animating/algebra";
import { fiber, provisions } from "@emsenn/animating/doing/algebra";
import { workItem } from "@emsenn/animating/doing/working/algebra";
import { residuate, admitTool, office } from "@emsenn/animating/doing/governing/algebra";
import { sheafCharges, opposed } from "@emsenn/animating/fleet/topology";
import { decide, type Proposal } from "@emsenn/animating/decision";

// bad - not part of the contract, will break
import { fiber } from "@emsenn/animating/dist/doing/algebra/capability.mjs";
```

The root `@emsenn/animating` is not a namespace barrel.
It is the universal admission surface: `admit(action, token, claim?)
`.
Use it when your boundary has a requested action, a provision-bearing token, and an optional requirement claim.

```ts
import { admit, fiber, fiberCoordinate } from "@emsenn/animating";
import { mark, token } from "@emsenn/relating";

const build = fiberCoordinate(token(mark(["capability", "build"] as const)));
const prod = fiberCoordinate(token(mark(["authority", "prod"] as const)));

const reading = admit(
  "deploy",
  { capabilities: fiber([build]), authorities: fiber([prod]) },
  { capabilities: fiber([build]), authorities: fiber([prod]) },
);
```

Reach every richer object, subcategory, or representation boundary by its explicit subpath.

## Which subpath to reach for

- The individual agent (identity, predication, handedness, prose->observations): `@emsenn/animating/algebra`.
- Task, observation, descent, and generic provision fibers: `@emsenn/animating/doing/algebra`.
- Measuring change between two settled states: `@emsenn/animating/analysis` (`transition`).
- Dreaming as the generative topology over descent: `@emsenn/animating/doing/learning/dreaming`.
- Settling agents into a graph: `@emsenn/animating/topology`.
- Working carriers: `@emsenn/animating/doing/working/algebra`.
- Offices, dispatch, and governance: `@emsenn/animating/doing/governing/algebra`.
- Settling a collective's many charges into consensus / opposition cohomology: `@emsenn/animating/fleet/topology`.
- Articulated traces and the accretive utterance log, contained by topology: `@emsenn/animating/topology/trace`.
- Budgeted decision-as-morphism: `@emsenn/animating/decision`.
- Cross-observer federation over assertion worlds: `@emsenn/animating/federation`.

## I/O as values: hand it in, do not let it reach out

The library modules are pure.
They do no I/O they were not handed.
There is no `fetch`, no clock, no `fs` reach inside the algebra, topology, trace, decision, federation, or script-morphism modules.
The package binaries (`animating-admit`, `animating-govern`, `animating-dispatch`, `animating-consensus`) are process bindings for `@emsenn/animating/scripts`: they read one complete EAVT JSONL carrier from stdin and emit a complete EAVT JSONL carrier on stdout.

Follow the same discipline as a consumer:

- Communication enters through `@emsenn/communicating` first.
  Animating receives admitted communicating carriers and transports them into doing observations; it does not parse prose itself.

- Files and network are yours to read.
  Read the file, fetch the payload, parse it, then hand the parsed value to the library function.
  The library settles charges from the world you induce; it never goes and gets one.
  Charges are measured from an induced world, never seeded - an unobserved subject reads `absurd`, not a denial.

## sideEffects: false and tree-shaking

`package.json` declares `"sideEffects": false`.
Every module is pure: importing a symbol pulls in nothing else, and bundlers may drop any export you do not use.

To get the benefit, import only the symbols you need from the narrowest subpath:

```ts
import { decide } from "@emsenn/animating/decision";   // tree-shakeable
```

For rich internals, prefer named subpath imports in code you bundle.
The root surface intentionally stays small enough to import directly.

## Subpaths and the semver promise

This package is `private` and at version `0.0.0` - treat the whole surface as pre-1.0 and expect movement.
Within that:

- Swarm-orchestration material is not public here until it has a real carrier/morphism surface.
  Do not add reserved empty subpaths.
- Provider-specific topology is not in this package; import it from the relevant downstream provider package.
- Anything not named in `exports` (the raw `dist/` tree, per-file `.mjs` internals) carries no promise at all.
  Importing it implies you accept it breaking on any change.

## Tests are package checks

CONTRACTS ARE NOT TESTS.

Tests must follow modern testing best practices: they are modularized, use reproducible fixtures, and exercise observable behavior through public or intentionally local APIs.
They are not written to mirror the implementation, validate every temporary carrier label, or prove that a recent edit happened.

To be very clear, tests should never be written to prove that the work you have just done was done: they should always be written as real tests for real packages.
During active refactors, keep the test suite small and durable:

- package import tests for declared public subpaths and binary targets;
- fixture-backed behavior tests for active public functions;
- regression tests for bugs that can recur.

The suite builds first (`pnpm test` runs the build, then the type-checked test compile, then `node --test`), so runtime tests run against emitted artifacts.

## Common pitfalls

- Reading `absurd` as `false`.
  `absurd` is no evidence (the knowledge bottom); `active` is a denial.
  An unrecognized federation source reads `absurd` - never an `active` denial.
  Test for the value name you mean.

- Expecting contradictions to be resolved.
  The knowledge join keeps contradictions: two opposing observations settle to `stable` (top), surfaced for you to handle, not silently collapsed to one side.

- Trying to re-seed or re-admit a charge.
  There is no verb that re-admits a charge, polarity, or denial.
  Found a world by explicit induction and measure from it.

- Treating fleet as an upstream provider.
  Fleet is downstream of governing: reach for `doing/governing/algebra` for dispatch, offices, and governance gating; reach for `fleet/topology` when you need consensus or the opposition obstruction (H1 of the observer graph).

- Looking for the generic provision fiber in the fleet.
  `fiber`/`provisions` live in `@emsenn/animating/doing/algebra`; governing consumes them, and fleet remains downstream.
  The descent cycle still lives in `@emsenn/animating/algebra`, folded in because any thinking agent wants it.

- Looking for the LLM sub-domain here.
  It moved out to `@emsenn/llm`.
  This package is the animating domain; provider packages cover concrete models and harnesses as relating topology carriers, not LLM transport.

- Treating package-bin output as an ad hoc decision summary.
  The scripts preserve the EAVT carrier and append derived facts; downstream scripts read those facts as carrier data.
